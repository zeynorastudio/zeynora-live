import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const orderNumber = resolvedSearchParams.order;

  if (!orderNumber) {
    redirect("/");
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Get user record
  const { data: userRecord } = await supabase
    .from("users")
    .select("id")
    .eq("auth_uid", user.id)
    .single();

  const typedUserRecord = userRecord as { id: string } | null;

  // Fetch order
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, payment_status, total_amount, created_at, payment_provider_response"
    )
    .eq("order_number", orderNumber)
    .eq("user_id", typedUserRecord?.id || "")
    .single();

  if (error || !order) {
    redirect("/");
  }

  const typedOrder = order as {
    id: string;
    order_number: string;
    payment_status: string;
    total_amount: number | null;
    created_at: string;
    payment_provider_response: any;
  };

  const paymentResponse = typedOrder.payment_provider_response as Record<string, any> | null;
  const razorpayPaymentId = paymentResponse?.razorpay_payment_id;
  const isPaid = typedOrder.payment_status === "paid";
  const isPending = typedOrder.payment_status === "pending";

  return (
    <div className="min-h-screen bg-offwhite py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                isPaid ? "bg-green-100" : "bg-yellow-100"
              }`}
            >
              {isPaid ? (
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-10 h-10 text-yellow-600 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Success Message */}
          <h1 className="serif-display text-3xl text-night mb-4">
            {isPaid
              ? "Payment Successful!"
              : isPending
              ? "Processing Payment..."
              : "Payment Status"}
          </h1>
          <p className="text-gray-600 mb-8">
            {isPaid
              ? "Thank you for your order. We've received your payment and will process your order shortly."
              : isPending
              ? "Your payment is being processed. We will update you via email once the payment is confirmed. Please check back in a few minutes."
              : "Your payment status is being verified. Please check back later or contact support if you have any questions."}
          </p>

          {/* Order Details */}
          <div className="bg-cream rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-night mb-4">Order Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-medium text-night">{typedOrder.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Status:</span>
                <span
                  className={`font-medium capitalize ${
                    isPaid
                      ? "text-green-600"
                      : isPending
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {typedOrder.payment_status}
                </span>
              </div>
              {razorpayPaymentId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-mono text-xs text-gray-500">
                    {razorpayPaymentId.substring(0, 20)}...
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Order Date:</span>
                <span className="font-medium text-night">
                  {format(new Date(typedOrder.created_at), "MMM dd, yyyy 'at' h:mm a")}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-silver">
                <span className="text-gray-600 font-semibold">Total Amount:</span>
                <span className="font-bold text-night text-lg">
                  ₹{typedOrder.total_amount?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/account/orders/${typedOrder.id}`}
              className="px-6 py-3 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors font-medium"
            >
              View Order Details
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border border-gold text-gold rounded-lg hover:bg-gold/5 transition-colors font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
