import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { BRAND } from "@/lib/brand";

const SEEN_KEY = "signup_prompt_seen";
// Fires once per browser, ever — after real engagement (scroll or a dwell
// timer), never while the reader is mid-scroll on their very first screen.
const SCROLL_THRESHOLD_PX = 400;
const DWELL_MS = 15_000;

export default function SignupPrompt() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isAuthed = !!localStorage.getItem("token");
    const alreadySeen = !!localStorage.getItem(SEEN_KEY);
    if (isAuthed || alreadySeen) return;

    let fired = false;
    const trigger = () => {
      if (fired) return;
      fired = true;
      localStorage.setItem(SEEN_KEY, "1");
      setOpen(true);
      cleanup();
    };

    const onScroll = () => {
      if (window.scrollY > SCROLL_THRESHOLD_PX) trigger();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    const timer = setTimeout(trigger, DWELL_MS);

    function cleanup() {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    }

    return cleanup;
  }, []);

  const goToRegister = () => {
    setOpen(false);
    navigate("/login?mode=register");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader className="items-center text-center">
          <div className="h-12 w-12 rounded-full gradient-maroon flex items-center justify-center mb-2">
            <Sparkles className="h-5 w-5 text-white" animate loop />
          </div>
          <DialogTitle className="font-serif text-xl">You're reading freely — as it should be.</DialogTitle>
          <DialogDescription className="font-serif italic">
            Create a free {BRAND.name} account to save stories, follow sections, and get the morning briefing. No paywall, ever.
          </DialogDescription>
        </DialogHeader>

        <button
          onClick={goToRegister}
          className="w-full h-11 rounded-md bg-primary text-white text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors press"
        >
          Create free account
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors press"
        >
          Maybe later
        </button>
      </DialogContent>
    </Dialog>
  );
}
