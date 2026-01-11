import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { processProductInput } from "@/lib/products/helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const resolvedParams = await params;
    
    // 1. Hard-validate route param
    if (!resolvedParams.uid || typeof resolvedParams.uid !== "string" || resolvedParams.uid.trim().length === 0) {
      console.error("[PRODUCT_UPDATE] Invalid UID param:", resolvedParams.uid);
      return NextResponse.json({ error: "Product UID is required" }, { status: 400 });
    }

    const productUid = resolvedParams.uid.trim();
    console.log("[PRODUCT_UPDATE] Incoming request:", { uid: productUid });

    // Auth Check
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("[PRODUCT_UPDATE] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase.from("users").select("role").eq("auth_uid", user.id).single();
    const typedUserData = userData as { role: string } | null;
    if (!typedUserData || !["admin", "super_admin"].includes(typedUserData.role || "")) {
      console.error("[PRODUCT_UPDATE] Forbidden:", { role: typedUserData?.role });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    console.log("[PRODUCT_UPDATE] Request body keys:", Object.keys(body));

    // 2. Accept ONLY valid product fields - whitelist approach
    const allowedFields = [
      "name",
      "slug",
      "description",
      "category_id",
      "active",
      "featured",
      "best_selling",
      "new_launch",
      "on_sale",
      "strike_price",
      "sort_order",
      "style",
      "occasion",
      "season",
      "price",
      "cost_price",
      "subcategory", // Can be "Name" or "Name (Category)"
      "super_category",
      "category_override", // New field for manual override
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body && body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // PHASE 1.1: Process product data using unified logic
    // Auto-derive category and generate tags on every save
    if (updateData.subcategory || body.subcategory) {
      const processed = processProductInput({
        subcategoryInput: (updateData.subcategory as string) || body.subcategory,
        categoryOverride: (updateData.category_override as string | null) || body.category_override || null,
        superCategory: (updateData.super_category as string | null) || body.super_category || null,
        occasion: (updateData.occasion as string | null) || body.occasion || null,
        style: (updateData.style as string | null) || body.style || null,
        season: (updateData.season as string | null) || body.season || null,
        is_featured: (updateData.featured as boolean) ?? body.featured ?? false,
        is_best_selling: (updateData.best_selling as boolean) ?? body.best_selling ?? false,
        is_new_launch: (updateData.new_launch as boolean) ?? body.new_launch ?? false,
      });

      // Update with processed values
      updateData.subcategory = processed.subcategory;
      updateData.super_category = processed.effectiveCategory;
      updateData.category_override = processed.categoryOverride;
      updateData.tags = processed.tags; // AUTO-GENERATED TAGS
      
      console.log("[PRODUCT_UPDATE] Auto-generated data:", {
        subcategory: processed.subcategory,
        derivedCategory: processed.derivedCategory,
        effectiveCategory: processed.effectiveCategory,
        categoryOverride: processed.categoryOverride,
        tags: processed.tags,
      });
    }

    // Explicitly remove uid - cannot be updated
    delete updateData.uid;

    // Ensure updated_at is set
    updateData.updated_at = new Date().toISOString();

    console.log("[PRODUCT_UPDATE] Filtered update payload:", {
      uid: productUid,
      updateFields: Object.keys(updateData),
      updateData
    });

    const adminClient = createServiceRoleClient();

    // 3. Before update: Fetch product by uid to verify existence
    const { data: existingProduct, error: checkError } = await adminClient
      .from("products")
      .select("uid, name, slug, active")
      .eq("uid", productUid)
      .single();

    if (checkError || !existingProduct) {
      console.error("[PRODUCT_UPDATE] Product not found:", {
        uid: productUid,
        error: checkError?.message,
        code: checkError?.code
      });
      return NextResponse.json({ 
        error: `Product with UID "${productUid}" not found` 
      }, { status: 404 });
    }

    console.log("[PRODUCT_UPDATE] Product found:", {
      uid: existingProduct.uid,
      name: existingProduct.name,
      slug: existingProduct.slug,
      active: existingProduct.active
    });

    // 4. Perform update using count: "exact"
    const { data, error, count } = await adminClient
      .from("products")
      .update(updateData as unknown as never, { count: "exact" })
      .eq("uid", productUid)
      .select();

    // 5. After update: Check for errors
    if (error) {
      console.error("[PRODUCT_UPDATE] Supabase update error:", {
        uid: productUid,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        updateFields: Object.keys(updateData)
      });
      return NextResponse.json({ 
        error: `Update failed: ${error.message}` 
      }, { status: 500 });
    }

    // 6. Enforce that at least one row was updated
    if (count === 0 || count === null) {
      console.error("[PRODUCT_UPDATE] Zero rows updated:", {
        uid: productUid,
        existingProductUid: existingProduct.uid,
        updateFields: Object.keys(updateData),
        count
      });
      return NextResponse.json({ 
        error: `No product updated. UID "${productUid}" may not match any existing product.` 
      }, { status: 404 });
    }

    if (!data || data.length === 0) {
      console.error("[PRODUCT_UPDATE] No data returned after update:", {
        uid: productUid,
        count
      });
      return NextResponse.json({ 
        error: "Update completed but no data returned" 
      }, { status: 500 });
    }

    // 7. Log success with affected row count
    console.log("[PRODUCT_UPDATE] Success:", {
      uid: productUid,
      updatedFields: Object.keys(updateData),
      rowsAffected: count,
      updatedProduct: {
        uid: data[0]?.uid,
        name: data[0]?.name,
        slug: data[0]?.slug,
        active: data[0]?.active
      }
    });

    // Return updated product (first row from select)
    return NextResponse.json({ 
      ok: true, 
      product: data[0],
      rowsAffected: count
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const resolvedParams = await params;
    console.error("[PRODUCT_UPDATE] Unexpected error:", {
      uid: resolvedParams.uid,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: `Internal Server Error: ${errorMessage}` 
    }, { status: 500 });
  }
}
