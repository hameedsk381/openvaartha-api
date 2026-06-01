import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, AlertCircle, FileText, Type } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [mode, setMode] = useState("topic");
  const [topic, setTopic] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [style, setStyle] = useState("standard");
  const [tone, setTone] = useState("neutral");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<AIResult>("/admin/ai/generate-article", {
        method: "POST",
        body: JSON.stringify({
          topic,
          source_content: mode === "content" ? sourceContent : null,
          style,
          tone,
        }),
      }),
    onSuccess: (data) => {
      onApply(data);
      setOpen(false);
      setTopic("");
      setSourceContent("");
      toast.success("Article draft generated");
    },
    onError: (err: Error) => toast.error(err.message || "Generation failed"),
  });

  const canGenerate = mode === "topic" ? topic.trim() : topic.trim() && sourceContent.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI Generate</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Article Generator
          </DialogTitle>
          <DialogDescription>
            Generate a complete article draft. Review and edit before publishing.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode} className="py-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="topic" className="gap-2"><Type className="h-4 w-4" /> From Topic</TabsTrigger>
            <TabsTrigger value="content" className="gap-2"><FileText className="h-4 w-4" /> From Content</TabsTrigger>
          </TabsList>

          <TabsContent value="topic" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Topic or headline</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Andhra Pradesh Budget 2026 highlights"
                disabled={mutation.isPending}
              />
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Topic / Headline</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Kerala Flood Relief Update"
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Source content</Label>
              <Textarea
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                placeholder="Paste press releases, notes, quotes, URLs, or any reference material here. The AI will extract facts and write the article based on this content."
                className="min-h-[180px]"
                disabled={mutation.isPending}
              />
            </div>
          </TabsContent>
        </Tabs>

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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={!canGenerate || mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {mutation.isPending ? "Generating..." : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
