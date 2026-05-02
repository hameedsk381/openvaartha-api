

## South Indian Regional News App — Frontend MVP

### Design System
- **Dark mode first** with high contrast, minimal 3-4 color palette
- Card-based UI with soft shadows, rounded corners (8-12px), smooth transitions
- Typography optimized for Indian readability: Headlines 24-28px, Body 16-18px, line-height 1.6+, no heavy serifs
- Color-coded category badges: 🟣 Politics, 🔵 Tech, 🟢 Business, 🟠 Cinema, 🔴 Local News, 🟡 Sports

### Pages & Components

**Homepage (Feed)**
- Top navbar with app branding
- Horizontal scrollable category chips (sticky)
- Feed cards with: bold headline, 1-line summary, category badge, read time ("30 sec read"), optional thumbnail, "🔥 Trending" badge, hover/tap animations
- Infinite scroll feel with skeleton loaders

**Article Page (`/article/:slug`)**
- Headline → TL;DR (2-3 lines) → Key Points (bullets) → Full Content
- "Read in Telugu" mock language toggle
- Share CTA with sticky bottom share bar (mobile)
- "Read Next" mock recommendations

### Data
- Static mock JSON with ~8-10 articles covering all categories, South India focused content (AP budget, Tollywood, IPL, Bengaluru tech, Kerala floods, etc.)

### Accessibility & Performance
- Semantic HTML (`<article>`, `<nav>`, etc.), ARIA labels, keyboard navigation
- High contrast text, font scaling support
- Lazy loaded images, smooth transitions
- Skeleton loading states

### Smart Enhancements
- Trending badge on select articles
- Read time tags on all cards
- Smooth page transitions
- Responsive mobile-first design

