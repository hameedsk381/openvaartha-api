import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, WifiOff } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: USER attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 selection:bg-blue-500 selection:text-white">
      <div className="text-center max-w-md relative z-10">
        <div className="mb-10 relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full scale-150 animate-pulse" />
          <WifiOff className="h-20 w-20 mx-auto text-blue-500/40 relative z-10" />
          <span className="text-[120px] sm:text-[160px] font-black text-foreground/[0.03] tracking-tighter leading-none block mt-[-60px] relative z-0">404</span>
        </div>
        <div className="space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-blue-500 opacity-60 ml-1">Intelligence Outage</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Briefing address unavailable</h1>
          <p className="text-sm font-bold text-muted-foreground opacity-60 mb-10 leading-relaxed tracking-tight max-w-[280px] mx-auto uppercase">
            The requested intelligence dossier has been relocated or never existed.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center h-12 px-10 gap-3 text-xs font-black uppercase tracking-[0.2em] glass bg-white/5 border-white/10 text-foreground hover:bg-foreground hover:text-background transition-all active:scale-95 shadow-glass mt-8 rounded-2xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Intelligence Feed
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
