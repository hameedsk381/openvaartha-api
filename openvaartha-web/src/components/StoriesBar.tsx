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
};

const categoryGradients: Record<string, string> = {
  politics: "from-[#550000] to-rose-700",
  tech: "from-[#4a5568] to-slate-400",
  business: "from-[#6b705c] to-stone-400",
  cinema: "from-[#cb997e] to-orange-200",
  "local news": "from-[#bc6c25] to-amber-500",
  sports: "from-[#ddb892] to-yellow-100",
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
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-muted">
                    {byte.imageUrl ? (
                      <img src={byte.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon className="w-6 h-6 text-muted-foreground opacity-80" />
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
