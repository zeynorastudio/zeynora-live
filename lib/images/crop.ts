import sharp from "sharp";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function cropImageForMobile(
  buffer: Buffer,
  width: number = 900,
  height: number = 1200
): Promise<Buffer> {
  try {
    // Auto-crop to center with cover strategy
    return await sharp(buffer)
      .resize(width, height, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (error) {
    console.error("Sharp processing failed:", error);
    throw new Error("Image processing failed");
  }
}

export async function uploadMobileVariant(
  desktopPath: string,
  originalBuffer: Buffer,
  section: string
): Promise<string | null> {
  try {
    // Generate mobile variant
    const mobileBuffer = await cropImageForMobile(originalBuffer);
    
    // Construct mobile path (e.g. "hero/123-desktop.jpg" -> "hero/123-mobile.jpg")
    // Assumes desktopPath is like "homepage/{section}/{filename}"
    const pathParts = desktopPath.split('.');
    const ext = pathParts.pop();
    const basePath = pathParts.join('.');
    const mobilePath = `${basePath}-mobile.jpg`; // Force jpg for processed image

    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage
      .from("banners") // Using existing 'banners' bucket or check if 'homepage' bucket needed? 
                       // Project context suggests 'banners' bucket for hero images.
      .upload(mobilePath, mobileBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("Mobile upload failed:", error);
      return null;
    }

    return mobilePath;
  } catch (error) {
    console.error("Mobile variant generation failed:", error);
    return null;
  }
}




















