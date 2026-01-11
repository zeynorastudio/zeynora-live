import { ReactNode } from "react";
import { cookies } from "next/headers";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { StorefrontLayoutClient } from "./StorefrontLayoutClient";
import { StorefrontClientShell } from "./StorefrontClientShell";

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerClient();
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [wishlistCount, cartCount, festiveEnabled] = await Promise.all([
    getWishlistCount(supabase, user?.id ?? null),
    getCartQuantity(supabase, cookieStore, user?.id ?? null),
    getFestiveVisibility(),
  ]);

  return (
    <StorefrontLayoutClient
      festiveEnabled={festiveEnabled}
      initialWishlistCount={wishlistCount}
      initialCartCount={cartCount}
    >
      <StorefrontClientShell>
        {children}
      </StorefrontClientShell>
    </StorefrontLayoutClient>
  );
}

async function getWishlistCount(
  supabase: SupabaseClient<Database>,
  authUid: string | null,
) {
  if (!authUid) return 0;

  // Get customer to verify it's a customer (not admin)
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_uid", authUid)
    .maybeSingle();

  if (!customer) return 0; // Not a customer

  // Get user_id for wishlist_items (wishlist_items.user_id references users.id)
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("auth_uid", authUid)
    .maybeSingle();

  const typedUser = user as { id: string } | null;
  if (!typedUser) return 0;

  const { count, error } = await supabase
    .from("wishlist_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", typedUser.id);

  if (error) return 0;
  return count || 0;
}

async function getCartQuantity(
  supabase: SupabaseClient<Database>,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  authUid: string | null,
) {
  let cartId: string | null = null;

  if (authUid) {
    // Verify it's a customer (not admin)
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("auth_uid", authUid)
      .maybeSingle();

    if (customer) {
      // Get user_id for carts (carts.user_id references users.id)
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("auth_uid", authUid)
        .maybeSingle();

      if (user) {
        const typedUser = user as { id: string } | null;
        if (typedUser) {
          const { data, error } = await supabase
            .from("carts")
            .select("id")
            .eq("user_id", typedUser.id)
            .maybeSingle();

          const typedData = data as { id: string } | null;
          cartId = error ? null : typedData?.id ?? null;
        }
      }
    }
  } else {
    const sessionId = cookieStore.get("z_session")?.value;
    if (!sessionId) return 0;

    const { data, error } = await supabase
      .from("carts")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    const typedData = data as { id: string } | null;
    cartId = error ? null : typedData?.id ?? null;
  }

  if (!cartId) return 0;

  const { data: cartItems, error } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("cart_id", cartId);

  if (error || !cartItems?.length) return 0;

  const typedCartItems = (cartItems || []) as Array<{ quantity: number | null }>;
  return typedCartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

async function getFestiveVisibility() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("title, visible, status")
    .eq("status", "published")
    .eq("visible", true);

  if (error || !data) return false;

  const typedSections = (data || []) as Array<{
    title: string | null;
    visible: boolean;
    status: string;
  }>;

  return typedSections.some(
    (section) => section.title?.trim().toLowerCase() === "festive",
  );
}

