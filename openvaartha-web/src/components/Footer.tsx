import { Link, useNavigate } from "react-router-dom";
import { useCategories } from "@/lib/api-hooks";
import { BRAND } from "@/lib/brand";
import { Instagram, Facebook, Youtube } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import NewsletterCapture from "@/components/NewsletterCapture";

const Footer = () => {
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const categoryNames = categories.map((c) => c.name);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-[hsl(var(--surface))]">
      <div className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
          <div className="md:col-span-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 flex items-center justify-center shrink-0">
                <img src={BRAND.iconMaroonPath} alt="Open Vaartha" className="h-full w-full object-contain dark:hidden" />
                <img src={BRAND.iconWhitePath} alt="Open Vaartha" className="h-full w-full object-contain hidden dark:block" />
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold tracking-tight">
                  Open<span className="text-primary">vaartha</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs">
                  {BRAND.tagline}
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <a
                    href={BRAND.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors press"
                    aria-label="Instagram"
                  >
                    <AnimatedIcon animationType="bounce">
                      <Instagram className="h-4 w-4" />
                    </AnimatedIcon>
                  </a>
                  <a
                    href={BRAND.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors press"
                    aria-label="Facebook"
                  >
                    <AnimatedIcon animationType="bounce">
                      <Facebook className="h-4 w-4" />
                    </AnimatedIcon>
                  </a>
                  <a
                    href={BRAND.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors press"
                    aria-label="YouTube"
                  >
                    <AnimatedIcon animationType="bounce">
                      <Youtube className="h-4 w-4" />
                    </AnimatedIcon>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
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
              <li><Link to="/bytes" className="text-muted-foreground hover:text-primary transition-colors">Bytes</Link></li>
              <li><Link to="/explainers" className="text-muted-foreground hover:text-primary transition-colors">Explainers</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="overline mb-4">Account & Trust</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">Sign in</Link></li>
              <li><Link to="/portal/saved" className="text-muted-foreground hover:text-primary transition-colors">Saved</Link></li>
              <li><Link to="/editorial" className="text-muted-foreground hover:text-primary transition-colors">Editorial</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <NewsletterCapture variant="footer" className="p-0 border-0" />
          </div>
        </div>

        <div className="divider pt-5 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-xs text-muted-foreground">
          <span className="font-serif italic">
            &copy; {year} {BRAND.name} &mdash; built by {BRAND.copyright}
          </span>
          <div className="flex gap-5">
            <Link to="/about" className="hover:text-primary transition-colors font-medium">About</Link>
            <Link to="/contact" className="hover:text-primary transition-colors font-medium">Contact</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors font-medium">Privacy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors font-medium">Terms</Link>
            <a
              href="https://fossap.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors font-medium"
            >
              FOSS Andhra
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;