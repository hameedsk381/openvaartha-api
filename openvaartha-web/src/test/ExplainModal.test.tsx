import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ExplainModal from "../components/ExplainModal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, apiFetch: vi.fn() };
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe("ExplainModal Component", () => {
  it("renders modal title when open is true", () => {
    vi.mocked(apiFetch).mockResolvedValue({ explanation: "Sample response", source: "ai" });
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ExplainModal open={true} onOpenChange={vi.fn()} articleId="test-123" />
      </QueryClientProvider>
    );

    expect(screen.getByText("Explain it to me")).toBeDefined();
  });

  it("labels the article summary when AI is unavailable", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ explanation: "The original summary.", source: "article_summary" });
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ExplainModal open onOpenChange={vi.fn()} articleId="test-456" />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("From the article")).toBeInTheDocument();
    expect(screen.getByText("The original summary.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});
