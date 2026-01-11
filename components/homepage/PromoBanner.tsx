import React from "react";
import Link from "next/link";
import { HomepageBanner } from "@/lib/homepage/types";
import { getPublicUrl } from "@/lib/utils/images";

export default function PromoBanner({ banner }: { banner: HomepageBanner }) {
  const desktopUrl = getPublicUrl("banners", banner.desktop_image);
  const mobileUrl = banner.mobile_image ? getPublicUrl("banners", banner.mobile_image) : null;
  const Wrapper = banner.link ? Link : "div";

  return (
    <section className="w-full py-8 md:py-12">
      <div className="container mx-auto px-4">
        <Wrapper 
          href={banner.link || "#"} 
          className="block relative w-full overflow-hidden rounded-xl group"
        >
           <picture className="w-full block">
              {mobileUrl && <source media="(max-width: 767px)" srcSet={mobileUrl} />}
              <img 
                src={desktopUrl} 
                alt={banner.title || "Promotion"} 
                className="w-full h-auto object-cover shadow-sm transition-transform duration-700 group-hover:scale-[1.01]"
              />
           </picture>
           
           {/* Optional Overlay Title */}
           {banner.title && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/5 transition-colors">
               <h2 className="sr-only">{banner.title}</h2>
             </div>
           )}
        </Wrapper>
      </div>
    </section>
  );
}




















