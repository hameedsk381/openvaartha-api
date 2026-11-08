import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Plus } from "@/components/animate-ui/icons/plus";
import { X } from "@/components/animate-ui/icons/x";
import { Lock } from "@/components/animate-ui/icons/lock";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Poll } from "@/lib/types";

type DraftOption = { id: string; text: string };

const emptyOptions = (): DraftOption[] => [
  { id: crypto.randomUUID(), text: "" },
  { id: crypto.randomUUID(), text: "" },
];

export default function AdminPolls() {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<DraftOption[]>(emptyOptions());

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["admin", "polls"],
    queryFn: () => apiFetch<Poll[]>("/polls/?active_only=false&limit=100"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<string>("/polls/", {
        method: "POST",
        body: JSON.stringify({
          question: question.trim(),
          options: options.filter((o) => o.text.trim()).map((o) => ({ id: o.id, text: o.text.trim() })),
        }),
      }),
    onSuccess: (pollId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "polls"] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      setQuestion("");
      setOptions(emptyOptions());
      toast.success("Poll created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<Poll>(`/polls/${id}/active`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "polls"] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      toast.success("Poll updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const validOptionCount = options.filter((o) => o.text.trim()).length;
  const canSubmit = question.trim().length > 0 && validOptionCount >= 2;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    createMutation.mutate();
  };

  const updateOption = (id: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { id: crypto.randomUUID(), text: "" }]);
  };

  const removeOption = (id: string) => {
    setOptions((prev) => (prev.length > 2 ? prev.filter((o) => o.id !== id) : prev));
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Polls
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reader polls on live issues — show up on the public Polls Hub and can be embedded in
          an article by pasting a poll's ID into its "Interactive Poll ID" field.
        </p>
      </div>

      <form onSubmit={onSubmit} className="border border-border rounded-xl p-5 space-y-4">
        <div className="space-y-2">
          <Label>Question</Label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            placeholder="e.g. Should the state increase the minimum wage this year?"
          />
        </div>
        <div className="space-y-2">
          <Label>Options (at least 2)</Label>
          <div className="space-y-2">
            {options.map((option, i) => (
              <div key={option.id} className="flex items-center gap-2">
                <Input
                  value={option.text}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => removeOption(option.id)}
                  disabled={options.length <= 2}
                  aria-label="Remove option"
                >
                  <X className="h-4 w-4" animateOnHover />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="h-4 w-4" animateOnHover /> Add option
          </Button>
        </div>
        <Button type="submit" disabled={createMutation.isPending || !canSubmit}>
          {createMutation.isPending ? <LoaderCircle className="h-4 w-4" animate /> : <Plus className="h-4 w-4" animateOnHover />}
          Create poll
        </Button>
      </form>

      <div className="border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <LoaderCircle className="h-6 w-6 text-primary" animate />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {polls.map((poll) => {
              const isMutating = toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === poll.id;
              return (
                <div key={poll.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{poll.question}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span>{poll.totalVotes.toLocaleString()} votes</span>
                      <span>·</span>
                      <span className={poll.isActive ? "text-green-600" : "text-muted-foreground"}>
                        {poll.isActive ? "Active" : "Closed"}
                      </span>
                      <span>·</span>
                      <span className="truncate">{poll.options.length} options</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-8 text-xs"
                    onClick={() => toggleActiveMutation.mutate({ id: poll.id, isActive: !poll.isActive })}
                    disabled={isMutating}
                  >
                    {isMutating ? (
                      <LoaderCircle className="h-3.5 w-3.5" animate />
                    ) : poll.isActive ? (
                      <Lock className="h-3.5 w-3.5" animateOnHover />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" animateOnHover />
                    )}
                    {poll.isActive ? "Close" : "Reopen"}
                  </Button>
                </div>
              );
            })}
            {!isLoading && polls.length === 0 && (
              <div className="p-8 text-sm text-muted-foreground text-center">No polls yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
