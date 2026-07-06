import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { migrateGuestReadingList, READING_LIST_KEY } from "@/hooks/use-reading-list";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => existing.addEventListener("load", () => resolve(), { once: true }));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(script);
  });
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

/**
 * Renders Google's own "Sign in with Google" button. Google signs the
 * credential client-side and hands us back a JWT (the "ID token") — we never
 * see a client secret, and the backend independently verifies that JWT's
 * signature and audience before trusting any of its claims.
 */
export default function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ google_client_id: string | null }>("/users/auth-config")
      .then((config) => {
        if (cancelled) return;
        if (config?.google_client_id) {
          setClientId(config.google_client_id);
        } else {
          setClientId(null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setClientId(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || !clientId) return;

    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            try {
              const tokens = await apiFetch<GoogleTokenResponse>("/users/google", {
                method: "POST",
                body: JSON.stringify({ idToken: response.credential }),
              });
              localStorage.setItem("token", tokens.access_token);
              localStorage.setItem("refresh_token", tokens.refresh_token);
              try {
                const me = await apiFetch<{ email: string; role: string; contributorStatus?: string }>("/users/me");
                localStorage.setItem("user_email", me.email);
                localStorage.setItem("user_role", me.role);
                if (me.contributorStatus) localStorage.setItem("user_contributor_status", me.contributorStatus);
              } catch {
                // Non-fatal — the tokens are already stored and valid.
              }
              await migrateGuestReadingList().catch(() => {});
              queryClient.invalidateQueries({ queryKey: READING_LIST_KEY });
              onSuccess();
            } catch {
              onError("Couldn't sign in with Google. Please try again.");
            }
          },
        });

        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 360,
          text: "continue_with",
          shape: "rectangular",
        });
      })
      .catch(() => {
        // Fail silently
      });

    return () => {
      cancelled = true;
    };
  }, [loading, clientId, onSuccess, onError, queryClient]);

  if (loading || !clientId) return null;

  return <div ref={containerRef} className="flex justify-center [&>div]:!w-full" />;
}
