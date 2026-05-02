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
        <div className="mb-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full scale-150 animate-pulse" />
          <WifiOff className="h-20 w-20 mx-auto text-blue-500/40 relative z-10" />
          <span className="text-[96px] sm:text-[140px] font-black text-foreground/[0.03] tracking-tighter leading-none block mt-[-40px] relative z-0">404</span>
        </div>
        <div className="space-y-3">
          <span className="text-xs font-medium text-blue-500">404</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground mb-10 leading-relaxed max-w-[320px] mx-auto">
            The page you're looking for has moved or doesn't exist.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center h-11 px-6 gap-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors active:scale-95 mt-8 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
