import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { productCreateSchema } from "@/lib/products/schemas";
import { createProduct } from "@/lib/products/service";
import { generateUniqueSlug } from "@/lib/products/slug";
import slugify from "slugify";

export async function POST(req: NextRequest) {
  try {
    console.log("🔨 Create product API called");
    
    const session = await getAdminSession();
    if (!session) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    if (session.role !== "super_admin") {
      console.error("❌ User is not super_admin:", session.role);
      return NextResponse.json({ error: "Only Super Admins can create products" }, { status: 403 });
    }

    const body = await req.json();
    console.log("📦 Request body:", JSON.stringify(body, null, 2));
    
    const validation = productCreateSchema.safeParse(body);
    
    if (!validation.success) {
      console.error("❌ Validation failed:", validation.error.errors);
      const errorMessages = validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return NextResponse.json({ 
        error: `Validation failed: ${errorMessages}` 
      }, { status: 400 });
    }

    const input = validation.data;
    console.log("✅ Validation passed");
    
    // Validate subcategory is a leaf category (defensive check)
    if (input.subcategory) {
      const { createServiceRoleClient } = await import("@/lib/supabase/server");
      const supabase = createServiceRoleClient();
      
      // Find category by name or slug
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
      (input as any).category_id = categoryData.id;
      
      // Derive parent category for super_category
      if (categoryData.parent_id) {
        const { data: parentCategory } = await supabase
          .from("categories")
          .select("name")
          .eq("id", categoryData.parent_id)
          .single();
        
        if (parentCategory) {
          (input as any).super_category = parentCategory.name;
        }
      }
    }
    
    // Generate and deduplicate slug
    const baseSlug = input.slug || slugify(input.name, { lower: true, strict: true });
    input.slug = await generateUniqueSlug(baseSlug);
    console.log("📝 Generated slug:", input.slug);

    console.log("💾 Creating product...");
    const product = await createProduct(input, session.user.id);
    console.log("✅ Product created successfully:", product.uid);

    return NextResponse.json({ success: true, uid: product.uid });
    
  } catch (error: any) {
    console.error("💥 Product creation error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to create product" 
    }, { status: 500 });
  }
}
