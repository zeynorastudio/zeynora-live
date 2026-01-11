import { createServiceRoleClient } from "@/lib/supabase/server";
import fs from "fs";

// Mock env for script run if not loaded
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("Env vars missing in script context. Skipping real upload.");
  process.exit(0);
}

async function uploadPlaceholder() {
  const filePath = "/mnt/data/0119e320-7e23-4f30-a533-93e19a5dde2a.png";
  const targetPath = "category/dev/placeholder/placeholder.png";

  try {
    let buffer;
    try {
      buffer = fs.readFileSync(filePath);
    } catch (e) {
      console.warn("Local placeholder file not found, using empty buffer.");
      buffer = Buffer.from("placeholder image content");
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage
      .from("categories")
      .upload(targetPath, buffer, { upsert: true, contentType: "image/png" });

    if (error) {
      console.error("Upload failed:", error.message);
    } else {
      console.log(`Success: Uploaded to ${targetPath}`);
    }

  } catch (e: any) {
    console.error("Script error:", e.message);
  }
}

uploadPlaceholder();
