"""
Seed the MongoDB database with sample data for development/testing.
Drop-in replacement -- idempotent, run as many times as you like.

Usage:
    python -m scripts.seed_db
"""
import asyncio
import motor.motor_asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
import bcrypt as _bcrypt


def _hash_password(password: str) -> str:
    """Hash a password using bcrypt directly (avoids passlib compat issues)."""
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()

NOW = datetime.now(timezone.utc)

CATEGORIES = [
    {"name": "Politics",      "color_code": "#550000", "emoji": "purple"},
    {"name": "Tech",          "color_code": "#4a5568", "emoji": "blue"},
    {"name": "Business",      "color_code": "#6b705c", "emoji": "green"},
    {"name": "Cinema",        "color_code": "#cb997e", "emoji": "orange"},
    {"name": "Local News",    "color_code": "#bc6c25", "emoji": "red"},
    {"name": "Sports",        "color_code": "#ddb892", "emoji": "yellow"},
    {"name": "World",         "color_code": "#2b6cb0", "emoji": "globe"},
    {"name": "Health",        "color_code": "#319795", "emoji": "heart"},
    {"name": "Science",       "color_code": "#805ad5", "emoji": "atom"},
    {"name": "Entertainment", "color_code": "#d69e2e", "emoji": "star"},
    {"name": "Education",     "color_code": "#3182ce", "emoji": "book"},
    {"name": "Lifestyle",     "color_code": "#e53e3e", "emoji": "sparkles"},
]

