export const BRAND = {
  name: "Open Vaartha",
  shortName: "Open Vaartha",
  monogram: "OV",
  tagline: "Independent journalism for Andhra Pradesh & Telangana. Two states, one signal, no noise.",
  // Kept under 160 chars, keywords first — long descriptions get truncated in
  // search snippets and social previews.
  description: "Andhra Pradesh & Telangana news: politics, tech, cinema, and business. Fast, independent dispatches from Open Vaartha.",
  url: "https://openvaartha.com",
  twitterHandle: "@openvaartha",
  instagramHandle: "@openvaartha",
  instagramUrl: "https://www.instagram.com/OPENVAARTHA/",
  facebookHandle: "openvaartha",
  facebookUrl: "https://www.facebook.com/openvaartha/",
  copyright: "FOSS Andhra Foundation",
  logoPath: "/logo.jpg",
  iconPath: "/icon.svg",
  lang: "en",
  themeColor: "#550000",
  backgroundColor: "#f8f5f0",
  authorName: "Open Vaartha Desk",
  editorialPromise: "The Open Vaartha editorial promise",
} as const;

export const SITE_TITLE = `${BRAND.name} — Andhra Pradesh & Telangana's Authoritative News Platform`;
export const SITE_DESCRIPTION = BRAND.description;

export function pageTitle(title: string): string {
  return `${title} — ${BRAND.name}`;
}