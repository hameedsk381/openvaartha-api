import ReactGA from "react-ga4";

const productionHosts = ["openvaartha.com", "www.openvaartha.com"];
const trackingId = import.meta.env.VITE_GA_TRACKING_ID
  || (import.meta.env.PROD && productionHosts.includes(window.location.hostname) ? "G-0YRPK9FS98" : "");
const storageKey = "ov-reader-journey-v1";
const thirtyMinutes = 30 * 60 * 1000;
const sevenDays = 7 * 24 * 60 * 60 * 1000;
let lastPage = "";

type Journey = {
  started: number;
  lastSeen: number;
  firstStory?: string;
  secondStory?: boolean;
  subscribed?: boolean;
  returned?: boolean;
  landing: string;
  channel: string;
};

if (trackingId) ReactGA.initialize(trackingId, { gtagOptions: { send_page_view: false } });

function acquisitionChannel() {
  const medium = new URLSearchParams(window.location.search).get("utm_medium")?.toLowerCase();
  if (medium && ["email", "organic", "social", "referral", "cpc"].includes(medium)) return medium;
  if (!document.referrer) return "direct";
  const host = new URL(document.referrer).hostname;
  if (host === window.location.hostname) return "direct";
  if (/^(www\.)?(google\.[a-z.]+|bing\.com|search\.yahoo\.com|duckduckgo\.com)$/.test(host)) return "organic";
  return "referral";
}

function updateJourney(update: (journey: Journey, now: number) => void) {
  if (!trackingId) return;
  try {
    const now = Date.now();
    const stored = localStorage.getItem(storageKey);
    const journey: Journey = stored ? JSON.parse(stored) : {
      started: now, lastSeen: now, landing: window.location.pathname, channel: acquisitionChannel(),
    };
    update(journey, now);
    journey.lastSeen = now;
    localStorage.setItem(storageKey, JSON.stringify(journey));
  } catch {
    // Storage may be unavailable in private browsing or restricted embeds.
  }
}

function milestone(name: string, journey: Journey) {
  ReactGA.gtag("event", name, {
    journey_landing: journey.landing,
    journey_channel: journey.channel,
  });
}

export function trackPage(path: string) {
  if (!trackingId || path === lastPage) return;
  lastPage = path;
  if (path.startsWith("/admin") || path.startsWith("/reset-password")) return;
  ReactGA.gtag("event", "page_view", {
    page_path: path,
    page_location: new URL(path, window.location.origin).href,
  });
  updateJourney((journey, now) => {
    if (journey.firstStory && !journey.returned && now - journey.lastSeen >= thirtyMinutes
      && now - journey.started <= sevenDays) {
      journey.returned = true;
      milestone("reader_return_7d", journey);
    }
  });
}

export function trackStory(slug: string) {
  updateJourney((journey, now) => {
    if (!journey.firstStory) {
      journey.firstStory = slug;
      journey.started = now;
      milestone("reader_first_story", journey);
    } else if (journey.firstStory !== slug && !journey.secondStory && now - journey.started <= sevenDays) {
      journey.secondStory = true;
      milestone("reader_second_story", journey);
    }
  });
}

export function trackNewsletterSignup() {
  updateJourney((journey, now) => {
    if (journey.firstStory && !journey.subscribed && now - journey.started <= sevenDays) {
      journey.subscribed = true;
      milestone("reader_newsletter_signup", journey);
    }
  });
}
