export type Category = "Politics" | "Tech" | "Business" | "Cinema" | "Local News" | "Sports";

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: Category;
  readTime: string;
  language: string;
  trending?: boolean;
  isBreaking?: boolean;
  thumbnail?: string;
  instagramUrl?: string; // Social integration
  publishedAt: string;
  lastUpdated?: string;
  author: string;
  sources?: string[];
  content: {
    tldr: string;
    points: string[];
    body: string;
    timeline?: { date: string; event: string }[];
    explainer?: { question: string; answer: string }[];
  };
}

export const categoryColors: Record<Category, string> = {
  Politics: "bg-[#550000]", // Burgundy
  Tech: "bg-[#4a5568]", // Earthy Slate
  Business: "bg-[#6b705c]", // Sage Green
  Cinema: "bg-[#cb997e]", // Terra Cotta
  "Local News": "bg-[#bc6c25]", // Earthy Orange/Clay
  Sports: "bg-[#ddb892]", // Deep Beige
};

export const categoryEmojis: Record<Category, string> = {
  Politics: "🟣",
  Tech: "🔵",
  Business: "🟢",
  Cinema: "🟠",
  "Local News": "🔴",
  Sports: "🟡",
};

export const articles: Article[] = [
  {
    id: "1",
    slug: "andhra-budget-2026",
    title: "Andhra Pradesh Budget 2026: ₹2.8 Lakh Crore Focus on Infra & Welfare",
    summary: "Key allocations focus on infrastructure, agriculture, and Amaravati development.",
    category: "Politics",
    readTime: "45 sec",
    language: "en",
    trending: true,
    isBreaking: true,
    thumbnail: "/thumbnails/ap_budget.png",
    publishedAt: "2026-04-02T08:00:00Z",
    lastUpdated: "2026-04-02T10:30:00Z",
    author: "Open Vaartha Desk",
    sources: ["AP Finance Dept", "AP Govt Gazette", "PTI"],
    content: {
      tldr: "AP government increases spending on infrastructure and welfare schemes. Amaravati capital city project gets renewed funding.",
      points: [
        "₹20,000 crore allocated for Amaravati capital development",
        "New irrigation projects across Rayalaseema region announced",
        "Focus on rural employment with ₹5,000 crore NREGS supplement",
        "Free laptop scheme for intermediate students expanded",
        "Healthcare budget increased by 18% year-over-year"
      ],
      body: "The Andhra Pradesh government presented its annual budget for 2026-27 with a total outlay of ₹2.8 lakh crore. Chief Minister highlighted the government's commitment to completing the Amaravati capital city project...",
      timeline: [
        { date: "Feb 2026", event: "Pre-budget consultations with farmers" },
        { date: "Mar 15, 2026", event: "Drafting of final allocations" },
        { date: "Apr 2, 2026", event: "Budget presented in State Assembly" }
      ]
    }
  },
  {
    id: "2",
    slug: "rrr-sequel-announcement",
    title: "SS Rajamouli Confirms RRR Sequel with Ram Charan & Jr NTR",
    summary: "India's biggest director announces the much-awaited sequel, shooting begins October.",
    category: "Cinema",
    readTime: "30 sec",
    language: "en",
    trending: true,
    thumbnail: "/thumbnails/rrr_sequel.png",
    instagramUrl: "https://www.instagram.com/p/C58vQZSS_q9/", 
    publishedAt: "2026-04-01T14:00:00Z",
    author: "Cinema Intel Team",
    sources: ["Press Meet Hyderabad", "Official Production Handle"],
    content: {
      tldr: "SS Rajamouli officially confirms RRR 2 with both Ram Charan and Jr NTR returning. The film will have a pan-world release.",
      points: [
        "Both Ram Charan and Jr NTR confirmed to return",
        "Budget estimated at ₹800 crore",
        "Shooting begins October 2026 across 5 countries",
        "MM Keeravani returns as music composer",
        "Planned for Sankranti 2028 release"
      ],
      body: "In what is being called the biggest announcement in Indian cinema this year, legendary director SS Rajamouli has officially confirmed the sequel..."
    }
  },
  {
    id: "3",
    slug: "bengaluru-metro-phase-3",
    title: "Bengaluru Metro Phase 3 Approved: 45 km Ring Line to Ease Traffic",
    summary: "Union cabinet gives green signal to ₹18,000 crore metro expansion project.",
    category: "Local News",
    readTime: "40 sec",
    language: "en",
    isBreaking: true,
    thumbnail: "/thumbnails/bengaluru_metro.png",
    publishedAt: "2026-04-01T10:00:00Z",
    author: "Urban Desk",
    sources: ["PIB India", "Karnataka Transport Dept"],
    content: {
      tldr: "Bengaluru Metro Phase 3 gets Union Cabinet approval. The 45 km ring line will reduce traffic congestion by 30%.",
      points: [
        "45 km ring line connecting major IT hubs",
        "₹18,000 crore project with 50-50 Centre-State funding",
        "32 new stations planned along the route",
        "Expected completion by 2030",
        "Will integrate with suburban rail network"
      ],
      body: "The Union Cabinet has approved Bengaluru Metro Phase 3, a 45 km ring line that promises to transform public transportation..."
    }
  },
  {
    id: "4",
    slug: "hyderabad-ai-hub",
    title: "Hyderabad Emerges as India's AI Capital with 200+ Startups",
    summary: "Telangana's AI ecosystem surpasses Bengaluru in growth rate for first time.",
    category: "Tech",
    readTime: "35 sec",
    language: "en",
    trending: true,
    thumbnail: "/thumbnails/hyderabad_ai.png",
    publishedAt: "2026-04-02T06:00:00Z",
    author: "Tech Dossier Team",
    sources: ["NASSCOM Report", "Telangana IT Dept"],
    content: {
      tldr: "Hyderabad's AI startup ecosystem has grown 340% in 3 years, overtaking Bengaluru in growth rate.",
      points: [
        "200+ AI startups now operating from Hyderabad",
        "340% growth in AI ecosystem over 3 years",
        "T-Hub 2.0 incubating 60+ AI-focused companies",
        "IIIT Hyderabad producing top AI research globally",
        "Telangana AI Mission attracted ₹4,000 crore in investments"
      ],
      body: "Hyderabad has quietly but decisively emerged as India's artificial intelligence capital, with over 200 AI-focused startups..."
    }
  },
  {
    id: "5",
    slug: "kerala-monsoon-prep-2026",
    title: "Kerala Launches Most Advanced Monsoon Early Warning System",
    summary: "AI-powered system can predict flooding 72 hours in advance with 90% accuracy.",
    category: "Local News",
    readTime: "35 sec",
    language: "en",
    thumbnail: "https://images.unsplash.com/photo-1687499158539-b9383a5917e7?auto=format&fit=crop&w=1600&q=80",
    publishedAt: "2026-03-31T12:00:00Z",
    author: "Regional Desk",
    sources: ["Kerala Disaster Management Authority", "IIT Madras"],
    content: {
      tldr: "Kerala debuts India's most sophisticated monsoon warning system using AI and IoT sensors.",
      points: [
        "AI model trained on 50 years of rainfall data",
        "5,000 IoT sensors deployed across all 14 districts",
        "72-hour advance flood prediction with 90% accuracy",
        "Automatic alerts via SMS and local TV",
        "₹500 crore investment in disaster preparedness"
      ],
      body: "Kerala has launched India's most advanced monsoon early warning system..."
    }
  },
  {
    id: "6",
    slug: "csk-ipl-2026-playoff",
    title: "CSK Storms into IPL 2026 Playoffs with Dhoni's Farewell Season Magic",
    summary: "Chennai Super Kings clinch playoff berth; Dhoni hints at retirement after this season.",
    category: "Sports",
    readTime: "30 sec",
    language: "en",
    trending: true,
    thumbnail: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80",
    publishedAt: "2026-04-02T09:00:00Z",
    author: "Sports Tracker",
    sources: ["IPL Media", "CSK Official"],
    content: {
      tldr: "MS Dhoni leads CSK to IPL 2026 playoffs in what's widely expected to be his final season.",
      points: [
        "CSK clinch 4th position with 8 wins from 14 matches",
        "Dhoni scores crucial 42*(18) in league game",
        "Qualifier 2 against RCB on April 5th"
      ],
      body: "In what is being described as one of the most emotional nights in IPL history..."
    }
  },
  {
    id: "7",
    slug: "tamil-nadu-ev-policy",
    title: "Tamil Nadu Unveils Ambitious EV Policy: 50% Electric Vehicles by 2030",
    summary: "State targets becoming India's EV manufacturing hub with ₹10,000 crore incentives.",
    category: "Business",
    readTime: "40 sec",
    language: "en",
    thumbnail: "https://images.unsplash.com/photo-1699253801373-dac49c05066f?auto=format&fit=crop&w=1600&q=80",
    publishedAt: "2026-03-30T11:00:00Z",
    author: "Industry Watch",
    sources: ["TN Industry Dept", "Automotive News"],
    content: {
      tldr: "Tamil Nadu announces comprehensive EV policy targeting 50% adoption by 2030.",
      points: [
        "50% EV adoption target across all categories",
        "₹10,000 crore incentive package",
        "100% road tax exemption until 2030"
      ],
      body: "Tamil Nadu has unveiled one of India's most ambitious electric vehicle policies..."
    }
  },
  {
    id: "8",
    slug: "tollywood-pan-india-wave",
    title: "Tollywood's Global Box Office Crosses ₹10,000 Crore in 2025-26",
    summary: "Telugu cinema industry achieves historic milestone, overtaking Bollywood internationally.",
    category: "Cinema",
    readTime: "30 sec",
    language: "en",
    thumbnail: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80",
    publishedAt: "2026-03-29T16:00:00Z",
    author: "Entertainment Desk",
    sources: ["Box Office Mojo", "Telugu Film Chamber"],
    content: {
      tldr: "Telugu film industry global box office cross ₹10,000 crore, a historic milestone.",
      points: [
        "₹10,000 crore global box office — highest Indian industry",
        "5 films crossed ₹500 crore worldwide",
        "OTT deals worth ₹3,000 crore"
      ],
      body: "The Telugu film industry has achieved a historic milestone..."
    }
  },
  {
    id: "9",
    slug: "karnataka-startup-fund",
    title: "Karnataka Launches ₹5,000 Crore Startup Fund for Tier-2 Cities",
    summary: "Mysuru, Mangaluru, and Hubli-Dharwad to get dedicated tech parks and incubators.",
    category: "Business",
    readTime: "35 sec",
    language: "en",
    thumbnail: "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?auto=format&fit=crop&w=1600&q=80",
    publishedAt: "2026-03-28T09:00:00Z",
    author: "Capital News",
    sources: ["Karnataka Startup Cell", "Business Line"],
    content: {
      tldr: "Karnataka targets tier-2 cities with ₹5,000 crore fund to decongest Bengaluru.",
      points: [
        "₹5,000 crore fund for tier-2 ecosystems",
        "Free coworking for first 2 years",
        "5-year tax holidays"
      ],
      body: "In a bold move to decentralize Karnataka's tech ecosystem..."
    }
  },
  {
    id: "10",
    slug: "vizag-it-corridor",
    title: "Visakhapatnam IT Corridor Attracts TCS, Infosys with 25,000 Jobs",
    summary: "AP's tech push pays off as major IT companies set up campuses in the port city.",
    category: "Tech",
    readTime: "30 sec",
    language: "en",
    thumbnail: "https://images.unsplash.com/photo-1629652320041-c2c555e68101?auto=format&fit=crop&w=1600&q=80",
    publishedAt: "2026-03-27T13:00:00Z",
    author: "Tech Dossier Team",
    sources: ["AP IT Minister", "NASSCOM"],
    content: {
      tldr: "Visakhapatnam's new IT corridor has attracted TCS, Infosys, and Wipro.",
      points: [
        "Major campuses being set up in Vizag",
        "25,000 new IT jobs expected",
        "₹2,000 crore government incentive package"
      ],
      body: "Visakhapatnam is rapidly emerging as Andhra Pradesh's IT powerhouse..."
    }
  }
];
