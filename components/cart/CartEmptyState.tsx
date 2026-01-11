// CartEmptyState: Empty cart state component
// Structure-only: No logic
// Redirect: homepage (DB comment)

// Accessibility:
// - Illustration: aria-hidden="true"
// - Heading: h2
// - Button: aria-label

import Button from "@/components/ui/Button";

export interface CartEmptyStateProps {
  onContinueShopping?: () => void;
}

export default function CartEmptyState({
  onContinueShopping,
}: CartEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      {/* Illustration Placeholder */}
      <div
        className="w-32 h-32 rounded-full bg-cream border-2 border-silver/30 flex items-center justify-center mb-6"
        aria-hidden="true"
      >
        {/* Soft illustration placeholder - will be replaced with SVG illustration */}
        <svg
          className="w-16 h-16 text-silver-dark"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>

      {/* Empty Cart Message */}
      <h2 className="serif-display text-xl text-night mb-2">
        Your cart is empty
      </h2>
      <p className="sans-base text-sm text-silver-dark mb-6">
        Start adding items to your cart to continue shopping.
      </p>

      {/* Continue Shopping Button */}
      {/* Redirect: homepage */}
      <Button
        variant="outline"
        onClick={onContinueShopping}
        className="px-8"
        aria-label="Continue shopping"
      >
        Continue Shopping
      </Button>
    </div>
  );
}




