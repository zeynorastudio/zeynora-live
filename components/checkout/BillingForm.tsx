// BillingForm: Billing details form structure
// DB Sources:
//   - orders.billing_name (text)
//   - orders.billing_email (text)
//   - orders.billing_phone (text)
//   - orders.billing_address.line1 (text)
//   - orders.billing_address.line2 (text)
//   - orders.billing_address.city (text)
//   - orders.billing_address.state (text)
//   - orders.billing_address.pincode (text)
//   - orders.billing_address.country (text)
// Structure-only: No logic, no validation, no state

import { Input } from "@/components/ui/Input";

export default function BillingForm() {
  return (
    <div className="space-y-4">
      {/* Full Name */}
      <div>
        <label
          htmlFor="billing-name"
          className="sans-base body-sm text-night mb-2 block"
        >
          Full Name
        </label>
        <Input
          type="text"
          id="billing-name"
          name="billing-name"
          aria-label="Billing full name"
          placeholder="Enter full name"
          // DB: orders.billing_name
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="billing-email"
          className="sans-base body-sm text-night mb-2 block"
        >
          Email
        </label>
        <Input
          type="email"
          id="billing-email"
          name="billing-email"
          aria-label="Billing email address"
          placeholder="Enter email address"
          // DB: orders.billing_email
        />
      </div>

      {/* Phone */}
      <div>
        <label
          htmlFor="billing-phone"
          className="sans-base body-sm text-night mb-2 block"
        >
          Phone
        </label>
        <Input
          type="tel"
          id="billing-phone"
          name="billing-phone"
          aria-label="Billing phone number"
          placeholder="Enter phone number"
          // DB: orders.billing_phone
        />
      </div>

      {/* Address Line 1 */}
      <div>
        <label
          htmlFor="billing-address-line1"
          className="sans-base body-sm text-night mb-2 block"
        >
          Address Line 1
        </label>
        <Input
          type="text"
          id="billing-address-line1"
          name="billing-address-line1"
          aria-label="Billing address line 1"
          placeholder="Enter street address"
          // DB: orders.billing_address.line1
        />
      </div>

      {/* Address Line 2 */}
      <div>
        <label
          htmlFor="billing-address-line2"
          className="sans-base body-sm text-night mb-2 block"
        >
          Address Line 2 (Optional)
        </label>
        <Input
          type="text"
          id="billing-address-line2"
          name="billing-address-line2"
          aria-label="Billing address line 2"
          placeholder="Apartment, suite, etc."
          // DB: orders.billing_address.line2
        />
      </div>

      {/* City */}
      <div>
        <label
          htmlFor="billing-city"
          className="sans-base body-sm text-night mb-2 block"
        >
          City
        </label>
        <Input
          type="text"
          id="billing-city"
          name="billing-city"
          aria-label="Billing city"
          placeholder="Enter city"
          // DB: orders.billing_address.city
        />
      </div>

      {/* State */}
      <div>
        <label
          htmlFor="billing-state"
          className="sans-base body-sm text-night mb-2 block"
        >
          State
        </label>
        <select
          id="billing-state"
          name="billing-state"
          aria-label="Billing state"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          // DB: orders.billing_address.state
        >
          <option value="">Select state</option>
        </select>
      </div>

      {/* Postal Code */}
      <div>
        <label
          htmlFor="billing-pincode"
          className="sans-base body-sm text-night mb-2 block"
        >
          Postal Code
        </label>
        <Input
          type="text"
          id="billing-pincode"
          name="billing-pincode"
          aria-label="Billing postal code"
          placeholder="Enter postal code"
          // DB: orders.billing_address.pincode
        />
      </div>

      {/* Country */}
      <div>
        <label
          htmlFor="billing-country"
          className="sans-base body-sm text-night mb-2 block"
        >
          Country
        </label>
        <select
          id="billing-country"
          name="billing-country"
          aria-label="Billing country"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          // DB: orders.billing_address.country
        >
          <option value="">Select country</option>
        </select>
      </div>
    </div>
  );
}




