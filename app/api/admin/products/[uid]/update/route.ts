import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { productUpdateSchema } from "@/lib/products/schemas";
import { updateProduct } from "@/lib/products/service";
import { generateUniqueSlug } from "@/lib/products/slug";
import slugify from "slugify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Read request body once (can only be called once)
    const body = await req.json();

    // Admin restrictions
    if (session.role !== "super_admin") {
      // Admin can ONLY update specific fields (handled by service or schema subset)
      // But updateProduct service is generic. 
      // "Admin can only edit variant stock, toggle featured/best_selling/active/new_launch"
      // We should check body keys here.
      const allowedKeys = ["is_active", "is_featured", "is_best_selling", "is_new_launch"];
      const keys = Object.keys(body);
      const hasForbidden = keys.some(k => !allowedKeys.includes(k) && k !== "uid"); // uid allowed for ID check
      
      if (hasForbidden) {
         return NextResponse.json({ error: "Admins can only update flags." }, { status: 403 });
      }
    }
    // Ensure UID matches param
    body.uid = resolvedParams.uid;

    const validation = productUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }

    const input = validation.data;

    // Validate subcategory is a leaf category if provided (defensive check)
    // Only super_admins can change subcategory
    if (input.subcategory && session.role === "super_admin") {
      const { createServiceRoleClient } = await import("@/lib/supabase/server");
      const supabase = createServiceRoleClient();
      
      // Find category by name
      const { data: categoryData } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id")
        .or(`name.eq.${input.subcategory},slug.eq.${input.subcategory}`)
        .single();
      
      if (!categoryData) {
        return NextResponse.json({ 
          error: `Subcategory "${input.subcategory}" not found` 
        }, { status: 400 });
      }
      
      // Check if it's a leaf category (has no children)
      const { data: children } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", categoryData.id)
        .limit(1);
      
      if (children && children.length > 0) {
        return NextResponse.json({ 
          error: `Products must be assigned to leaf categories only. "${input.subcategory}" has subcategories.` 
        }, { status: 400 });
      }
      
      // Set category_id to the subcategory ID
      input.category_id = categoryData.id;
      
      // Derive parent category for super_category
      if (categoryData.parent_id) {
        const { data: parentCategory } = await supabase
          .from("categories")
          .select("name")
          .eq("id", categoryData.parent_id)
          .single();
        
        if (parentCategory) {
          input.super_category = parentCategory.name;
        }
      }
    }
    
    // Handle category_id if provided directly (from form payload)
    if ((input as any).category_id && !input.subcategory) {
      // If category_id is provided but subcategory is not, fetch the category name
      const { createServiceRoleClient } = await import("@/lib/supabase/server");
      const supabase = createServiceRoleClient();
      const { data: categoryData } = await supabase
        .from("categories")
        .select("id, name, parent_id")
        .eq("id", (input as any).category_id)
        .single();
      
      if (categoryData) {
        input.subcategory = categoryData.name;
        // Derive parent category
        if (categoryData.parent_id) {
          const { data: parentCategory } = await supabase
            .from("categories")
            .select("name")
            .eq("id", categoryData.parent_id)
            .single();
          if (parentCategory) {
            input.super_category = parentCategory.name;
          }
        }
      }
    }

    // Transform field names from form schema (is_*) to service schema (without is_)
    const serviceInput: any = { ...input };
    
    // Preserve category_id if it was set during validation
    if ((input as any).category_id !== undefined) {
      serviceInput.category_id = (input as any).category_id;
    }
    
    // Transform boolean flags
    if (input.is_active !== undefined) {
      serviceInput.active = input.is_active;
      delete serviceInput.is_active;
    }
    if (input.is_featured !== undefined) {
      serviceInput.featured = input.is_featured;
      delete serviceInput.is_featured;
    }
    if (input.is_best_selling !== undefined) {
      serviceInput.best_selling = input.is_best_selling;
      delete serviceInput.is_best_selling;
    }
    if (input.is_new_launch !== undefined) {
      serviceInput.new_launch = input.is_new_launch;
      delete serviceInput.is_new_launch;
    }
    
    // Handle sale fields - ensure strike_price is null if on_sale is false
    if (input.on_sale !== undefined) {
      serviceInput.on_sale = input.on_sale;
      if (!input.on_sale) {
        // If turning off sale, clear strike_price
        serviceInput.strike_price = null;
      } else if (input.strike_price !== undefined) {
        // Validate strike_price > price when on_sale
        if (input.strike_price !== null && input.strike_price <= (input.price || 0)) {
          return NextResponse.json({ 
            error: "Strike price must be greater than regular price when on sale" 
          }, { status: 400 });
        }
        serviceInput.strike_price = input.strike_price;
      }
    } else if (input.strike_price !== undefined) {
      serviceInput.strike_price = input.strike_price;
    }
    
    // Remove fields that don't exist in DB
    delete (serviceInput as any).seo_title;
    delete (serviceInput as any).seo_description;
    delete (serviceInput as any).fabric_care;
    delete (serviceInput as any).colors;
    delete (serviceInput as any).sizes_with_stock;
    delete (serviceInput as any).category; // This is super_category, already handled

    // Only regenerate slug if it actually changed
    if (serviceInput.slug) {
      const { createServiceRoleClient } = await import("@/lib/supabase/server");
      const supabase = createServiceRoleClient();
      
      const { data: currentProduct } = await supabase
        .from("products")
        .select("slug")
        .eq("uid", resolvedParams.uid)
        .single();
      
      const currentSlug = currentProduct?.slug;
      const newSlug = slugify(serviceInput.slug, { lower: true, strict: true });
      
      // Only regenerate if slug actually changed
      if (currentSlug !== newSlug) {
        serviceInput.slug = await generateUniqueSlug(newSlug, "products", resolvedParams.uid);
      } else {
        // Keep current slug if unchanged
        serviceInput.slug = currentSlug;
      }
    }

    await updateProduct(resolvedParams.uid, serviceInput, session.user.id);

    // Verify update succeeded by fetching updated product
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const supabase = createServiceRoleClient();
    const { data: updatedProduct, error: fetchError } = await supabase
      .from("products")
      .select("uid, name, slug, active")
      .eq("uid", resolvedParams.uid)
      .single();

    if (fetchError || !updatedProduct) {
      console.error("[PRODUCT_UPDATE] Failed to verify update:", fetchError);
      return NextResponse.json({ 
        error: "Update completed but verification failed. Please refresh the page." 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      product: {
        uid: updatedProduct.uid,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        active: updatedProduct.active
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[PRODUCT_UPDATE] Error:", {
      route: "/api/admin/products/[uid]/update",
      error: errorMessage,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

