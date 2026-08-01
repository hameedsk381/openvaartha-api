import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ExplainModal from "../components/ExplainModal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ExplainModal open={true} onOpenChange={vi.fn()} articleId="test-123" />
      </QueryClientProvider>
    );

    expect(screen.getByText("Explain it to me")).toBeDefined();
  });
});
