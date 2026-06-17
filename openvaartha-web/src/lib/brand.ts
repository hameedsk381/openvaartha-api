export const BRAND = {
  name: "Open Vaartha",
  shortName: "Open Vaartha",
  monogram: "OV",
  tagline: "Independent journalism from South India. Five languages. One signal, no noise.",
  description: "Immersive, high-speed regional dispatches from South India. Open Vaartha brings you authoritative briefings on Politics, Tech, Cinema, and Business.",
  url: "https://openvaartha.com",
  twitterHandle: "@openvaartha",
  instagramHandle: "@openvaartha",
  instagramUrl: "https://www.instagram.com/openvaartha/",
  copyright: "Hamathopc Pvt Ltd.",
  logoPath: "/logo.jpg",
  iconPath: "/icon.svg",
  lang: "en",
  themeColor: "#550000",
  backgroundColor: "#f8f5f0",
  authorName: "Open Vaartha Desk",
  editorialPromise: "The Open Vaartha editorial promise",
} as const;

export const SITE_TITLE = `${BRAND.name} — South India's Authoritative News Platform`;
export const SITE_DESCRIPTION = BRAND.description;

export function pageTitle(title: string): string {
  return `${title} — ${BRAND.name}`;
}