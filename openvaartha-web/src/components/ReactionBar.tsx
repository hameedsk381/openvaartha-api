import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ReactionData {
  counts: Record<string, number>;
  total: number;
  user_reactions: string[];
}

const EMOJI_MAP: { type: string; label: string; emoji: string }[] = [
  { type: "fire", label: "Hot", emoji: "🔥" },
  { type: "applause", label: "Bravo", emoji: "👏" },
  { type: "idea", label: "Insightful", emoji: "💡" },
  { type: "sad", label: "Sad", emoji: "😢" },
  { type: "mindblown", label: "Mindblown", emoji: "🤯" },
];

interface Props {
  articleId: string;
}

export default function ReactionBar({ articleId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["article", articleId, "reactions"];

  const { data, isLoading } = useQuery<ReactionData>({
    queryKey,
    queryFn: () => apiFetch<ReactionData>(`/articles/${articleId}/reactions`),
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: (reaction_type: string) =>
      apiFetch<ReactionData & { added: boolean }>(`/articles/${articleId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ reaction_type }),
      }),
    onMutate: async (reaction_type) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ReactionData>(queryKey);

      if (previous) {
        const isUserReacted = previous.user_reactions.includes(reaction_type);
        const newCounts = { ...previous.counts };
        let newUserReactions = [...previous.user_reactions];

        if (isUserReacted) {
          newCounts[reaction_type] = Math.max(0, (newCounts[reaction_type] || 1) - 1);
          newUserReactions = newUserReactions.filter((r) => r !== reaction_type);
        } else {
          newCounts[reaction_type] = (newCounts[reaction_type] || 0) + 1;
          newUserReactions.push(reaction_type);
        }

        queryClient.setQueryData<ReactionData>(queryKey, {
          counts: newCounts,
          total: Object.values(newCounts).reduce((a, b) => a + b, 0),
          user_reactions: newUserReactions,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const counts = data?.counts || {};
  const userReactions = data?.user_reactions || [];
  const total = data?.total || 0;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 backdrop-blur my-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span>What do you think?</span>
          <span className="text-xs font-normal text-muted-foreground">({total} reactions)</span>
        </h4>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        {EMOJI_MAP.map(({ type, label, emoji }) => {
          const count = counts[type] || 0;
          const isActive = userReactions.includes(type);

          return (
            <button
              key={type}
              type="button"
              onClick={() => mutation.mutate(type)}
              disabled={mutation.isPending}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 select-none",
                "hover:scale-105 active:scale-95 hover:shadow-sm",
                isActive
                  ? "bg-primary/10 border-primary text-primary font-semibold shadow-xs"
                  : "bg-muted/40 border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              title={label}
            >
              <span className="text-base leading-none">{emoji}</span>
              <span>{label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
