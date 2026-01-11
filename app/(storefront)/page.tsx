import { Metadata } from "next";
import { getHomepageConfig } from "@/lib/homepage/preview";
import PageWrapper from "@/components/homepage/PageWrapper";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Zeynora | Luxury Handcrafted Sarees & Ethnic Wear",
  description: "Discover timeless elegance reimagined for the modern world with Zeynora's exclusive collection.",
};

export default async function StorefrontPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // 1. Check for preview flag
  const resolvedParams = await searchParams;
  const isPreview = resolvedParams?.preview === '1';
  
  // 2. Fetch Config (Published or Draft)
  const config = await getHomepageConfig(isPreview);

  // DEBUG LOGGING
  console.log("--- HOMEPAGE DEBUG ---");
  console.log("Is Preview:", isPreview);
  console.log("Hero Slides:", config.hero.length);
  console.log("Hero Visibility:", config.hero.map(h => ({ id: h.id, status: h.status, visible: h.visible })));
  console.log("Categories:", config.categories.length);
  console.log("Settings:", config.settings);
  console.log("----------------------");

  // 3. Render
  return <PageWrapper config={config} />;
}
