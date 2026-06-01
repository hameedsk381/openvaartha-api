import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/users/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }
      setSent(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors mb-12">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
          </Link>

          <div className="mb-8">
            <span className="overline text-primary">Password reset</span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mt-2 leading-tight">
              Forgot your password?
            </h1>
            <p className="font-serif italic text-sm text-muted-foreground mt-3">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div className="p-6 rounded-lg border border-border bg-[hsl(var(--surface))] text-center space-y-4">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm font-medium">Check your inbox</p>
              <p className="text-xs text-muted-foreground">
                If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
              </p>
              <Link to="/login" className="inline-block text-xs font-semibold uppercase tracking-wider text-primary hover:underline underline-offset-4">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="overline text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoComplete="email"
                    className="w-full h-12 pl-11 pr-3 bg-background border border-border rounded-md text-sm font-serif placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full h-12 rounded-md bg-primary text-white text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 press"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </button>
              <p className="text-xs text-center text-muted-foreground">
                Remember your password?{" "}
                <Link to="/login" className="text-primary hover:underline underline-offset-4 font-semibold">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
