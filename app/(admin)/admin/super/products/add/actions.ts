"use server";

import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createProductWithVariants } from "@/lib/products";
import { revalidatePath } from "next/cache";

export async function createProductAction(formData: FormData) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.role !== "super_admin") {
    return { success: false, error: "Super admin access required" };
  }

  try {
    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const costPrice = formData.get("costPrice") ? parseFloat(formData.get("costPrice") as string) : undefined;
    const subcategory = formData.get("subcategory") as string | null; // Format: "Name" or "Name (Category)"
    const categoryOverride = formData.get("categoryOverride") as string | null;
    const style = formData.get("style") as string | null;
    const occasion = formData.get("occasion") as string | null;
    const season = formData.get("season") as string | null;
    const description = formData.get("description") as string | null;
    const sortOrder = formData.get("sortOrder") ? parseInt(formData.get("sortOrder") as string) : undefined;
    // Single color only - take first if comma-separated
    const colorsInput = formData.get("colors") as string | null;
    const colors = colorsInput ? [colorsInput.split(",")[0].trim()] : [];
    const sizesWithStock = formData.get("sizesWithStock") as string | null;
    const seoTitle = formData.get("seoTitle") as string | null;
    const seoDescription = formData.get("seoDescription") as string | null;
    const active = formData.get("active") === "true";
    const featured = formData.get("featured") === "true";
    const bestSelling = formData.get("bestSelling") === "true";
    const newLaunch = formData.get("newLaunch") === "true";

    // Validation
    if (!name || !name.trim()) {
      return { success: false, error: "Product name is required" };
    }
    if (!price || price <= 0) {
      return { success: false, error: "Price must be greater than 0" };
    }

    const result = await createProductWithVariants(
      {
        name: name.trim(),
        price,
        costPrice,
        subcategory,
        categoryOverride,
        style,
        occasion,
        season,
        description: description || undefined,
        sortOrder,
        colors,
        sizesWithStock: sizesWithStock || undefined,
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        active,
        featured,
        bestSelling,
        newLaunch,
      },
      session.user.id
    );

    revalidatePath("/admin/super/products");
    
    return { success: true, productUid: result.productUid };
  } catch (error: any) {
    console.error("Create product error:", error);
    return { success: false, error: error.message || "Failed to create product" };
  }
}


