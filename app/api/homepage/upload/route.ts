import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    await requireSuperAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const section = formData.get("section") as string; // 'hero', 'categories', 'banners'
    const variant = formData.get("variant") as string; // 'desktop' or 'mobile' (optional, defaults to 'desktop')

    if (!file || !section) {
      return NextResponse.json({ error: "Missing file or section" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const originalParts = file.name.split(".");
    const extension =
      originalParts.length > 1 ? originalParts.pop()!.toLowerCase() : "";
    const baseName =
      originalParts.join(".").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() ||
      "asset";
    const variantSuffix = variant === "mobile" ? "-mobile" : "-desktop";
    const filename = extension
      ? `homepage/${section}/${timestamp}-${baseName}${variantSuffix}.${extension}`
      : `homepage/${section}/${timestamp}-${baseName}${variantSuffix}`;

    const supabase = createServiceRoleClient();

    // Upload file directly (no auto-cropping)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("banners")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({
      path: uploadData.path,
      url: supabase.storage.from("banners").getPublicUrl(uploadData.path).data.publicUrl
    });

  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


