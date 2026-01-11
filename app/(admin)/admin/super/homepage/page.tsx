import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import HeroManagerClient from "./hero/HeroManagerClient";
import CategoriesManagerClient from "./categories/CategoriesManagerClient";
import SectionsManagerClient from "./sections/SectionsManagerClient";
import BannersManagerClient from "./banners/BannersManagerClient";
import SettingsManagerClient from "./settings/SettingsManagerClient";
import SaleStripManagerClient from "./sale-strip/SaleStripManagerClient";

export const dynamic = 'force-dynamic';

export default async function HomepageBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await requireSuperAdmin();
  
  const resolvedSearchParams = await searchParams;
  const tab = typeof resolvedSearchParams.tab === 'string' ? resolvedSearchParams.tab : 'hero';

  return (
    <div className="min-h-screen bg-offwhite pb-24">
      {/* Header */}
      <div className="bg-white border-b border-silver-light sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-silver-dark hover:text-night transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
             <h1 className="serif-display text-xl text-night">Homepage Builder</h1>
             <p className="text-xs text-silver-dark">Manage storefront content</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <a 
             href="/?preview=1" 
             target="_blank" 
             className="flex items-center gap-2 px-4 py-2 border border-silver rounded text-night hover:bg-offwhite text-sm"
           >
             <ExternalLink size={14} /> Preview Draft
           </a>
           <form action="/api/homepage/publish" method="POST">
             <button 
               type="submit"
               className="px-5 py-2 bg-gold text-night font-medium rounded hover:bg-gold/90 text-sm"
             >
               Publish Changes
             </button>
           </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1 rounded-lg border border-silver-light mb-8 w-fit overflow-x-auto">
          {[
            { key: "hero", label: "Hero" },
            { key: "categories", label: "Categories" },
            { key: "sections", label: "Sections" },
            { key: "banners", label: "Banners" },
            { key: "sale-strip", label: "Sale Strip" },
            { key: "settings", label: "Settings" },
          ].map((entry) => (
            <Link
              key={entry.key}
              href={`?tab=${entry.key}`}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                tab === entry.key
                  ? "bg-night text-white"
                  : "text-silver-dark hover:text-night"
              }`}
            >
              {entry.label}
            </Link>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl border border-silver-light p-6 shadow-sm min-h-[400px]">
           {tab === 'hero' && <HeroManagerClient />}
           {tab === 'categories' && <CategoriesManagerClient />}
           {tab === 'sections' && <SectionsManagerClient />}
           {tab === 'banners' && <BannersManagerClient />}
           {tab === 'sale-strip' && <SaleStripManagerClient />}
           {tab === 'settings' && <SettingsManagerClient />}
        </div>
      </div>
    </div>
  );
}
