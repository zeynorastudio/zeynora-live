// CouponInput: Coupon code input structure
// DB Source:
//   - coupons.code (text)
// Structure-only: No logic, no validation, no state

import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function CouponInput() {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Input
          type="text"
          id="coupon-code"
          name="coupon-code"
          aria-label="Coupon code"
          placeholder="Enter coupon code"
          // DB: coupons.code
        />
      </div>
      <Button
        type="button"
        variant="outline"
        aria-label="Apply coupon code"
        className="whitespace-nowrap"
      >
        Apply
      </Button>
    </div>
  );
}




