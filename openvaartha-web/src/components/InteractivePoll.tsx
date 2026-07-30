import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BarChart3, CheckCircle2 } from "lucide-react";

interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId: string | null;
}

export function InteractivePoll({ pollId }: { pollId: string }) {
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const { data: poll, isLoading, error } = useQuery<Poll>({
    queryKey: ["poll", pollId],
    queryFn: () => apiFetch(`/polls/${pollId}`),
    retry: (failureCount, error: any) => {
      // Don't retry if the poll was not found
      if (error?.message?.includes("404") || error?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const voteMutation = useMutation({
    mutationFn: (optionId: string) =>
      apiFetch(`/polls/${pollId}/vote`, {
        method: "POST",
        body: JSON.stringify({ optionId }),
      }),
    onSuccess: (updatedPoll) => {
      queryClient.setQueryData(["poll", pollId], updatedPoll);
      toast.success("Vote recorded!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit vote. Are you logged in?");
    },
  });

  if (isLoading) {
    return (
      <div className="w-full h-48 rounded-xl border border-border bg-[hsl(var(--surface))] animate-pulse p-6 flex flex-col justify-center">
        <div className="h-6 w-3/4 bg-secondary rounded mb-6"></div>
        <div className="h-10 w-full bg-secondary rounded mb-3"></div>
        <div className="h-10 w-full bg-secondary rounded"></div>
      </div>
    );
  }

  if (error || !poll) {
    return null; // Fail silently so it doesn't break the article
  }

  const hasVoted = !!poll.userVotedOptionId;

  return (
    <div className="w-full my-10 rounded-2xl border-2 border-border bg-[hsl(var(--surface))] p-6 sm:p-8 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute -top-10 -right-10 text-primary/5 pointer-events-none">
        <BarChart3 className="w-40 h-40" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="chip-primary">Reader Poll</span>
        </div>
        
        <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-6">
          {poll.question}
        </h3>

        <div className="space-y-3">
          {poll.options.map((option) => {
            const isWinner = hasVoted && option.percentage === Math.max(...poll.options.map(o => o.percentage));
            const isSelected = selectedOption === option.id;
            const isVoted = poll.userVotedOptionId === option.id;

            return (
              <div key={option.id} className="relative">
                {hasVoted ? (
                  /* Post-vote Result Bar */
                  <div className="relative h-12 w-full rounded-lg bg-secondary/50 overflow-hidden flex items-center px-4 border border-transparent">
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out",
                        isVoted ? "bg-primary/20" : "bg-primary/10"
                      )}
                      style={{ width: `${option.percentage}%` }}
                    />
                    <div className="relative z-10 flex justify-between w-full items-center">
                      <span className={cn(
                        "font-medium text-sm sm:text-base flex items-center gap-2",
                        isVoted ? "font-bold text-foreground" : "text-muted-foreground"
                      )}>
                        {option.text}
                        {isVoted && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </span>
                      <span className={cn(
                        "font-bold text-sm sm:text-base",
                        isVoted ? "text-primary" : "text-muted-foreground"
                      )}>
                        {option.percentage}%
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Pre-vote Interactive Radio */
                  <button
                    onClick={() => setSelectedOption(option.id)}
                    disabled={voteMutation.isPending}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-[hsl(var(--surface))]"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                      isSelected ? "border-primary" : "border-muted-foreground"
                    )}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <span className="font-medium text-foreground">{option.text}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!hasVoted && (
          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {poll.totalVotes.toLocaleString()} votes
            </span>
            <button
              onClick={() => {
                if (selectedOption) {
                  voteMutation.mutate(selectedOption);
                }
              }}
              disabled={!selectedOption || voteMutation.isPending}
              className="px-6 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {voteMutation.isPending ? "Submitting..." : "Vote"}
            </button>
          </div>
        )}

        {hasVoted && (
          <div className="mt-6">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {poll.totalVotes.toLocaleString()} total votes
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
