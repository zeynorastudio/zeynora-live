// PaymentMethodSelector: Payment method selection structure
// DB Source:
//   - orders.payment_method (text)
// Structure-only: No logic, no state, no validation

export default function PaymentMethodSelector() {
  return (
    <div className="space-y-3">
      {/* Razorpay Option */}
      <label
        htmlFor="payment-razorpay"
        className="sans-base body-sm flex items-center gap-3 p-4 bg-cream/50 border border-silver rounded-lg cursor-pointer hover:border-gold transition-colors"
      >
        <input
          type="radio"
          id="payment-razorpay"
          name="payment-method"
          value="razorpay"
          aria-label="Razorpay payment method"
          className="w-4 h-4 text-gold border-silver focus:ring-gold"
          // DB: orders.payment_method
        />
        <div className="flex-1">
          <span className="font-medium text-night">Razorpay</span>
          <span className="text-silver-dark block text-xs mt-1">
            India
          </span>
        </div>
      </label>

      {/* Stripe Option */}
      <label
        htmlFor="payment-stripe"
        className="sans-base body-sm flex items-center gap-3 p-4 bg-cream/50 border border-silver rounded-lg cursor-pointer hover:border-gold transition-colors"
      >
        <input
          type="radio"
          id="payment-stripe"
          name="payment-method"
          value="stripe"
          aria-label="Stripe payment method"
          className="w-4 h-4 text-gold border-silver focus:ring-gold"
          // DB: orders.payment_method
        />
        <div className="flex-1">
          <span className="font-medium text-night">Stripe</span>
          <span className="text-silver-dark block text-xs mt-1">
            International
          </span>
        </div>
      </label>

      {/* COD Option (Placeholder) */}
      <label
        htmlFor="payment-cod"
        className="sans-base body-sm flex items-center gap-3 p-4 bg-cream/50 border border-silver rounded-lg cursor-pointer hover:border-gold transition-colors"
      >
        <input
          type="radio"
          id="payment-cod"
          name="payment-method"
          value="cod"
          aria-label="Cash on delivery payment method"
          className="w-4 h-4 text-gold border-silver focus:ring-gold"
          // DB: orders.payment_method
        />
        <div className="flex-1">
          <span className="font-medium text-night">Cash on Delivery</span>
          <span className="text-silver-dark block text-xs mt-1">
            Available in select areas
          </span>
        </div>
      </label>
    </div>
  );
}