ARTICLES = [
    {
        "title": "Andhra Pradesh Budget 2026: Rs 2.8 Lakh Crore Focus on Infra and Welfare",
        "summary": "State government announces record budget with significant allocations for irrigation, education, and Amaravati development.",
        "category": "Politics",
        "read_time": "5 min read",
        "author": "Vignesh Kumar",
        "is_breaking": True,
        "is_trending": True,
        "is_editor_pick": True,
        "thumbnail_url": "https://images.unsplash.com/photo-1541872703-74c5e443d1f9?w=800&auto=format&fit=crop",
        "published_at": NOW - timedelta(hours=2),
        "content": {
            "tldr": "Andhra Pradesh unveiled a record Rs 2.8L Cr budget for 2026-27 with heavy emphasis on social welfare and capital expenditure.",
            "points": [
                "Rs 20,000 Cr allocated for Amaravati capital development",
                "Agriculture receives Rs 30,000 Cr with focus on irrigation",
                "Free laptop scheme expanded to all intermediate students",
                "Healthcare budget increased 18% YoY",
                "New industrial corridor announced between Visakhapatnam and Kakinada",
            ],
            "body": "The Andhra Pradesh Finance Minister presented the state budget for fiscal year 2026-27 in the legislative assembly today. The total outlay of Rs 2.8 lakh crore represents a 14% increase over the previous year, with significant allocations directed toward infrastructure development, social welfare schemes, and agricultural support.\n\nSpeaking after the budget presentation, the Chief Minister described it as a 'visionary document' that balances fiscal prudence with developmental aspirations. The opposition, however, criticized the government for what they called 'election-oriented populism.'\n\nKey highlights include a major push for the long-delayed Amaravati capital city project, which has received a dedicated allocation of Rs 20,000 crore. The government has also announced a new industrial corridor connecting Visakhapatnam and Kakinada, expected to generate an estimated 50,000 jobs over the next three years.",
            "timeline": [
                {"date": "10:00 AM", "event": "Budget session begins"},
                {"date": "10:15 AM", "event": "Finance Minister presents economic survey"},
                {"date": "11:00 AM", "event": "Tax proposals announced"},
                {"date": "11:30 AM", "event": "Speech concludes, opposition walkout"},
            ],
        },
    },
    {
        "title": "NVIDIA's New Hyperion Chip Promises 10x Faster Real-time Translation",
        "summary": "The latest AI architecture from NVIDIA targets latency-sensitive NLP tasks, including real-time language translation across 200+ languages.",
        "category": "Tech",
        "read_time": "3 min read",
        "author": "Sarah Chen",
        "is_breaking": False,
        "is_trending": True,
        "is_editor_pick": False,
        "thumbnail_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
        "published_at": NOW - timedelta(hours=5),
        "content": {
            "tldr": "NVIDIA's Hyperion architecture delivers 10x speed improvement for real-time translation across 200+ languages.",
            "points": [
                "10x speed improvement over previous generation",
                "Supports 200+ languages with sub-100ms latency",
                "Energy-efficient design with 40% lower power consumption",
                "Q3 2026 launch expected for data center partners",
                "SDK released for developers in beta",
            ],
            "body": "NVIDIA CEO Jensen Huang took the stage at GTC 2026 to unveil Hyperion -- the company's next-generation AI accelerator purpose-built for natural language processing workloads. The new architecture delivers a tenfold improvement in inference speed for transformer-based models, making real-time translation across 200+ languages feasible at data-center scale.\n\n'Language is the ultimate interface,' Huang said during the keynote. 'Hyperion breaks down the barriers between people, regardless of what language they speak.'\n\nThe chip achieves its performance gains through a novel memory architecture that reduces data movement bottlenecks -- the primary constraint in modern AI inference. Early partners including Google Cloud and Microsoft Azure have already announced plans to deploy Hyperion instances later this year.",
            "explainer": [
                {"question": "What makes Hyperion different?", "answer": "Its novel memory architecture minimizes data movement, which is the primary bottleneck in AI inference."},
                {"question": "When can developers access it?", "answer": "NVIDIA has released a beta SDK, with general availability expected in Q3 2026."},
            ],
        },
    },
    {
        "title": "Chennai Metro Phase 3: New Corridors to Connect IT Corridor by 2028",
        "summary": "Chennai Metro Rail Limited announces Rs 15,000 Cr expansion plan covering OMR, Porur, and Parrys Corner.",
        "category": "Local News",
        "read_time": "4 min read",
        "author": "Priya Raman",
        "is_breaking": False,
        "is_trending": False,
        "is_editor_pick": False,
        "thumbnail_url": "https://images.unsplash.com/photo-1590674899484-d5640d853c3f?w=800&auto=format&fit=crop",
        "published_at": NOW - timedelta(hours=8),
        "content": {
            "tldr": "Chennai Metro Phase 3 expansion will add 45 km of new corridors connecting IT corridor and western suburbs, to be completed by 2028.",
            "points": [
                "45 km of new metro corridors approved",
                "OMR IT corridor gets long-awaited metro connectivity",
                "Interchange at Porur connecting to existing line",
                "Estimated completion by mid-2028",
                "Daily ridership expected to cross 12 lakh",
            ],
            "body": "Chennai Metro Rail Limited (CMRL) has received state government approval for Phase 3 of its expansion, which will add 45 kilometers of new track across three corridors. The most significant addition is the long-awaited link to the Old Mahabalipuram Road (OMR) IT corridor, which houses over 60% of the city's technology workforce.\n\n'This is a transformative project for Chennai,' said CMRL Managing Director. 'The OMR corridor has been clamoring for mass transit for over a decade.'\n\nThe project is expected to break ground in early 2027, with completion targeted for mid-2028. The expansion will also connect the rapidly-growing western suburbs including Porur and Ramapuram.",
        },
    },
    {
        "title": "Rupee Strengthens to 82.5 Against Dollar on FII Inflow",
        "summary": "Indian rupee hits six-month high as foreign institutional investors pour Rs 12,000 Cr into domestic equities.",
        "category": "Business",
        "read_time": "2 min read",
        "author": "Anjali Mehta",
        "is_breaking": True,
        "is_trending": True,
        "is_editor_pick": False,
        "thumbnail_url": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop",
        "published_at": NOW - timedelta(hours=3),
        "content": {
            "tldr": "The Indian rupee rallied to 82.5 against the US dollar -- a six-month high -- driven by heavy FII inflows into domestic equities.",
            "points": [
                "Rupee closes at 82.5, strongest in six months",
                "FIIs net buyers of Rs 12,000 Cr this week",
                "IT and banking stocks lead the rally",
                "RBI likely to maintain status quo on rates",
                "Brent crude below $75 supports sentiment",
            ],
            "body": "The Indian rupee strengthened to 82.5 against the US dollar on Thursday, its highest level in six months, as sustained foreign institutional investor (FII) inflows boosted sentiment. FIIs have been net buyers of over Rs 12,000 crore in Indian equities this week alone, driven by expectations of stable policy continuity and strong corporate earnings.\n\nThe rally was led by IT and banking stocks, with the Nifty IT index gaining 2.3% and Bank Nifty rising 1.8%. Market analysts attribute the inflows to India's resilient economic fundamentals amid global uncertainty.\n\n'India continues to be a bright spot in the emerging market landscape,' said the chief investment officer of a leading mutual fund.",
        },
    },
    {
        "title": "SS Rajamouli Confirms RRR Sequel with Ram Charan and Jr NTR",
        "summary": "India's biggest director announces the much-awaited sequel. Shooting begins October 2026 across five countries.",
        "category": "Cinema",
        "read_time": "3 min read",
        "author": "Cinema Intel Team",
        "is_breaking": True,
        "is_trending": True,
        "is_editor_pick": True,
        "thumbnail_url": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop",
        "instagram_url": "https://www.instagram.com/p/C58vQZSS_q9/",
        "published_at": NOW - timedelta(hours=6),
        "content": {
            "tldr": "SS Rajamouli officially confirms RRR 2 with both Ram Charan and Jr NTR returning, budget estimated at Rs 800 Cr.",
            "points": [
                "Both Ram Charan and Jr NTR confirmed to reprise their roles",
                "Budget estimated at Rs 800 crore -- most expensive Indian film",
                "Shooting begins October 2026 across 5 countries",
                "MM Keeravani returns as music composer",
                "Planned for Sankranti 2028 release window",
            ],
            "body": "In what is being called the biggest announcement in Indian cinema this year, director SS Rajamouli has officially confirmed that a sequel to the global blockbuster RRR is in active development. Both Ram Charan and Jr NTR will return to reprise their roles as Alluri Sitarama Raju and Komaram Bheem, respectively.\n\n'RRR was just the beginning,' Rajamouli said at a press conference in Hyderabad. 'The sequel expands the story in ways we couldn't have imagined when we started the first film.'\n\nThe film will be produced on an estimated budget of Rs 800 crore, making it the most expensive Indian film ever made. Pre-production is already underway, with principal photography scheduled to begin in October 2026 across five countries including India, New Zealand, and parts of Europe.",
        },
    },
    {
        "title": "India vs Australia: Hyderabad Test Set for Thrilling Final Day",
        "summary": "Australia need 187 runs with 6 wickets in hand after Jadeja's five-wicket haul keeps India in the game.",
        "category": "Sports",
        "read_time": "4 min read",
        "author": "Sports Desk",
        "is_breaking": False,
        "is_trending": True,
        "is_editor_pick": False,
        "thumbnail_url": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop",
        "published_at": NOW - timedelta(hours=4),
        "content": {
            "tldr": "Day 4 ends with Australia needing 187 runs while India needs 6 wickets. Jadeja's 5/82 brings the match to a gripping climax.",
            "points": [
                "Australia end Day 4 at 213/4, need 187 more",
                "Ravindra Jadeja picks 5/82 in second innings",
                "India set Australia a target of 399",
                "Smith and Head at the crease on 68 and 42",
                "Final day crowd expected to be a sellout",
            ],
            "body": "The first Test between India and Australia at Hyderabad's Rajiv Gandhi International Stadium is set for a blockbuster final day after Ravindra Jadeja's five-wicket haul kept India firmly in contention. Chasing a daunting target of 399, Australia finished Day 4 at 213 for 4, still needing 187 runs for victory.\n\nJadeja, who was the pick of the Indian bowlers, finished with figures of 5 for 82, using the rough outside the right-hander's off-stump to devastating effect. Steve Smith (68 not out) and Travis Head (42 not out) will resume on the final day with the match beautifully poised.\n\n'It's 50-50,' said Indian captain after the day's play. 'We believe we can get these six wickets tomorrow.'",
        },
    },
    {
        "title": "Hyderabad's New Greenfield Airport at Basheerabad Gets Cabinet Nod",
        "summary": "Telangana cabinet approves fourth airport for Hyderabad region with Rs 25,000 Cr investment.",
        "category": "Local News",
        "read_time": "3 min read",
        "author": "Karthik Rao",
        "is_breaking": False,
        "is_trending": False,
        "is_editor_pick": False,
        "thumbnail_url": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&auto=format&fit=crop",
        "published_at": NOW - timedelta(days=1),
        "content": {
            "tldr": "Telangana cabinet clears fourth airport for Hyderabad at Basheerabad with an investment of Rs 25,000 Cr.",
            "points": [
                "Greenfield airport at Basheerabad, 60 km from Hyderabad",
                "Rs 25,000 Cr investment over 5 years",
                "Expected to handle 30 million passengers annually",
                "Will decongest Rajiv Gandhi International Airport",
                "Construction expected to begin early 2027",
            ],
            "body": "In a major infrastructure push, the Telangana cabinet has approved the construction of a new greenfield airport at Basheerabad, located approximately 60 kilometers from Hyderabad. This will be the fourth airport serving the Hyderabad region, joining Rajiv Gandhi International Airport (RGIA), and the existing smaller airstrips at Begumpet and Hakimpet.\n\nThe cabinet memo estimates the project cost at Rs 25,000 crore, with development spread over five years. Once operational, the Basheerabad airport is expected to handle 30 million passengers annually, significantly reducing the load on RGIA which has been operating near capacity.\n\n'The Hyderabad growth story requires world-class infrastructure,' said the Telangana Chief Minister.",
        },
    },
    {
        "title": "Tamil Nadu Announces Rs 500 Cr Startup Fund for DeepTech",
        "summary": "State government launches dedicated venture fund for AI, semiconductor, and biotech startups with matching private investment.",
        "category": "Business",
        "read_time": "3 min read",
        "author": "Lakshmi Narayanan",
        "is_breaking": False,
        "is_trending": False,
        "is_editor_pick": True,
        "thumbnail_url": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop",
        "published_at": NOW - timedelta(days=1, hours=6),
        "content": {
            "tldr": "Tamil Nadu launches a Rs 500 Cr venture fund for DeepTech startups with matching contributions from private VCs.",
            "points": [
                "Rs 500 Cr fund focused on AI, semiconductors, biotech",
                "Co-investment model with matching private VC funding",
                "Incubation support at IIT-Madras Research Park",
                "Goal: Create 100 DeepTech startups in 5 years",
                "First close of Rs 200 Cr announced",
            ],
            "body": "The Tamil Nadu government has announced the creation of a Rs 500 crore venture fund dedicated to supporting DeepTech startups in the state. The fund, which will be managed by an independent investment committee, will focus on artificial intelligence, semiconductor design, and biotechnology.\n\nWhat makes this initiative unique is its co-investment model -- the government will match investments made by private venture capital firms, effectively doubling the capital available to startups. The fund's first close of Rs 200 crore has already been announced, with commitments from four leading VC firms.\n\n'IIT-Madras Research Park will serve as the incubation hub,' said the state's IT Minister.",
        },
    },
    {
        "title": "Kannada Film 'Mookajjiya Kanasu' Wins National Film Award for Best Feature",
        "summary": "Pradeep Kumar's adaptation of Shivaram Karanth's novel wins Best Feature Film at the 72nd National Film Awards.",
        "category": "Cinema",
        "read_time": "4 min read",
        "author": "Deepa Sundar",
        "is_breaking": False,
        "is_trending": False,
        "is_editor_pick": False,
        "thumbnail_url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop",
        "published_at": NOW - timedelta(days=2),
        "content": {
            "tldr": "Kannada film 'Mookajjiya Kanasu' wins Best Feature Film at the 72nd National Film Awards, putting Kannada cinema in the national spotlight.",
            "points": [
                "Best Feature Film at 72nd National Film Awards",
                "Based on Shivaram Karanth's Jnanpith-winning novel",
                "Director Pradeep Kumar wins Best Director",
                "Shot entirely in coastal Karnataka over 18 months",
                "Also wins Best Cinematography and Best Music",
            ],
            "body": "Kannada cinema achieved a historic milestone at the 72nd National Film Awards as 'Mookajjiya Kanasu' (Mookajji's Dream) won the prestigious Best Feature Film award. Director Pradeep Kumar's adaptation of the late Shivaram Karanth's Jnanpith award-winning novel of the same name swept the awards ceremony.\n\nThe film, which was shot entirely in the coastal Karnataka region over 18 months, also won Best Director for Pradeep Kumar, Best Cinematography for Venkatesh, and Best Music Director for the veteran composer B. Ajaneesh Loknath.\n\n'This is a victory for Kannada literature and cinema,' said Pradeep Kumar while receiving the award.",
        },
    },
    {
        "title": "South India Heatwave: Temperatures Cross 44C in Telangana, Andhra",
        "summary": "IMD issues red alert for Telangana and coastal Andhra as temperatures soar. Schools closed for a week.",
        "category": "Local News",
        "read_time": "2 min read",
        "author": "Weather Desk",
        "is_breaking": True,
        "is_trending": False,
        "is_editor_pick": False,
        "thumbnail_url": "https://images.unsplash.com/photo-1561484930-998b6a7b22e8?w=800&auto=format&fit=crop",
        "published_at": NOW - timedelta(hours=1),
        "content": {
            "tldr": "Heatwave conditions intensify across Telangana and Andhra Pradesh with temperatures crossing 44C. IMD issues red alert.",
            "points": [
                "44.6C recorded in Nalgonda -- highest this season",
                "IMD red alert for 8 districts in Telangana",
                "Schools and colleges closed for one week",
                "Heat wave expected to continue for 3 more days",
                "Health department sets up cooling centers",
            ],
            "body": "A severe heatwave continued to grip large parts of South India on Thursday, with temperatures crossing 44 degrees Celsius in several parts of Telangana and Andhra Pradesh. The Indian Meteorological Department (IMD) has issued a red alert for eight districts in Telangana and five districts in coastal Andhra.\n\nNalgonda recorded the highest temperature at 44.6C, while Hyderabad touched 42.3C -- the highest April temperature in the city in five years. Authorities have ordered the closure of all schools and colleges for one week as a precautionary measure.\n\nThe state governments have set up cooling centers in public places and issued advisories urging people to stay indoors during peak afternoon hours.",
        },
    },
]

