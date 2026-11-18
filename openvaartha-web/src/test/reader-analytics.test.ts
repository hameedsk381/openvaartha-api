import { afterEach, expect, it, vi } from "vitest";

const ga = vi.hoisted(() => ({ initialize: vi.fn(), gtag: vi.fn() }));
vi.mock("react-ga4", () => ({ default: ga }));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("records each milestone once using the original landing page", async () => {
  vi.stubEnv("VITE_GA_TRACKING_ID", "G-TEST");
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.useFakeTimers();
  const started = new Date("2026-01-01T12:00:00Z").getTime();
  vi.setSystemTime(started);
  window.history.replaceState({}, "", "/article/one?utm_medium=email");

  const { trackPage, trackStory, trackNewsletterSignup } = await import("../lib/reader-analytics");
  trackPage("/article/one");
  trackPage("/article/one");
  trackStory("one");
  trackStory("one");
  trackPage("/article/two");
  trackStory("two");
  trackNewsletterSignup();
  trackNewsletterSignup();
  vi.setSystemTime(started + 60 * 60 * 1000);
  trackPage("/trending");
  trackPage("/");

  expect(ga.initialize).toHaveBeenCalledWith("G-TEST", { gtagOptions: { send_page_view: false } });
  expect(ga.gtag.mock.calls.map(([, event]) => event)).toEqual([
    "page_view", "reader_first_story", "page_view", "reader_second_story",
    "reader_newsletter_signup", "page_view", "reader_return_7d", "page_view",
  ]);
  expect(ga.gtag).toHaveBeenCalledWith("event", "reader_return_7d", {
    journey_landing: "/article/one",
    journey_channel: "email",
  });
  window.history.replaceState({}, "", "/");
});
