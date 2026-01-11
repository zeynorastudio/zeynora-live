import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OrderCard from "@/components/account/OrderCard";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Package } from "lucide-react";

// Force dynamic rendering for pages that use authentication
export const dynamic = "force-dynamic";

interface Order {
  id: string;
  order_number: string;
  payment_status: string | null;
  shipping_status: string | null;
  total_amount: number | null;
  created_at: string;
}

export default async function CustomerOrdersPage() {
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
    .select("id")
    .eq("auth_uid", user.id)
    .single();

  const typedUserRecord = userRecord as { id: string } | null;

  if (!typedUserRecord) {
    redirect("/login");
  }

  // Fetch ALL orders for this user
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, payment_status, shipping_status, total_amount, created_at")
    .eq("user_id", typedUserRecord.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error);
  }

  const ordersList: Order[] = orders || [];

  return (
    <div className="min-h-screen bg-offwhite py-8 px-4 md:py-12 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="serif-display text-3xl md:text-4xl text-night mb-2">
            My Orders
          </h1>
          <p className="text-silver-dark text-sm md:text-base">
            View and manage all your orders
          </p>
        </div>

        {/* Orders List */}
        {ordersList.length === 0 ? (
          <div className="bg-white border border-silver-light rounded-lg p-12 md:p-16 text-center">
            <Package className="w-16 h-16 text-silver-light mx-auto mb-6" strokeWidth={1} />
            <h2 className="serif-display text-xl md:text-2xl text-night mb-3">
              You have not placed any orders yet.
            </h2>
            <p className="text-silver-dark mb-6 max-w-md mx-auto">
              Start shopping to see your orders here. Browse our collection of luxury Indian fashion.
            </p>
            <Link href="/">
              <Button variant="outline" className="inline-flex">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {ordersList.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
