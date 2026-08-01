import Navbar from '../components/Navbar';
import Footer from '@/components/Footer';
import { ArrowUpRight, Instagram, Facebook, Github } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { BRAND } from '@/lib/brand';

const CHANNELS = [
  {
    icon: Instagram,
    name: 'Instagram',
    handle: BRAND.instagramHandle,
    description: 'DMs open — story tips, corrections, collabs.',
    href: BRAND.instagramUrl,
  },
  {
    icon: Facebook,
    name: 'Facebook',
    handle: BRAND.facebookHandle,
    description: 'Follow the page and message us there.',
    href: BRAND.facebookUrl,
  },
  {
    icon: Github,
    name: 'GitHub',
    handle: 'hameedsk381/openvaartha-api',
    description: 'The platform is open source — file issues and contribute.',
    href: 'https://github.com/hameedsk381/openvaartha-api',
  },
];

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-2xl mx-auto">
          <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-[hsl(var(--surface))]">
            <span className="overline text-primary">Say hello</span>
            <h1 className="poster text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] mt-2">
              Contact us
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              Story tips, corrections, feedback, or you just want to build with us —
              every channel below reaches a real person.
            </p>
          </header>

          <section className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {CHANNELS.map(({ icon: Icon, name, handle, description, href }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sticker sticker-hover p-5 sm:p-6 block group"
                >
                  <Icon className="h-6 w-6 text-primary mb-4" />
                  <h2 className="font-display text-lg font-bold flex items-center gap-1.5">
                    {name}
                    <AnimatedIcon animationType="arrowUpRight">
                      <ArrowUpRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </AnimatedIcon>
                  </h2>
                  <p className="text-sm font-semibold text-primary mt-0.5 break-all">{handle}</p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
                </a>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-border">
              <p className="font-serif italic text-sm text-muted-foreground leading-relaxed">
                Corrections policy: if we got something wrong, tell us on any channel above —
                we fix errors visibly and note the update on the article.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
