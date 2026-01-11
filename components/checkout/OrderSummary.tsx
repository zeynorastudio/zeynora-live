import Button from "@/components/ui/Button";
import Image from "@/components/common/Image";
import CouponInput from "./CouponInput";
import { useCartStore } from "@/lib/store/cart";

interface OrderSummaryProps {
  shippingFee?: number | null;
  shippingETA?: { min_days: number; max_days: number } | null;
  isServiceable?: boolean | null;
  subtotal?: number;
  creditsApplied?: number;
}

export default function OrderSummary({
  shippingFee = null,
  shippingETA = null,
  isServiceable = null,
  subtotal: propSubtotal,
  creditsApplied = 0,
}: OrderSummaryProps) {
  const { items: cartItems } = useCartStore();

  // Calculate subtotal from cart items
  const subtotal =
    propSubtotal !== undefined
      ? propSubtotal
      : cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  const shipping = shippingFee !== null ? shippingFee : 0;
  const taxes = 0; // Calculated later if needed
  const grandTotal = Math.max(0, subtotal + shipping + taxes - creditsApplied);

  return (
    <div className="bg-cream border border-silver rounded-xl p-6 shadow-luxury">
      <h2 className="serif-display display-md text-night mb-6">
        Order Summary
      </h2>

      {/* Product Items */}
      {cartItems && cartItems.length > 0 && (
        <div className="space-y-4 mb-6 pb-6 border-b border-silver">
          {cartItems.map((item) => (
            <div
              key={item.sku}
              className="flex gap-4 items-start"
              aria-label={`Product: ${item.name || "Product"}, Quantity: ${item.quantity}`}
            >
              {/* Thumbnail */}
              {item.image && (
                <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={item.image}
                    alt={item.name || "Product"}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h3 className="sans-base body-sm font-medium text-night truncate">
                  {item.name || "Product"}
                </h3>
                <p className="sans-base text-xs text-silver-dark mt-1">
                  Quantity: {item.quantity}
                </p>
                <p className="sans-base body-sm text-night font-medium mt-1">
                  ₹{((item.price || 0) * item.quantity).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coupon Input */}
      <div className="mb-6 pb-6 border-b border-silver">
        <CouponInput />
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="sans-base body-sm text-night">Subtotal</span>
          <span className="sans-base body-sm text-night font-medium">
            ₹{subtotal.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="sans-base body-sm text-night">Shipping</span>
          <span className="sans-base body-sm text-night font-medium">
            {shippingFee === null ? (
              <span className="text-silver-dark">Calculating...</span>
            ) : shipping === 0 ? (
              <span className="text-green-600">Free</span>
            ) : (
              `₹${shipping.toLocaleString()}`
            )}
          </span>
        </div>
        {shippingETA && (
          <div className="text-xs text-silver-dark mt-1">
            Estimated delivery: {shippingETA.min_days}-{shippingETA.max_days} days
          </div>
        )}
        {isServiceable === false && (
          <div className="text-xs text-red-600 mt-1">
            Shipping not available to this pincode
          </div>
        )}
        {isServiceable === true && (
          <div className="text-xs text-green-600 mt-1">
            ✓ We ship to this pincode
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="sans-base body-sm text-night">Taxes</span>
          <span className="sans-base body-sm text-night font-medium">
            ₹{taxes.toLocaleString()}
          </span>
        </div>

        {creditsApplied > 0 && (
          <div className="flex justify-between items-center">
            <span className="sans-base body-sm text-green-600">Store Credits Applied</span>
            <span className="sans-base body-sm text-green-600 font-medium">
              -₹{creditsApplied.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Grand Total */}
      <div className="flex justify-between items-center mb-6 pt-6 border-t-2 border-gold">
        <span className="serif-display text-3xl text-night">Total</span>
        <span className="serif-display text-3xl text-night font-medium">
          {/* DB: orders.total_amount */}
          ₹{grandTotal.toLocaleString()}
        </span>
      </div>
      {grandTotal === 0 && creditsApplied > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 text-center">
            ✓ Order fully paid with store credits. No payment required.
          </p>
        </div>
      )}

      {/* Place Order Button */}
      <Button
        type="button"
        variant="default"
        className="w-full py-3 text-lg"
        aria-label="Place order"
      >
        Place Order
      </Button>
    </div>
  );
}

