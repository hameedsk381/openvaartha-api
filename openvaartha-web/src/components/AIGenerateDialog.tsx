import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AIResult {
  title: string;
  summary: string;
  body: string;
  tldr: string;
  points: string[];
  category_id?: string;
}

interface Props {
  onApply: (data: AIResult) => void;
}

const STYLES = [
  { value: "standard", label: "Standard" },
  { value: "briefing", label: "Briefing" },
  { value: "investigative", label: "Investigative" },
  { value: "opinion", label: "Opinion" },
];

const TONES = [
  { value: "neutral", label: "Neutral" },
  { value: "analytical", label: "Analytical" },
  { value: "narrative", label: "Narrative" },
];

export default function AIGenerateDialog({ onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("standard");
  const [tone, setTone] = useState("neutral");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<AIResult>("/admin/ai/generate-article", {
        method: "POST",
        body: JSON.stringify({ topic, style, tone }),
      }),
    onSuccess: (data) => {
      onApply(data);
      setOpen(false);
      setTopic("");
      toast.success("Article draft generated");
    },
    onError: (err: Error) => toast.error(err.message || "Generation failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI Generate</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Article Generator
          </DialogTitle>
          <DialogDescription>
            Generate a complete article draft from a topic. Review and edit before publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Topic or headline</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Andhra Pradesh Budget 2026 highlights"
              disabled={mutation.isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Style</Label>
              <Select value={style} onValueChange={setStyle} disabled={mutation.isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone} disabled={mutation.isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{(mutation.error as Error).message}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={!topic.trim() || mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {mutation.isPending ? "Generating..." : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
