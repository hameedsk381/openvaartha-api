import { Instagram, ArrowUpRight, Heart, MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { InstagramEmbed } from 'react-social-media-embed';
import { useState, useEffect } from 'react';
import { articles } from '../data/mockArticles';
import { getArticleImage, handleImageFallback } from '../lib/utils';

const InstagramFeed = () => {
    const [stats, setStats] = useState({
        followers: "20.6k",
        posts: "492",
        isLive: false
    });

    useEffect(() => {
        const fetchInstagramData = async () => {
            const token = import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
            
            if (token) {
                // Official Meta Graph API
                try {
                    const response = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count,followers_count&access_token=${token}`);
                    const data = await response.json();
                    
                    if (data.followers_count !== undefined) {
                        const count = data.followers_count;
                        const formatted = count > 1000 ? (count / 1000).toFixed(1) + 'k' : count.toString();
                        setStats(prev => ({ 
                            ...prev, 
                            followers: formatted, 
                            posts: data.media_count.toString(),
                            isLive: true 
                        }));
                        return; // Exit if successful
                    }
                } catch (err) {
                    console.warn("Meta API failed, falling back to proxy.");
                }
            }

            // Fallback: Proxy Scraper (Current implementation)
            try {
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://www.instagram.com/openvaartha/')}`);
                const data = await response.json();
                
                if (data.contents) {
                    const followerMatch = data.contents.match(/"edge_followed_by":\{"count":(\d+)\}/);
                    const postMatch = data.contents.match(/"edge_owner_to_timeline_media":\{"count":(\d+)\}/);
                    
                    if (followerMatch && followerMatch[1]) {
                        const count = parseInt(followerMatch[1]);
                        const formatted = count > 1000 ? (count / 1000).toFixed(1) + 'k' : count.toString();
                        setStats(prev => ({ ...prev, followers: formatted, isLive: true }));
                    }
                    if (postMatch && postMatch[1]) {
                        setStats(prev => ({ ...prev, posts: postMatch[1] }));
                    }
                }
            } catch (err) {
                console.log("All sync methods failed, using cached data.");
            }
        };

        fetchInstagramData();
    }, []);

    // Mock data for the social snapshots
    const posts = [
        { id: 1, image: getArticleImage(articles[0]?.thumbnail), likes: "1.2k" },
        { id: 2, image: getArticleImage(articles[1]?.thumbnail), likes: "850" },
        { id: 3, image: getArticleImage(articles[2]?.thumbnail), likes: "2.4k" },
        { id: 4, image: getArticleImage(articles[3]?.thumbnail), likes: "1.1k" },
        { id: 5, image: getArticleImage(articles[4]?.thumbnail), likes: "920" },
        { id: 6, image: getArticleImage(articles[5]?.thumbnail), likes: "3.1k" },
    ];

    return (
        <section className="social-feed-section border-t border-black/5 py-10 dark:border-white/5 sm:py-12">
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
                
                {/* Profile Info - 4 columns */}
                <div className="space-y-6 lg:col-span-4 lg:space-y-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E1306C]/10 text-[#E1306C] text-[10px] font-black uppercase tracking-[0.3em]">
                            <Instagram className="h-3.5 w-3.5" />
                            Live Social Desk
                        </div>
                        <h2 className="text-3xl font-black leading-[1.02] tracking-tighter text-foreground sm:text-4xl">
                            Connecting through <br /><span className="text-[#E1306C]">@openvaartha</span>
                        </h2>
                        <p className="max-w-md text-sm font-bold leading-relaxed text-muted-foreground lg:max-w-xs">
                            Get behind-the-scenes reporting, quick infographics, and real-time community updates directly on our Instagram feed.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-8">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xl font-black tracking-tighter text-foreground tabular-nums sm:text-2xl">{stats.followers}</span>
                                {stats.isLive && <RefreshCw className="h-3 w-3 text-primary animate-[spin_4s_linear_infinite]" />}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Followers</span>
                            {stats.isLive && <span className="text-[6px] font-black text-primary uppercase tracking-[0.2em] -mt-1 scale-90 -translate-x-1">Live Sync</span>}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter text-foreground tabular-nums sm:text-2xl">{stats.posts}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Dispatches</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter text-foreground tabular-nums sm:text-2xl">500k+</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Monthly Reach</span>
                        </div>
                    </div>

                    <div className="max-w-full overflow-hidden rounded-2xl border border-black/5 glass shadow-glass-sm dark:border-white/5 sm:max-w-[328px]">
                        <InstagramEmbed url="https://www.instagram.com/openvaartha/" width="100%" />
                    </div>

                    <a 
                        href="https://www.instagram.com/openvaartha/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block w-full sm:w-auto"
                    >
                        <Button className="h-11 w-full rounded-xl bg-[#E1306C] px-6 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] hover:bg-[#C13584] active:scale-95 sm:h-12 sm:w-auto sm:px-8 sm:text-xs gap-2">
                            FOLLOW ON INSTAGRAM <ArrowUpRight className="h-4 w-4" />
                        </Button>
                    </a>
                </div>

                {/* Simulated Feed Grid - 8 columns */}
                <div className="lg:col-span-8">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                        {posts.map((post) => (
                            <a 
                                key={post.id}
                                href="https://www.instagram.com/openvaartha/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative aspect-square overflow-hidden rounded-xl border-transparent glass transition-all duration-500 hover:border-[#E1306C]/30 sm:rounded-2xl"
                            >
                                <img 
                                    src={post.image} 
                                    alt="" 
                                    className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-2 opacity-90 group-hover:opacity-100"
                                    loading="lazy"
                                    onError={handleImageFallback}
                                />
                                
                                {/* Overlay on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#E1306C]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                                    <div className="flex items-center gap-1.5 font-black text-sm">
                                        <Heart className="h-4 w-4 fill-current" /> {post.likes}
                                    </div>
                                    <div className="flex items-center gap-1.5 font-black text-sm">
                                        <MessageCircle className="h-4 w-4 fill-current" />
                                    </div>
                                </div>

                                {/* Sparkle Effect */}
                                <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-50 group-hover:scale-100">
                                    <Instagram className="h-3 w-3 text-white" />
                                </div>
                            </a>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default InstagramFeed;
