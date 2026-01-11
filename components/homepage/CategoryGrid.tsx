import React from "react";
import Link from "next/link";
import { HomepageCategory } from "@/lib/homepage/types";
import { getPublicUrl } from "@/lib/utils/images";

const isVideoAsset = (path?: string | null) =>
  !!path && /\.(mp4|webm)$/i.test(path);

export default function CategoryGrid({ categories }: { categories: HomepageCategory[] }) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="pt-0 pb-10 md:pb-16 bg-white space-y-6 mt-0">
      {categories.map((cat) => {
        const href = cat.category?.slug ? `/collections/${cat.category.slug}` : "#";
        const title = cat.title_override || cat.category?.name || "Editorial Drop";
        const mediaUrl = getPublicUrl("banners", cat.image);
        const video = isVideoAsset(cat.image);

        return (
          <Link
            key={cat.id}
            href={href}
            className="group block relative overflow-hidden rounded-3xl border border-[#D4AF37]/20 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
          >
            <div className="relative w-full h-[360px] md:h-[480px] lg:h-[540px]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent z-10" />
              {video ? (
                <video
                  src={mediaUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              )}
            </div>
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 z-20 text-white">
              <p className="text-xs tracking-[0.5em] uppercase text-[#F5D8AA] mb-3">
                Signature Category
              </p>
              <h3 className="font-serif text-3xl md:text-5xl leading-snug drop-shadow-lg">
                {title}
              </h3>
            </div>
          </Link>
        );
      })}
    </section>
  );
}