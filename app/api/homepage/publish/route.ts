import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { createAudit } from "@/lib/audit/log";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const supabase = createServiceRoleClient();
    const actorId = session.user.id;

    // 1. Fetch all DRAFT data
    const [draftHeroResult, draftCatsResult, draftSectionsResult, draftBannersResult, draftSettingsResult] = await Promise.all([
      supabase.from("homepage_hero").select("*").eq("status", "draft"),
      supabase.from("homepage_categories").select("*").eq("status", "draft"),
      supabase.from("homepage_sections").select("*, homepage_section_products(*)").eq("status", "draft"),
      supabase.from("homepage_banners").select("*").eq("status", "draft"),
      supabase.from("homepage_settings").select("*").limit(1).maybeSingle(),
    ]);

    // Validate responses
    if (draftHeroResult.error) {
      return NextResponse.json({ error: `Failed to fetch hero: ${draftHeroResult.error.message}` }, { status: 500 });
    }
    if (draftCatsResult.error) {
      return NextResponse.json({ error: `Failed to fetch categories: ${draftCatsResult.error.message}` }, { status: 500 });
    }
    if (draftSectionsResult.error) {
      return NextResponse.json({ error: `Failed to fetch sections: ${draftSectionsResult.error.message}` }, { status: 500 });
    }
    if (draftBannersResult.error) {
      return NextResponse.json({ error: `Failed to fetch banners: ${draftBannersResult.error.message}` }, { status: 500 });
    }

    const typedDraftHero = (draftHeroResult.data || []) as Array<Record<string, any>>;
    const typedDraftCats = (draftCatsResult.data || []) as Array<Record<string, any>>;
    const typedDraftBanners = (draftBannersResult.data || []) as Array<Record<string, any>>;
    const typedDraftSections = (draftSectionsResult.data || []) as Array<{
      id: string;
      homepage_section_products?: Array<{
        id: string;
        section_id: string;
        product_id: string;
        order_index: number;
      }>;
      [key: string]: any;
    }>;

    // Validate required fields
    for (const hero of typedDraftHero) {
      if (!hero.desktop_image) {
        return NextResponse.json({ error: `Hero slide missing required desktop_image field` }, { status: 400 });
      }
    }

    // Validate that all referenced products exist
    const allProductIds = typedDraftSections.flatMap((section) => 
      (section.homepage_section_products || []).map((sp) => sp.product_id)
    ).filter(Boolean);

    if (allProductIds.length > 0) {
      const uniqueProductIds = [...new Set(allProductIds)];
      const { data: existingProducts, error: productsCheckError } = await supabase
        .from("products")
        .select("uid")
        .in("uid", uniqueProductIds);

      if (productsCheckError) {
        return NextResponse.json({ 
          error: `Failed to validate products: ${productsCheckError.message}` 
        }, { status: 500 });
      }

      const existingProductUids = new Set(
        ((existingProducts || []) as Array<{ uid: string }>).map((p) => p.uid)
      );
      const missingProducts = uniqueProductIds.filter((uid) => !existingProductUids.has(uid));

      if (missingProducts.length > 0) {
        return NextResponse.json({
          error: "Cannot publish: Some referenced products do not exist",
          details: { missing_product_uids: missingProducts },
        }, { status: 400 });
      }
    }

    // Validate that all referenced categories exist
    const allCategoryIds = typedDraftCats
      .map((cat) => cat.category_id)
      .filter(Boolean);

    if (allCategoryIds.length > 0) {
      const uniqueCategoryIds = [...new Set(allCategoryIds)];
      const { data: existingCategories, error: categoriesCheckError } = await supabase
        .from("categories")
        .select("id")
        .in("id", uniqueCategoryIds);

      if (categoriesCheckError) {
        return NextResponse.json({ 
          error: `Failed to validate categories: ${categoriesCheckError.message}` 
        }, { status: 500 });
      }

      const existingCategoryIds = new Set(
        ((existingCategories || []) as Array<{ id: string }>).map((c) => c.id)
      );
      const missingCategories = uniqueCategoryIds.filter((id) => !existingCategoryIds.has(id));

      if (missingCategories.length > 0) {
        return NextResponse.json({
          error: "Cannot publish: Some referenced categories do not exist",
          details: { missing_category_ids: missingCategories },
        }, { status: 400 });
      }
    }

    // 2. Fetch existing published SYSTEM sections (hero and categories) to preserve them
    // These are immutable and must not be deleted if no draft versions exist
    const [existingPublishedHeroResult, existingPublishedCatsResult] = await Promise.all([
      supabase.from("homepage_hero").select("*").eq("status", "published"),
      supabase.from("homepage_categories").select("*").eq("status", "published"),
    ]);

    if (existingPublishedHeroResult.error) {
      return NextResponse.json({ error: `Failed to fetch published hero: ${existingPublishedHeroResult.error.message}` }, { status: 500 });
    }
    if (existingPublishedCatsResult.error) {
      return NextResponse.json({ error: `Failed to fetch published categories: ${existingPublishedCatsResult.error.message}` }, { status: 500 });
    }

    const existingPublishedHero = (existingPublishedHeroResult.data || []) as Array<Record<string, any>>;
    const existingPublishedCats = (existingPublishedCatsResult.data || []) as Array<Record<string, any>>;

    // 3. NON-DESTRUCTIVE MERGE: Only update blocks that have drafts, preserve all others

    // Safety checks: Ensure all draft blocks have required IDs and prevent empty publish
    const totalDrafts = typedDraftHero.length + typedDraftCats.length + typedDraftSections.length + typedDraftBanners.length;

    if (totalDrafts === 0) {
      return NextResponse.json({
        error: "Cannot publish: No draft blocks found to publish",
        details: "Create draft blocks in the homepage builder before publishing"
      }, { status: 400 });
    }

    const allDraftIds = [
      ...typedDraftHero.map(h => h.id),
      ...typedDraftCats.map(c => c.id),
      ...typedDraftSections.map(s => s.id),
      ...typedDraftBanners.map(b => b.id)
    ];

    if (allDraftIds.some(id => !id || typeof id !== 'string')) {
      return NextResponse.json({
        error: "Cannot publish: All draft blocks must have valid string IDs",
        details: { missing_ids: allDraftIds.filter(id => !id || typeof id !== 'string') }
      }, { status: 400 });
    }

    // Publish hero drafts (merge - don't delete existing published heroes)
    if (typedDraftHero.length > 0) {
      const heroIds = typedDraftHero.map((h) => h.id);
      const { error: heroError } = await supabase
        .from("homepage_hero")
        .update({ status: 'published' } as never)
        .in("id", heroIds);
      if (heroError) {
        return NextResponse.json({ error: `Failed to publish hero drafts: ${heroError.message}` }, { status: 500 });
      }
    }
    // Existing published heroes remain untouched if no drafts exist

    // Publish category drafts (merge - don't delete existing published categories)
    if (typedDraftCats.length > 0) {
      const catIds = typedDraftCats.map((c) => c.id);
      const { error: catsError } = await supabase
        .from("homepage_categories")
        .update({ status: 'published' } as never)
        .in("id", catIds);
      if (catsError) {
        return NextResponse.json({ error: `Failed to publish category drafts: ${catsError.message}` }, { status: 500 });
      }
    }
    // Existing published categories remain untouched if no drafts exist

    // Publish section drafts (merge - don't delete existing published sections)
    if (typedDraftSections.length > 0) {
      const sectionIds = typedDraftSections.map((s) => s.id);
      const { error: sectionsError } = await supabase
        .from("homepage_sections")
        .update({ status: 'published' } as never)
        .in("id", sectionIds);
      if (sectionsError) {
        return NextResponse.json({ error: `Failed to publish section drafts: ${sectionsError.message}` }, { status: 500 });
      }
    }
    // Existing published sections remain untouched if no drafts exist

    // Publish banner drafts (merge - don't delete existing published banners)
    if (typedDraftBanners.length > 0) {
      const bannerIds = typedDraftBanners.map((b) => b.id);
      const { error: bannersError } = await supabase
        .from("homepage_banners")
        .update({ status: 'published' } as never)
        .in("id", bannerIds);
      if (bannersError) {
        return NextResponse.json({ error: `Failed to publish banner drafts: ${bannersError.message}` }, { status: 500 });
      }
    }
    // Existing published banners remain untouched if no drafts exist

    await createAudit(actorId, "publish_homepage", { timestamp: new Date().toISOString() });

    // Revalidate Storefront and Admin
    revalidatePath("/", "layout");
    revalidatePath("/admin/super/homepage");

    // Return JSON success instead of redirect to avoid RSC issues
    return NextResponse.json({ success: true, message: "Homepage published successfully" }, { status: 200 });

  } catch (error) {
    console.error("Publish failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Publish failed: ${errorMessage}` }, { status: 500 });
  }
}
