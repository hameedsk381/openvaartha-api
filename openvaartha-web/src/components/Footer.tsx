import { Link, useNavigate } from "react-router-dom";
import { useCategories } from "@/lib/api-hooks";
import { BRAND } from "@/lib/brand";

const Footer = () => {
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const categoryNames = categories.map((c) => c.name);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-[hsl(var(--surface))]">
      <div className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
          <div className="md:col-span-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg gradient-maroon flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-xs font-black text-white">{BRAND.monogram}</span>
              </div>
              <div>
                <div className="font-serif text-2xl font-bold tracking-tight">
                  Open<span className="text-primary">vaartha</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs">
                  {BRAND.tagline}
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="overline mb-4">Sections</p>
            <ul className="space-y-2.5">
              {categoryNames.map((c) => (
                <li key={c}>
                  <button
                    onClick={() => navigate(`/?category=${c}`)}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors press"
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="overline mb-4">Read</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/trending" className="text-muted-foreground hover:text-primary transition-colors">Trending</Link></li>
              <li><Link to="/live" className="text-muted-foreground hover:text-primary transition-colors">Live updates</Link></li>
              <li><Link to="/explainers" className="text-muted-foreground hover:text-primary transition-colors">Explainers</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="overline mb-4">Account</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">Sign in</Link></li>
              <li><Link to="/portal/saved" className="text-muted-foreground hover:text-primary transition-colors">Saved</Link></li>
              <li><Link to="/portal/dashboard" className="text-muted-foreground hover:text-primary transition-colors">Portal</Link></li>
            </ul>
          </div>
        </div>

        <div className="divider pt-5 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-xs text-muted-foreground">
          <span className="font-serif italic">
            &copy; {year} {BRAND.name} &mdash; built by {BRAND.copyright}
          </span>
          <div className="flex gap-5">
            <span className="cursor-pointer hover:text-primary transition-colors font-medium">Privacy</span>
            <span className="cursor-pointer hover:text-primary transition-colors font-medium">Terms</span>
            <span className="cursor-pointer hover:text-primary transition-colors font-medium">Ethics</span>
            <span className="cursor-pointer hover:text-primary transition-colors font-medium">Contact</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;