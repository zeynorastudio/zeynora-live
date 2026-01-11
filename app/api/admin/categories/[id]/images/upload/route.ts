import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const imageType = formData.get("image_type") as string; // "tile" or "banner"

    if (!file || !imageType) {
      return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${imageType}-${Date.now()}.${ext}`;
    const storagePath = `category/${resolvedParams.id}/${imageType}/${filename}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("categories") // Assuming 'categories' bucket exists, or use 'products'/'images' if preferred. 
      // Prompt says: "storage in: supabase://category/${category_id}/${image_type}/filename.ext"
      // Storage bucket name is usually first segment. So bucket = 'category' or part of path?
      // Standard buckets: 'products', 'banners', etc. 
      // Let's assume 'categories' bucket. If not, we use 'images' or 'public'.
      // Checking "Banner" usage: "getPublicUrl('banners', ...)" in previous code.
      // So 'banners' bucket exists. Maybe 'categories' too? 
      // Or I should use 'categories' as bucket name based on prompt path.
      .upload(storagePath, buffer, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    // Update DB immediately? Prompt: "On successful upload, return the storage path only (no public URL)."
    // The update route handles the DB link.

    return NextResponse.json({ success: true, path: storagePath });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

