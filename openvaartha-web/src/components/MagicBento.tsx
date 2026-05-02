import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Shield, TrendingUp, Globe, Briefcase, ArrowUpRight } from 'lucide-react';
import './MagicBento.css';
import { cn, getArticleImage, handleImageFallback } from "@/lib/utils";
import { Article } from "@/data/mockArticles";

export interface BentoCardProps {
  article: Article;
  className?: string;
  label?: string;
  color?: string;
  icon?: React.ReactNode;
}

const ParticleCard: React.FC<BentoCardProps> = ({
  article,
  className,
  label,
  color = 'rgba(85, 0, 0, 0.4)',
  icon,
}) => {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const hasFeatureImage = className?.includes('md:row-span-3');

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    };

    card.addEventListener('mousemove', handleMouseMove);
    return () => card.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <Link 
      to={`/article/${article.slug}`}
      ref={cardRef}
      className={cn("bento-card group relative block h-full", className)}
      style={{ '--card-color': color } as React.CSSProperties}
    >
      {/* Background Image if exists */}
      {hasFeatureImage && (
        <div className="absolute inset-0 z-0">
          <img
            src={getArticleImage(article.thumbnail)}
            alt=""
            className="w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-700 group-hover:scale-105"
            onError={handleImageFallback}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>
      )}

      <div className="bento-card-content relative z-20 flex h-full min-h-0 flex-col justify-between">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="bento-icon p-2 rounded-xl bg-primary/10 border border-primary/10 dark:border-white/10 text-primary dark:text-white group-hover:scale-110 transition-transform duration-500">
            {icon}
          </div>
          {label && (
            <span className="max-w-[8rem] truncate rounded-full border border-current px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-foreground/60 opacity-70 dark:text-white/60 sm:tracking-[0.2em]">
              {label}
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#550000] dark:text-white/80">{article.category}</span>
            <div className="h-1 w-1 rounded-full bg-foreground/10 dark:bg-white/20" />
            <span className="text-[9px] font-bold text-muted-foreground dark:text-white/40">{article.readTime} Dispatch</span>
          </div>
          <h3 className={cn(
            "bento-title font-black leading-[1.1] tracking-tighter transition-all duration-500 group-hover:translate-x-1",
            className?.includes('md:row-span-3') ? "text-2xl md:text-3xl lg:text-4xl" : "text-lg md:text-xl",
            hasFeatureImage ? "text-white" : "text-foreground dark:text-white"
          )}>
            {article.title}
          </h3>
          <p className={cn(
            "bento-description text-xs font-medium line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-700",
            hasFeatureImage ? "text-white/70" : "text-muted-foreground dark:text-white/50"
          )}>
            {article.summary}
          </p>

        </div>
      </div>


      
      <div className="bento-glow" />
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
        <ArrowUpRight className="text-white h-6 w-6" />
      </div>
    </Link>
  );
};

interface MagicBentoProps {
  articles: Article[];
}

const MagicBento: React.FC<MagicBentoProps> = ({ articles }) => {
  if (!articles || articles.length === 0) return null;

  return (
    <section className="magic-bento-section w-full scroll-mt-40 py-8 sm:py-6">
      {/* Branding Marker */}
      <div className="mb-5 flex items-center gap-3 sm:mb-6">
        <h2 className="text-[9px] font-black uppercase tracking-[0.28em] text-primary sm:text-[10px] sm:tracking-[0.4em]">Rapid Intelligence</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>

      <div className="magic-bento-grid grid grid-cols-1 md:grid-cols-4 gap-3 auto-rows-[160px]">
        {/* Main Feature - Large */}
        {articles[0] && (
          <ParticleCard 
            article={articles[0]}
            label="MAJOR DISPATCH"
            color="hsl(355, 100%, 20%)"
            className="md:col-span-2 md:row-span-3"
            icon={<Zap size={24} />}
          />
        )}
        
        {/* Supporting 1 */}
        {articles[1] && (
          <ParticleCard 
            article={articles[1]}
            label="TRENDING"
            color="hsl(35, 100%, 40%)"
            className="md:col-span-2 md:row-span-1"
            icon={<TrendingUp size={20} />}
          />
        )}

        {/* Supporting 2 */}
        {articles[2] && (
          <ParticleCard 
            article={articles[2]}
            label="NETWORK"
            color="hsl(210, 100%, 45%)"
            className="md:col-span-1 md:row-span-2"
            icon={<Globe size={20} />}
          />
        )}

        {/* Supporting 3 */}
        {articles[3] && (
          <ParticleCard 
            article={articles[3]}
            label="SECURE"
            color="hsl(260, 100%, 35%)"
            className="md:col-span-1 md:row-span-2"
            icon={<Shield size={20} />}
          />
        )}
        
        {/* Supporting 4 */}
        {articles[4] && (
          <ParticleCard 
            article={articles[4]}
            label="MARKETS"
            color="hsl(140, 100%, 25%)"
            className="md:col-span-2 md:row-span-1"
            icon={<Briefcase size={20} />}
          />
        )}
      </div>
    </section>
  );
};

export default MagicBento;