async def seed_db():
    print("--- Seeding database ---")
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    # 1. Categories
    print("\n[Categories]")
    category_map = {}
    for cat in CATEGORIES:
        existing = await db["categories"].find_one({"name": cat["name"]})
        if existing:
            category_map[cat["name"]] = existing["_id"]
            print(f"  = {cat['name']} (already exists)")
        else:
            cat_id = str(uuid4())
            await db["categories"].insert_one({
                "_id": cat_id, "id": cat_id,
                **cat,
                "created_at": NOW,
            })
            category_map[cat["name"]] = cat_id
            print(f"  + {cat['name']}")

    # 2. Users
    print("\n[Users]")
    users = [
        ("admin@openvaartha.com", "OpenVaartha Admin", "admin123", True, True),
        ("user@openvaartha.com",  "Test Reader",       "user123",  True, False),
    ]
    for email, name, pw, active, is_admin in users:
        existing = await db["users"].find_one({"email": email})
        if existing:
            print(f"  = {email} (already exists)")
        else:
            uid = str(uuid4())
            await db["users"].insert_one({
                "_id": uid, "id": uid,
                "email": email,
                "full_name": name,
                "hashed_password": _hash_password(pw),
                "is_active": active,
                "is_admin": is_admin,
                "role": "admin" if is_admin else "user",
                "avatar_url": None,
                "created_at": NOW,
            })
            print(f"  + {email} / {pw}")

    # 3. Authors
    print("\n[Authors]")
    authors_data = [
        ("Vignesh Kumar", "Senior Political Correspondent with over 10 years covering state legislatures and election policy.", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", "@vignesh_pol"),
        ("Sarah Chen", "Tech lead and deep-tech researcher specialized in semiconductor fabrication and AI models.", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", "@sarah_tech"),
        ("Priya Raman", "South India bureau chief reporting on infrastructure, transit grids, and local urban shifts.", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150", "@priya_raman"),
        ("Anjali Mehta", "Financial journalist focusing on macroeconomic policy, market systems, and local retail trade.", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150", "@anjali_biz"),
        ("Cinema Intel Team", "OpenVaartha's collaborative desk reviewing local releases, box office indexes, and indie cinema.", "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=150", "@cinema_intel"),
        ("Sports Desk", "OpenVaartha's dedicated sports crew covering national tournaments, athletics, and local club play.", "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150", "@ov_sports"),
        ("Karthik Rao", "Resident tech critic covering consumer computing, hardware benchmarks, and open-source stacks.", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", "@karthik_tech"),
        ("Lakshmi Narayanan", "Independent photojournalist documenting citizen welfare projects and public policy shifts.", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", "@lakshmi_n"),
    ]
    
    author_map = {}
    for name, bio, avatar, twitter in authors_data:
        existing = await db["authors"].find_one({"name": name})
        if existing:
            auth_id = str(existing["_id"])
            author_map[name] = auth_id
            print(f"  = {name} (already exists)")
        else:
            auth_id = str(uuid4())
            await db["authors"].insert_one({
                "_id": auth_id,
                "id": auth_id,
                "name": name,
                "bio": bio,
                "avatar_url": avatar,
                "twitter": twitter,
                "created_at": NOW
            })
            author_map[name] = auth_id
            print(f"  + {name}")

    # 4. Articles
    print("\n[Articles]")
    counts = {"created": 0, "skipped": 0}
    for art in ARTICLES:
        slug = art["title"].lower() \
            .replace(":", "").replace(",", "").replace("'", "") \
            .replace("--", "-").replace("  ", " ").replace(" ", "-") \
            .strip("-")
        slug = "".join(c for c in slug if c.isalnum() or c == "-")

        existing = await db["articles"].find_one({"slug": slug})
        if existing:
            counts["skipped"] += 1
            print(f"  = {slug[:50]}... (already exists)")
            continue

        cat_name = art.pop("category")
        content = art.pop("content")
        art_id = str(uuid4())

        author_name = art.get("author")
        auth_id = author_map.get(author_name)

        doc = {
            "_id": art_id, "id": art_id,
            "slug": slug,
            "category_id": category_map.get(cat_name),
            "author_id": auth_id,
            **art,
            "status": "published",
            "language": "en",
            "last_updated": NOW,
            "created_at": NOW,
        }
        await db["articles"].insert_one(doc)

        await db["article_content"].insert_one({
            "article_id": art_id,
            **content,
        })
        counts["created"] += 1
        print(f"  + {art['title'][:60]}...")

    print(f"\n  Created {counts['created']} articles, skipped {counts['skipped']}")

    print("\nDone seeding!")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_db())
