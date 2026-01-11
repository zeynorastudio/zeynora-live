import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { CreateProductPayload } from "@/types/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Auth Check
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Admin Check (simplistic check for now, ideally centralized middleware or helper)
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("auth_uid", user.id)
      .single();
    const typedUserData = userData as { role: string } | null;
    if (!typedUserData || !["admin", "super_admin"].includes(typedUserData.role || "")) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as CreateProductPayload;
    
    // Validation
    if (!body.uid || !body.name || !body.slug || !body.price) {
       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();
    
    // Insert
    const { data, error } = await adminClient
      .from("products")
      .insert({
        uid: body.uid,
        name: body.name,
        slug: body.slug,
        category_id: body.category_id || null, // If provided UUID
        super_category: body.super_category,
        subcategory: body.subcategory,
        price: body.price,
        cost_price: body.cost_price || null,
        metadata: body.metadata || {},
        active: body.active !== undefined ? body.active : false, // Default draft
      } as unknown as never)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, product: data });

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
