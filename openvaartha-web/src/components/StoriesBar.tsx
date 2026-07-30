import { useState } from "react";
import { useDispatches } from "@/lib/api-hooks";
import { StoryViewerModal } from "./StoryViewerModal";
import { cn } from "@/lib/utils";
import { Landmark, Cpu, Briefcase, Film, MapPin, Trophy, Flame } from "lucide-react";

const categoryIcons: Record<string, React.ElementType> = {
  politics: Landmark,
  tech: Cpu,
  business: Briefcase,
  cinema: Film,
  "local news": MapPin,
  sports: Trophy,
  national: MapPin,
};

const categoryGradients: Record<string, string> = {
  politics: "from-[#550000] to-rose-700",
  tech: "from-[#4a5568] to-slate-400",
  business: "from-[#6b705c] to-stone-400",
  cinema: "from-[#cb997e] to-orange-200",
  "local news": "from-[#bc6c25] to-amber-500",
  sports: "from-[#ddb892] to-yellow-100",
  national: "from-[#550000] to-orange-300",
};

const categoryBackgrounds: Record<string, string> = {
  politics: "bg-[#550000]/10 dark:bg-[#550000]/30",
  tech: "bg-[#4a5568]/10 dark:bg-[#4a5568]/30",
  business: "bg-[#6b705c]/10 dark:bg-[#6b705c]/30",
  cinema: "bg-[#cb997e]/20 dark:bg-[#cb997e]/30",
  "local news": "bg-[#bc6c25]/10 dark:bg-[#bc6c25]/30",
  sports: "bg-[#ddb892]/20 dark:bg-[#ddb892]/30",
  national: "bg-[#550000]/10 dark:bg-[#550000]/30",
};

const categoryTextColors: Record<string, string> = {
  politics: "text-[#550000] dark:text-rose-400",
  tech: "text-[#4a5568] dark:text-slate-300",
  business: "text-[#6b705c] dark:text-stone-300",
  cinema: "text-[#cb997e] dark:text-orange-200",
  "local news": "text-[#bc6c25] dark:text-amber-400",
  sports: "text-[#ddb892] dark:text-yellow-200",
  national: "text-[#550000] dark:text-rose-400",
};

export function StoriesBar() {
  const { data: bytes = [], isLoading } = useDispatches(15, { todayOnly: true });
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

  if (isLoading || bytes.length === 0) return null;

  return (
    <div className="w-full bg-background border-b border-border py-4 px-4 sm:px-6">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
        {bytes.map((byte, index) => {
          const category = byte.category || "News";
          const normalized = category.toLowerCase();
          const Icon = categoryIcons[normalized] || Flame;
          const gradientClass = categoryGradients[normalized] || "from-primary to-secondary";
          const bgClass = categoryBackgrounds[normalized] || "bg-muted dark:bg-muted/30";
          const textClass = categoryTextColors[normalized] || "text-muted-foreground";
          
          return (
            <button
              key={byte.id}
              onClick={() => setActiveStoryIndex(index)}
              className="flex flex-col items-center gap-2 shrink-0 group focus:outline-none"
            >
              {/* Outer Ring */}
              <div className={cn(
                "w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2.5px] shadow-sm group-hover:scale-105 transition-transform bg-gradient-to-tr",
                gradientClass
              )}>
                {/* Inner White Border */}
                <div className="w-full h-full bg-background rounded-full p-[2.5px]">
                  {/* Content (Image or Solid Color) */}
                  <div className={cn("w-full h-full rounded-full overflow-hidden flex items-center justify-center", !byte.imageUrl && bgClass)}>
                    {byte.imageUrl ? (
                      <img src={byte.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon className={cn("w-6 h-6 opacity-80", textClass)} />
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-foreground max-w-[70px] sm:max-w-[80px] truncate text-center">
                {category}
              </span>
            </button>
          );
        })}
      </div>

      {activeStoryIndex !== null && (
        <StoryViewerModal
          bytes={bytes}
          initialIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
        />
      )}
    </div>
  );
}
