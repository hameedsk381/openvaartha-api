export const BRAND = {
  name: "Open Vaartha",
  shortName: "Open Vaartha",
  monogram: "OV",
  tagline: "An open news platform, built by Gen Z, for the liberation of digital spaces.",
  // Kept under 160 chars, keywords first — long descriptions get truncated in
  // search snippets and social previews.
  description: "Open Vaartha is an independent, youth-led news initiative — open journalism built by Gen Z, for a freer internet.",
  url: "https://openvaartha.com",
  twitterHandle: "@openvaartha",
  instagramHandle: "@openvaartha",
  instagramUrl: "https://www.instagram.com/OPENVAARTHA/",
  facebookHandle: "openvaartha",
  facebookUrl: "https://www.facebook.com/openvaartha/",
  youtubeHandle: "@openvaartha",
  youtubeUrl: "https://youtube.com/@openvaartha",
  copyright: "FOSS Andhra Foundation",
  contactEmail: "office@openvaartha.com",
  logoPath: "/logo.jpg",
  iconPath: "/icon.svg",
  lang: "en",
  themeColor: "#550000",
  backgroundColor: "#f8f5f0",
  authorName: "Open Vaartha Desk",
  editorialPromise: "The Open Vaartha editorial promise",
} as const;

export const SITE_TITLE = `${BRAND.name} — An Open News Platform, Built by Gen Z`;
export const SITE_DESCRIPTION = BRAND.description;

export function pageTitle(title: string): string {
  return `${title} — ${BRAND.name}`;
}