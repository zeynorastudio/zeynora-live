// ShippingForm: Shipping details form structure
// DB Sources:
//   - orders.shipping_name (text)
//   - orders.shipping_phone (text)
//   - orders.shipping_address.line1 (text)
//   - orders.shipping_address.line2 (text)
//   - orders.shipping_address.city (text)
//   - orders.shipping_address.state (text)
//   - orders.shipping_address.pincode (text)
//   - orders.shipping_address.country (text)
// Structure-only: No logic, no validation, no state

import { Input } from "@/components/ui/Input";

export default function ShippingForm() {
  return (
    <div className="space-y-4">
      {/* Same as Billing Toggle */}
      <div className="mb-4 pb-4 border-b border-silver">
        <label className="sans-base body-sm text-night flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="same-as-billing"
            aria-label="Use same address as billing"
            className="w-4 h-4 text-gold border-silver rounded focus:ring-gold"
          />
          <span>Same as Billing</span>
        </label>
      </div>

      {/* Full Name */}
      <div>
        <label
          htmlFor="shipping-name"
          className="sans-base body-sm text-night mb-2 block"
        >
          Full Name
        </label>
        <Input
          type="text"
          id="shipping-name"
          name="shipping-name"
          aria-label="Shipping full name"
          placeholder="Enter full name"
          // DB: orders.shipping_name
        />
      </div>

      {/* Phone */}
      <div>
        <label
          htmlFor="shipping-phone"
          className="sans-base body-sm text-night mb-2 block"
        >
          Phone
        </label>
        <Input
          type="tel"
          id="shipping-phone"
          name="shipping-phone"
          aria-label="Shipping phone number"
          placeholder="Enter phone number"
          // DB: orders.shipping_phone
        />
      </div>

      {/* Address Line 1 */}
      <div>
        <label
          htmlFor="shipping-address-line1"
          className="sans-base body-sm text-night mb-2 block"
        >
          Address Line 1
        </label>
        <Input
          type="text"
          id="shipping-address-line1"
          name="shipping-address-line1"
          aria-label="Shipping address line 1"
          placeholder="Enter street address"
          // DB: orders.shipping_address.line1
        />
      </div>

      {/* Address Line 2 */}
      <div>
        <label
          htmlFor="shipping-address-line2"
          className="sans-base body-sm text-night mb-2 block"
        >
          Address Line 2 (Optional)
        </label>
        <Input
          type="text"
          id="shipping-address-line2"
          name="shipping-address-line2"
          aria-label="Shipping address line 2"
          placeholder="Apartment, suite, etc."
          // DB: orders.shipping_address.line2
        />
      </div>

      {/* City */}
      <div>
        <label
          htmlFor="shipping-city"
          className="sans-base body-sm text-night mb-2 block"
        >
          City
        </label>
        <Input
          type="text"
          id="shipping-city"
          name="shipping-city"
          aria-label="Shipping city"
          placeholder="Enter city"
          // DB: orders.shipping_address.city
        />
      </div>

      {/* State */}
      <div>
        <label
          htmlFor="shipping-state"
          className="sans-base body-sm text-night mb-2 block"
        >
          State
        </label>
        <select
          id="shipping-state"
          name="shipping-state"
          aria-label="Shipping state"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          // DB: orders.shipping_address.state
        >
          <option value="">Select state</option>
        </select>
      </div>

      {/* Postal Code */}
      <div>
        <label
          htmlFor="shipping-pincode"
          className="sans-base body-sm text-night mb-2 block"
        >
          Postal Code
        </label>
        <Input
          type="text"
          id="shipping-pincode"
          name="shipping-pincode"
          aria-label="Shipping postal code"
          placeholder="Enter postal code"
          // DB: orders.shipping_address.pincode
        />
      </div>

      {/* Country */}
      <div>
        <label
          htmlFor="shipping-country"
          className="sans-base body-sm text-night mb-2 block"
        >
          Country
        </label>
        <select
          id="shipping-country"
          name="shipping-country"
          aria-label="Shipping country"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          // DB: orders.shipping_address.country
        >
          <option value="">Select country</option>
        </select>
      </div>
    </div>
  );
}




