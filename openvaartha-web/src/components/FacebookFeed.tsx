import { BRAND } from "@/lib/brand";
import { Facebook } from "lucide-react";

const FacebookFeed = () => {
  const pageUrl = encodeURIComponent(BRAND.facebookUrl);

  return (
    <section className="py-10 sm:py-14 border-b border-border">
      <div className="px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2 mb-6">
          <Facebook className="h-4 w-4 text-[#1877F2]" />
          <span className="overline text-[#1877F2]">Social</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight leading-[1.05]">
              Follow us on <br />
              <span className="text-[#1877F2]">Facebook</span>
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed max-w-md">
              Get the latest updates, breaking news, and exclusive content on our Facebook page.
            </p>
            <a
              href={BRAND.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center h-11 px-5 rounded-lg bg-[#1877F2] text-white text-sm font-semibold gap-2 hover:bg-[#166FE5] transition-colors press"
            >
              <Facebook className="h-4 w-4" />
              Follow on Facebook
            </a>
          </div>

          <div className="flex justify-center md:justify-end">
            <iframe
              src={`https://www.facebook.com/plugins/page.php?href=${pageUrl}&tabs=timeline&width=340&height=400&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`}
              width="340"
              height="400"
              className="max-w-full rounded-xl border border-border shadow-sm"
              style={{ border: "none", overflow: "hidden" }}
              scrolling="no"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              title="Open Vaartha Facebook Page"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FacebookFeed;