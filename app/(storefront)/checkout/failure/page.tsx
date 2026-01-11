import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const orderNumber = resolvedSearchParams.order;
  const errorMessage = resolvedSearchParams.error;

  return (
    <div className="min-h-screen bg-offwhite py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Failure Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          {/* Failure Message */}
          <h1 className="serif-display text-3xl text-night mb-4">
            Payment Failed
          </h1>
          <p className="text-gray-600 mb-4">
            We're sorry, but your payment could not be processed.
          </p>
          {errorMessage && (
            <p className="text-sm text-red-600 mb-8 bg-red-50 p-3 rounded">
              {decodeURIComponent(errorMessage)}
            </p>
          )}
          {orderNumber && (
            <p className="text-sm text-gray-500 mb-8">
              Order Number: <span className="font-mono">{orderNumber}</span>
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/cart"
              className="px-6 py-3 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors font-medium"
            >
              Return to Cart
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border border-gold text-gold rounded-lg hover:bg-gold/5 transition-colors font-medium"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}






