import { toast } from "sonner";

export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : "/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

export function getStoredToken(): string | null {
  return localStorage.getItem("token");
}

function setTokens(access: string, _refresh?: string): void {
  localStorage.setItem("token", access);
  // refresh_token is now handled via HttpOnly cookie by the backend
}

export function clearTokens(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user_contributor_status");
}

let isRefreshing = false;
let pendingRequests: {resolve: (token: string | null) => void, reject: (err: unknown) => void}[] = [];

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/users/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // The cookie is sent automatically
      credentials: "include", // Send HttpOnly cookie
    });

    if (!res.ok) {
      clearTokens();
      window.dispatchEvent(new Event("auth:logout"));
      return null;
    }

    const data = await res.json();
    setTokens(data.access_token);
    return data.access_token;
  } catch (err) {
    clearTokens();
    window.dispatchEvent(new Event("auth:logout"));
    throw err;
  }
}

function resolvePending(token: string | null): void {
  for (const p of pendingRequests) {
    p.resolve(token);
  }
  pendingRequests = [];
}

function rejectPending(err: unknown): void {
  for (const p of pendingRequests) {
    p.reject(err);
  }
  pendingRequests = [];
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (!(options?.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await doRefresh();
        resolvePending(newToken);
        isRefreshing = false;

        if (newToken) {
          headers["Authorization"] = `Bearer ${newToken}`;
          res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
          });
        }
      } catch (err) {
        rejectPending(err);
        isRefreshing = false;
        throw err;
      }
    } else {
      const newToken = await new Promise<string | null>((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      });
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
        });
      }
    }
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.detail) detail = body.detail;
    } catch {
      // response body not JSON
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json();
  if (body && typeof body === "object" && "value" in body && "Count" in body) {
    return body.value as T;
  }
  return body as T;
}
