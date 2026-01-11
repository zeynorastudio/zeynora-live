import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zeynora.com";

interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const entries: SitemapEntry[] = [];

    // Add static pages
    entries.push(
      { url: SITE_URL, changeFrequency: "daily", priority: 1.0 },
      { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
      { url: `${SITE_URL}/collections`, changeFrequency: "daily", priority: 0.8 },
      { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    );

    // Fetch all active products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("active", true)
      .order("updated_at", { ascending: false });

    if (!productsError && products) {
      const typedProducts = products as Array<{ slug: string; updated_at: string }>;
      for (const product of typedProducts) {
        entries.push({
          url: `${SITE_URL}/product/${product.slug}`,
          lastModified: product.updated_at,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }

    // Fetch all categories
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("slug, updated_at");

    if (!categoriesError && categories) {
      const typedCategories = categories as Array<{ slug: string; updated_at?: string }>;
      for (const category of typedCategories) {
        entries.push({
          url: `${SITE_URL}/collections/${category.slug}`,
          lastModified: category.updated_at,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }

    // Generate XML
    const xml = generateSitemapXml(entries);

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("[SITEMAP] Error generating sitemap:", error);
    
    // Return minimal sitemap on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new NextResponse(fallbackXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    });
  }
}

function generateSitemapXml(entries: SitemapEntry[]): string {
  const urlElements = entries.map((entry) => {
    const parts = [`    <loc>${escapeXml(entry.url)}</loc>`];
    
    if (entry.lastModified) {
      const date = new Date(entry.lastModified).toISOString().split("T")[0];
      parts.push(`    <lastmod>${date}</lastmod>`);
    }
    
    if (entry.changeFrequency) {
      parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
    }
    
    if (entry.priority !== undefined) {
      parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    }
    
    return `  <url>\n${parts.join("\n")}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements.join("\n")}
</urlset>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
