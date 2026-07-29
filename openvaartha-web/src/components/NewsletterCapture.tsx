import { useState } from "react";
import { Mail, CheckCircle, ArrowRight } from "lucide-react";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NewsletterCaptureProps {
  className?: string;
  variant?: "inline" | "footer";
}

export default function NewsletterCapture({ className, variant = "inline" }: NewsletterCaptureProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await apiFetch("/newsletter/subscribe", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
      toast.success("You're in! Thanks for subscribing.");
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to subscribe. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 bg-zinc-900/5 dark:bg-zinc-100/5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-3", className)}>
        <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
        <h3 className="text-xl font-bold tracking-tight">You're subscribed!</h3>
        <p className="text-sm text-muted-foreground">Keep an eye on your inbox for our next issue.</p>
      </div>
    );
  }

  const isFooter = variant === "footer";

  return (
    <div className={cn(
      "flex flex-col overflow-hidden rounded-2xl",
      isFooter 
        ? "bg-transparent" 
        : "bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 p-8 shadow-2xl relative",
      className
    )}>
      {/* Decorative gradient blob for inline variant */}
      {!isFooter && (
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      )}
      
      <div className="relative z-10 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-2">
            <Mail className={cn("h-5 w-5", isFooter ? "text-muted-foreground" : "text-primary")} />
            <span className={cn("text-xs font-bold uppercase tracking-wider", isFooter ? "text-muted-foreground" : "text-primary")}>Newsletter</span>
          </div>
          <h3 className={cn("font-bold tracking-tight", isFooter ? "text-lg" : "text-2xl text-white")}>
            The news, unfiltered.
          </h3>
          <p className={cn("text-sm", isFooter ? "text-muted-foreground" : "text-zinc-400")}>
            Get our best independent journalism sent straight to your inbox. No spam, ever.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cn(
              "flex-1",
              !isFooter && "bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary/50"
            )}
            disabled={loading}
          />
          <Button type="submit" disabled={loading} size={isFooter ? "icon" : "default"} className={cn(!isFooter && "bg-white text-black hover:bg-zinc-200")}>
            {loading ? <LoaderCircle animate className="h-4 w-4" /> : isFooter ? <ArrowRight className="h-4 w-4" /> : "Subscribe"}
          </Button>
        </form>
      </div>
    </div>
  );
}
