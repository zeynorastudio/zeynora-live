"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createAddressAction, updateAddressAction, AddressFormData } from "./actions";
import { validatePhone } from "@/lib/auth/customers";
import { useToastWithCompat } from "@/components/ui/use-toast";
import Button from "@/components/ui/Button";

interface AddressFormClientProps {
  address?: AddressFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddressFormClient({
  address,
  onSuccess,
  onCancel,
}: AddressFormClientProps) {
  const router = useRouter();
  const { addToast } = useToastWithCompat();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<AddressFormData>({
    full_name: address?.full_name || "",
    phone: address?.phone || "",
    line1: address?.line1 || "",
    line2: address?.line2 || "",
    city: address?.city || "",
    state: address?.state || "",
    pincode: address?.pincode || "",
    country: address?.country || "India",
    is_default: address?.is_default || false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Recipient name is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        newErrors.phone = phoneValidation.error || "Invalid phone format";
      }
    }

    if (!formData.line1.trim()) {
      newErrors.line1 = "Address line 1 is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let result;
      if (address?.id) {
        result = await updateAddressAction(address.id, formData);
      } else {
        result = await createAddressAction(formData);
      }

      if (result.success) {
        addToast(
          address?.id
            ? "Address updated successfully"
            : "Address added successfully",
          "success"
        );
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      } else {
        addToast(result.error || "Failed to save address", "error");
      }
    } catch (error: any) {
      addToast(error.message || "An error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="full_name"
          className="block text-sm font-medium text-night mb-1.5"
        >
          Recipient Name <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          value={formData.full_name}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night ${
            errors.full_name ? "border-red-300" : "border-bronze/30"
          }`}
          placeholder="John Doe"
          aria-invalid={!!errors.full_name}
        />
        {errors.full_name && (
          <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-night mb-1.5"
        >
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night ${
            errors.phone ? "border-red-300" : "border-bronze/30"
          }`}
          placeholder="+919876543210"
          aria-invalid={!!errors.phone}
        />
        {errors.phone ? (
          <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
        ) : (
          <p className="mt-1 text-xs text-silver-dark">
            Format: +91 followed by 10 digits
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="line1"
          className="block text-sm font-medium text-night mb-1.5"
        >
          Address Line 1 <span className="text-red-500">*</span>
        </label>
        <input
          id="line1"
          name="line1"
          type="text"
          value={formData.line1}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night ${
            errors.line1 ? "border-red-300" : "border-bronze/30"
          }`}
          placeholder="House/Flat No., Building Name"
          aria-invalid={!!errors.line1}
        />
        {errors.line1 && (
          <p className="mt-1 text-xs text-red-600">{errors.line1}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="line2"
          className="block text-sm font-medium text-night mb-1.5"
        >
          Address Line 2 <span className="text-silver-dark text-xs">(Optional)</span>
        </label>
        <input
          id="line2"
          name="line2"
          type="text"
          value={formData.line2}
          onChange={handleChange}
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-bronze/30 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night"
          placeholder="Street, Area, Landmark"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-night mb-1.5"
          >
            City <span className="text-red-500">*</span>
          </label>
          <input
            id="city"
            name="city"
            type="text"
            value={formData.city}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night ${
              errors.city ? "border-red-300" : "border-bronze/30"
            }`}
            placeholder="Mumbai"
            aria-invalid={!!errors.city}
          />
          {errors.city && (
            <p className="mt-1 text-xs text-red-600">{errors.city}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="state"
            className="block text-sm font-medium text-night mb-1.5"
          >
            State <span className="text-red-500">*</span>
          </label>
          <input
            id="state"
            name="state"
            type="text"
            value={formData.state}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night ${
              errors.state ? "border-red-300" : "border-bronze/30"
            }`}
            placeholder="Maharashtra"
            aria-invalid={!!errors.state}
          />
          {errors.state && (
            <p className="mt-1 text-xs text-red-600">{errors.state}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="pincode"
            className="block text-sm font-medium text-night mb-1.5"
          >
            Pincode <span className="text-red-500">*</span>
          </label>
          <input
            id="pincode"
            name="pincode"
            type="text"
            value={formData.pincode}
            onChange={handleChange}
            required
            maxLength={6}
            disabled={isSubmitting}
            className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night ${
              errors.pincode ? "border-red-300" : "border-bronze/30"
            }`}
            placeholder="400001"
            aria-invalid={!!errors.pincode}
          />
          {errors.pincode && (
            <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-night mb-1.5"
          >
            Country
          </label>
          <input
            id="country"
            name="country"
            type="text"
            value={formData.country}
            onChange={handleChange}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 border border-bronze/30 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night"
            placeholder="India"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="is_default"
          name="is_default"
          type="checkbox"
          checked={formData.is_default}
          onChange={handleChange}
          disabled={isSubmitting}
          className="w-4 h-4 text-gold border-bronze/30 rounded focus:ring-gold focus:ring-2"
        />
        <label
          htmlFor="is_default"
          className="ml-2 text-sm text-night cursor-pointer"
        >
          Set as default address
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting
            ? "Saving..."
            : address?.id
            ? "Update Address"
            : "Add Address"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}


