import React from "react";
import { HomepageConfig } from "@/lib/homepage/types";
import Hero from "./Hero";
import CategoryGrid from "./CategoryGrid";
import SectionGrid from "./SectionGrid";
import PromoBanner from "./PromoBanner";
import SaleStrip from "@/components/sections/SaleStrip";
import TrustStrip from "@/components/common/TrustStrip";

const canonicalOrder = [
  {
    key: "featured",
    match: (section: any) =>
      section.source_meta?.automatic_type === "featured" ||
      section.title?.toLowerCase().includes("featured"),
  },
  {
    key: "best_selling",
    match: (section: any) =>
      section.source_meta?.automatic_type === "best_selling" ||
      section.title?.toLowerCase().includes("best"),
  },
  {
    key: "new_launch",
    match: (section: any) =>
      section.source_meta?.automatic_type === "new_launch" ||
      section.title?.toLowerCase().includes("new launch"),
  },
  {
    key: "new_arrivals",
    match: (section: any) =>
      section.source_meta?.automatic_type === "newest" ||
      section.title?.toLowerCase().includes("new"),
  },
  {
    key: "seasonal",
    match: (section: any) =>
      section.title?.toLowerCase().includes("season"),
  },
  {
    key: "festive",
    match: (section: any) =>
      section.title?.toLowerCase().includes("festive"),
  },
];

export default function PageWrapper({ config }: { config: HomepageConfig }) {
  const { hero, categories, sections, banners, settings, saleStrip } = config;

  const consumed = new Set<string>();
  const orderedSections = canonicalOrder
    .map((entry) => {
      const match = sections.find(
        (section) => !consumed.has(section.id) && entry.match(section),
      );
      if (match) {
        consumed.add(match.id);
        return match;
      }
      return null;
    })
    .filter(Boolean) as typeof sections;

  const remainingSections = sections.filter((section) => !consumed.has(section.id));
  const finalSections = [...orderedSections, ...remainingSections];

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: settings?.bg_color || "white" }}
    >
      {saleStrip && saleStrip.visible && saleStrip.status === 'published' && saleStrip.sale_text && (
        <SaleStrip text={saleStrip.sale_text} products={saleStrip.products} />
      )}

      <Hero slides={hero} settings={settings} />

      <div
        style={{
          paddingLeft: settings?.page_padding || 0,
          paddingRight: settings?.page_padding || 0,
        }}
        className="mt-0 pt-0"
      >
        <CategoryGrid categories={categories} />

        {finalSections.map((section) => (
          <SectionGrid key={section.id} section={section} />
        ))}

        {banners.map((banner) => (
          <PromoBanner key={banner.id} banner={banner} />
        ))}
      </div>

      {/* Trust Strip - Above Footer */}
      <TrustStrip />
    </main>
  );
}
