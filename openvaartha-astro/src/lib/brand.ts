export const BRAND = {
  name: "Open Vaartha",
  shortName: "Open Vaartha",
  monogram: "OV",
  tagline: "Independent public-interest journalism from Andhra Pradesh.",
  description: "Open Vaartha is an independent digital news initiative focused on politics, governance, society, technology, environment and public-interest journalism from Andhra Pradesh.",
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
  supportUrl: "https://razorpay.me/@fossandhrafoundation",
  supportUpiId: "",
  logoPath: "/logo.jpg",
  iconPath: "/pwa-512x512.png",
  iconMaroonPath: "/icon-maroon.png",
  iconWhitePath: "/icon-white.png",
  lang: "en",
  themeColor: "#550000",
  backgroundColor: "#f8f5f0",
  authorName: "Open Vaartha Desk",
} as const;

export const SITE_TITLE = `${BRAND.name} | Independent Public-Interest Journalism from Andhra Pradesh`;
export const SITE_DESCRIPTION = BRAND.description;

export function pageTitle(title: string): string {
  return `${title} — ${BRAND.name}`;
}
