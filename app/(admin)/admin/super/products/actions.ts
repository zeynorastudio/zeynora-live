"use server";

import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createAudit } from "@/lib/audit/log";
import { revalidatePath } from "next/cache";

/**
 * Reorder products
 * Updates sort_order for multiple products atomically
 */
export async function reorderProductsAction(
  orders: Array<{ product_uid: string; sort_order: number }>
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.role !== "super_admin") {
    return { success: false, error: "Super admin access required" };
  }

  try {
    const supabase = createServiceRoleClient();

    // Update all products in a batch
    for (const order of orders) {
      const { error } = await supabase
        .from("products")
        .update({ sort_order: order.sort_order } as unknown as never)
        .eq("uid", order.product_uid);

      if (error) {
        console.error(`Failed to update sort_order for ${order.product_uid}:`, error);
        // Continue with other updates even if one fails
      }
    }

    // Audit log
    await createAudit(session.user.id, "reorder_products", {
      product_count: orders.length,
      orders: orders.map((o) => ({ uid: o.product_uid, sort_order: o.sort_order })),
    });

    // Revalidate paths
    revalidatePath("/admin/super/products");
    revalidatePath("/");
    revalidatePath("/collections");

    return { success: true };
  } catch (error: any) {
    console.error("Reorder products error:", error);
    return { success: false, error: error.message || "Failed to reorder products" };
  }
}

/**
 * Update product price fields (price, strike_price, sale_price, on_sale)
 */
export async function updateProductPriceAction(
  productUid: string,
  updates: {
    price?: number;
    strike_price?: number | null;
    sale_price?: number | null;
    on_sale?: boolean;
    active?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.role !== "super_admin") {
    return { success: false, error: "Super admin access required" };
  }

  try {
    const supabase = createServiceRoleClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.price !== undefined) {
      updateData.price = updates.price;
    }

    if (updates.strike_price !== undefined) {
      updateData.strike_price = updates.strike_price;
    }

    if (updates.sale_price !== undefined) {
      updateData.sale_price = updates.sale_price;
    }

    if (updates.on_sale !== undefined) {
      updateData.on_sale = updates.on_sale;
    }

    if (updates.active !== undefined) {
      updateData.active = updates.active;
    }

    const { error } = await supabase
      .from("products")
      .update(updateData as unknown as never)
      .eq("uid", productUid);

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    // Audit log
    await createAudit(session.user.id, "update_product_price", {
      product_uid: productUid,
      updates,
    });

    // Revalidate paths
    revalidatePath("/admin/super/products");
    revalidatePath("/");
    revalidatePath(`/product/[slug]`, "page");

    return { success: true };
  } catch (error: any) {
    console.error("Update product price error:", error);
    return { success: false, error: error.message || "Failed to update product price" };
  }
}

/**
 * Assign product to homepage section
 */
export async function assignProductToHomepageSectionAction(
  productUid: string,
  sectionId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.role !== "super_admin") {
    return { success: false, error: "Super admin access required" };
  }

  try {
    const supabase = createServiceRoleClient();

    // Check if section exists and is manual type
    const { data: section, error: sectionError } = await supabase
      .from("homepage_sections")
      .select("id, source_type")
      .eq("id", sectionId)
      .single();

    if (sectionError || !section) {
      return { success: false, error: "Section not found" };
    }

    const typedSection = section as { id: string; source_type: string };
    if (typedSection.source_type !== "manual") {
      return { success: false, error: "Can only assign products to manual sections" };
    }

    // Check if product is already in section
    const { data: existing } = await supabase
      .from("homepage_section_products")
      .select("id")
      .eq("section_id", sectionId)
      .eq("product_id", productUid)
      .single();

    if (existing) {
      return { success: false, error: "Product already assigned to this section" };
    }

    // Get max order_index for this section
    const { data: max } = await supabase
      .from("homepage_section_products")
      .select("order_index")
      .eq("section_id", sectionId)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    const typedMax = max as { order_index: number } | null;
    const newIndex = (typedMax?.order_index ?? -1) + 1;

    // Insert assignment
    const { error: insertError } = await supabase
      .from("homepage_section_products")
      .insert({
        section_id: sectionId,
        product_id: productUid,
        order_index: newIndex,
      } as unknown as never);

    if (insertError) {
      throw new Error(`Failed to assign product: ${insertError.message}`);
    }

    // Audit log
    await createAudit(session.user.id, "assign_product_to_section", {
      product_uid: productUid,
      section_id: sectionId,
    });

    // Revalidate paths
    revalidatePath("/admin/super/homepage");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Assign product to section error:", error);
    return { success: false, error: error.message || "Failed to assign product to section" };
  }
}

/**
 * Get homepage sections for product assignment
 */
export async function getHomepageSectionsAction(): Promise<{
  success: boolean;
  sections?: Array<{ id: string; title: string; source_type: string }>;
  error?: string;
}> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.role !== "super_admin") {
    return { success: false, error: "Super admin access required" };
  }

  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("homepage_sections")
      .select("id, title, source_type")
      .eq("source_type", "manual")
      .order("order_index", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch sections: ${error.message}`);
    }

    return {
      success: true,
      sections: (data || []) as Array<{ id: string; title: string; source_type: string }>,
    };
  } catch (error: any) {
    console.error("Get homepage sections error:", error);
    return { success: false, error: error.message || "Failed to fetch sections" };
  }
}

/**
 * Bulk update products (active status, on_sale)
 */
export async function bulkUpdateProductsAction(
  productUids: string[],
  updates: {
    active?: boolean;
    on_sale?: boolean;
    featured?: boolean;
  }
): Promise<{ success: boolean; error?: string; updated?: number }> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.role !== "super_admin") {
    return { success: false, error: "Super admin access required" };
  }

  try {
    const supabase = createServiceRoleClient();
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.active !== undefined) {
      updateData.active = updates.active;
    }

    if (updates.on_sale !== undefined) {
      updateData.on_sale = updates.on_sale;
      // Clear sale prices if marking not on sale
      if (!updates.on_sale) {
        updateData.strike_price = null;
        updateData.sale_price = null;
      }
    }

    if (updates.featured !== undefined) {
      updateData.featured = updates.featured;
    }

    let updated = 0;
    for (const uid of productUids) {
      const { error } = await supabase
        .from("products")
        .update(updateData as unknown as never)
        .eq("uid", uid);

      if (!error) {
        updated++;
      } else {
        console.error(`Failed to update product ${uid}:`, error);
      }
    }

    // Audit log
    await createAudit(session.user.id, "bulk_update_products", {
      product_count: productUids.length,
      updated_count: updated,
      updates,
    });

    // Revalidate paths
    revalidatePath("/admin/super/products");
    revalidatePath("/");

    return { success: true, updated };
  } catch (error: any) {
    console.error("Bulk update products error:", error);
    return { success: false, error: error.message || "Failed to bulk update products" };
  }
}
