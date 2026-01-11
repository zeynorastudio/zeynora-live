import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileCard from "@/components/account/ProfileCard";
import OrdersOverview from "@/components/account/OrdersOverview";
import WishlistOverview from "@/components/account/WishlistOverview";
import SupportOverview from "@/components/account/SupportOverview";
import AddressesOverview from "@/components/account/AddressesOverview";
import Link from "next/link";
import Button from "@/components/ui/Button";

// Force dynamic rendering for pages that use authentication
export const dynamic = "force-dynamic";

export default async function AccountDashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user record from users table
  const { data: userRecord } = await supabase
    .from("users")
    .select("id, full_name, email, phone")
    .eq("auth_uid", user.id)
    .single();

  const typedUserRecord = userRecord as {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
  } | null;

  if (!typedUserRecord) {
    redirect("/login");
  }

  const userId = typedUserRecord.id;

  // Fetch all dashboard data in parallel
  const [
    ordersResult,
    wishlistResult,
    supportResult,
    addressesResult,
  ] = await Promise.all([
    // Orders: total count + last 3 orders
    supabase
      .from("orders")
      .select("id, order_number, payment_status, shipping_status, total_amount, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
    
    // Wishlist: count only
    supabase
      .from("wishlist_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    
    // Support tickets: count + last ticket
    (async () => {
      // First get user's order IDs
      const { data: userOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId);
      
      const typedUserOrders = (userOrders || []) as Array<{ id: string }>;
      const orderIds = typedUserOrders.map(o => o.id);
      
      // Get shipping queries linked to user's orders or by email
      let query = supabase
        .from("shipping_queries")
        .select("id, order_number, status, message, created_at", { count: "exact" });
      
      // Build OR condition: order_id IN (orderIds) OR email = userEmail
      if (orderIds.length > 0) {
        query = query.or(`order_id.in.(${orderIds.join(",")}),email.eq.${typedUserRecord.email}`);
      } else {
        // If no orders, only filter by email
        query = query.eq("email", typedUserRecord.email);
      }
      
      const { data: queries, count } = await query
        .order("created_at", { ascending: false })
        .limit(1);
      
      return { data: queries || [], count: count || 0 };
    })(),
    
    // Addresses: count + default address
    supabase
      .from("addresses")
      .select("id, full_name, phone, line1, line2, city, state, pincode, is_default", { count: "exact" })
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const typedOrders = (ordersResult.data || []) as Array<{
    id: string;
    order_number: string;
    payment_status: string | null;
    shipping_status: string | null;
    total_amount: number | null;
    created_at: string;
  }>;
  const ordersCount = ordersResult.count || 0;
  const wishlistCount = wishlistResult.count || 0;
  const typedSupportTickets = (supportResult.data || []).map((ticket: {
    id: string;
    order_number: string | null;
    status: string;
    message: string | null;
    created_at: string;
  }) => ({
    ...ticket,
    message: ticket.message || "",
  })) as Array<{
    id: string;
    order_number: string | null;
    status: string;
    message: string;
    created_at: string;
  }>;
  const supportCount = supportResult.count || 0;
  const typedAddresses = (addressesResult.data || []).map((addr: {
    id: string;
    full_name: string | null;
    phone: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    is_default: boolean | null;
  }) => ({
    ...addr,
    full_name: addr.full_name || "",
    phone: addr.phone || "",
    line1: addr.line1 || "",
    line2: addr.line2 || null,
    city: addr.city || "",
    state: addr.state || "",
    pincode: addr.pincode || "",
    is_default: addr.is_default || false,
  })) as Array<{
    id: string;
    full_name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    is_default: boolean;
  }>;
  const addressesCount = addressesResult.count || 0;
  const defaultAddress = typedAddresses.find(a => a.is_default) || typedAddresses[0] || null;

  return (
    <div className="min-h-screen bg-offwhite py-8 px-4 md:py-12 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="serif-display text-3xl md:text-4xl text-night mb-2">
            My Account
          </h1>
          <p className="text-silver-dark text-sm md:text-base">
            Manage your profile, orders, and preferences
          </p>
        </div>

        {/* Profile Section */}
        <div className="mb-8 md:mb-12">
          <ProfileCard
            name={typedUserRecord.full_name || user.email?.split("@")[0] || "User"}
            email={typedUserRecord.email || user.email || ""}
            phone={typedUserRecord.phone || ""}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
          {/* Orders Overview */}
          <OrdersOverview
            orders={typedOrders}
            totalCount={ordersCount}
          />

          {/* Wishlist Overview */}
          <WishlistOverview count={wishlistCount} />
        </div>

        {/* Support & Addresses Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
          {/* Support Overview */}
          <SupportOverview
            tickets={typedSupportTickets}
            totalCount={supportCount}
          />

          {/* Addresses Overview */}
          <AddressesOverview
            address={defaultAddress}
            totalCount={addressesCount}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-silver-light rounded-lg p-6 md:p-8">
          <h2 className="serif-display text-xl md:text-2xl text-night mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/account/orders">
              <Button
                variant="outline"
                className="w-full py-3 text-sm md:text-base"
              >
                View Orders
              </Button>
            </Link>
            <Link href="/account/addresses">
              <Button
                variant="outline"
                className="w-full py-3 text-sm md:text-base"
              >
                Manage Addresses
              </Button>
            </Link>
            <Link href="/support/shipping">
              <Button
                variant="outline"
                className="w-full py-3 text-sm md:text-base"
              >
                Contact Support
              </Button>
            </Link>
            <form action="/logout" method="GET">
              <Button
                type="submit"
                variant="subtle"
                className="w-full py-3 text-sm md:text-base text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Logout
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
