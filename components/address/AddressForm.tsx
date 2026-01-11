"use client";

import React, { useState, useEffect } from "react";
import { validateAddressPayload, validatePhone, validatePincode } from "@/lib/addresses/validators";
import { useToastWithCompat } from "@/components/ui/use-toast";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Select, { SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";

interface AddressFormProps {
  address?: {
    id: string;
    label?: string;
    recipient_name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    is_default: boolean;
  } | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddressForm({ address, onSuccess, onCancel }: AddressFormProps) {
  const { addToast } = useToastWithCompat();
  const [loading, setLoading] = useState(false);
  const [checkingServiceability, setCheckingServiceability] = useState(false);
  const [formData, setFormData] = useState({
    label: address?.label || "",
    recipient_name: address?.recipient_name || "",
    phone: address?.phone || "",
    address_line_1: address?.address_line_1 || "",
    address_line_2: address?.address_line_2 || "",
    city: address?.city || "",
    state: address?.state || "",
    pincode: address?.pincode || "",
    country: address?.country || "India",
    save_as_default: address?.is_default || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate field on blur
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case "phone":
        if (!validatePhone(value)) {
          newErrors.phone = "Phone must be exactly 10 digits";
        } else {
          delete newErrors.phone;
        }
        break;
      case "pincode":
        if (!validatePincode(value)) {
          newErrors.pincode = "Pincode must be exactly 6 digits";
        } else {
          delete newErrors.pincode;
        }
        break;
      case "recipient_name":
        if (!value.trim()) {
          newErrors.recipient_name = "Recipient name is required";
        } else {
          delete newErrors.recipient_name;
        }
        break;
      case "address_line_1":
        if (!value.trim()) {
          newErrors.address_line_1 = "Address line 1 is required";
        } else {
          delete newErrors.address_line_1;
        }
        break;
      case "city":
        if (!value.trim()) {
          newErrors.city = "City is required";
        } else {
          delete newErrors.city;
        }
        break;
      case "state":
        if (!value.trim()) {
          newErrors.state = "State is required";
        } else {
          delete newErrors.state;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Client-side validation
      const validation = validateAddressPayload(formData);
      if (!validation.valid) {
        setErrors({ general: validation.error || "Please fix the errors below" });
        setLoading(false);
        return;
      }

      // Check serviceability
      setCheckingServiceability(true);
      const serviceabilityResponse = await fetch(
        `/api/shipping/serviceability?pincode=${formData.pincode}`
      );
      const serviceabilityData = await serviceabilityResponse.json();

      if (!serviceabilityData.serviceable) {
        setErrors({
          pincode: serviceabilityData.reason || "We do not ship to this pincode yet. Please contact support.",
        });
        setCheckingServiceability(false);
        setLoading(false);
        return;
      }

      setCheckingServiceability(false);

      // Submit to API
      const endpoint = address ? "/api/addresses/update" : "/api/addresses/create";
      const payload = address
        ? { ...formData, address_id: address.id }
        : formData;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save address");
      }

      addToast(
        address ? "Address updated successfully" : "Address added successfully",
        "success"
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Address save error:", error);
      setErrors({ general: error.message || "Failed to save address" });
      addToast(error.message || "Failed to save address", "error");
    } finally {
      setLoading(false);
      setCheckingServiceability(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          {errors.general}
        </div>
      )}

      {/* Label (optional) */}
      <div>
        <label htmlFor="label" className="block text-sm font-medium text-night mb-2">
          Label (Optional)
        </label>
        <Input
          type="text"
          id="label"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="e.g., Home, Office"
          className="w-full"
        />
      </div>

      {/* Recipient Name */}
      <div>
        <label htmlFor="recipient_name" className="block text-sm font-medium text-night mb-2">
          Recipient Name <span className="text-red-600">*</span>
        </label>
        <Input
          type="text"
          id="recipient_name"
          value={formData.recipient_name}
          onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
          onBlur={(e) => validateField("recipient_name", e.target.value)}
          className="w-full"
          required
        />
        {errors.recipient_name && (
          <p className="text-xs text-red-600 mt-1">{errors.recipient_name}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-night mb-2">
          Phone <span className="text-red-600">*</span>
        </label>
        <Input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
          onBlur={(e) => validateField("phone", e.target.value)}
          placeholder="10 digits"
          maxLength={10}
          className="w-full"
          required
        />
        {errors.phone && (
          <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
        )}
      </div>

      {/* Address Line 1 */}
      <div>
        <label htmlFor="address_line_1" className="block text-sm font-medium text-night mb-2">
          Address Line 1 <span className="text-red-600">*</span>
        </label>
        <Input
          type="text"
          id="address_line_1"
          value={formData.address_line_1}
          onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
          onBlur={(e) => validateField("address_line_1", e.target.value)}
          className="w-full"
          required
        />
        {errors.address_line_1 && (
          <p className="text-xs text-red-600 mt-1">{errors.address_line_1}</p>
        )}
      </div>

      {/* Address Line 2 */}
      <div>
        <label htmlFor="address_line_2" className="block text-sm font-medium text-night mb-2">
          Address Line 2 (Optional)
        </label>
        <Input
          type="text"
          id="address_line_2"
          value={formData.address_line_2}
          onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
          className="w-full"
        />
      </div>

      {/* City */}
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-night mb-2">
          City <span className="text-red-600">*</span>
        </label>
        <Input
          type="text"
          id="city"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          onBlur={(e) => validateField("city", e.target.value)}
          className="w-full"
          required
        />
        {errors.city && (
          <p className="text-xs text-red-600 mt-1">{errors.city}</p>
        )}
      </div>

      {/* State */}
      <div>
        <label htmlFor="state" className="block text-sm font-medium text-night mb-2">
          State <span className="text-red-600">*</span>
        </label>
        <Input
          type="text"
          id="state"
          value={formData.state}
          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          onBlur={(e) => validateField("state", e.target.value)}
          className="w-full"
          required
        />
        {errors.state && (
          <p className="text-xs text-red-600 mt-1">{errors.state}</p>
        )}
      </div>

      {/* Pincode */}
      <div>
        <label htmlFor="pincode" className="block text-sm font-medium text-night mb-2">
          Pincode <span className="text-red-600">*</span>
        </label>
        <Input
          type="text"
          id="pincode"
          value={formData.pincode}
          onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "") })}
          onBlur={(e) => validateField("pincode", e.target.value)}
          placeholder="6 digits"
          maxLength={6}
          className="w-full"
          required
        />
        {errors.pincode && (
          <p className="text-xs text-red-600 mt-1">{errors.pincode}</p>
        )}
        {checkingServiceability && (
          <p className="text-xs text-silver-dark mt-1">Checking serviceability...</p>
        )}
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className="block text-sm font-medium text-night mb-2">
          Country
        </label>
        <Select
          value={formData.country}
          onValueChange={(value) => setFormData({ ...formData, country: value })}
          className="w-full"
        >
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="India">India</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Save as Default */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.save_as_default}
            onChange={(e) => setFormData({ ...formData, save_as_default: e.target.checked })}
            className="w-4 h-4 text-gold border-silver-light rounded focus:ring-gold/50"
          />
          <span className="text-sm text-night">Set as default address</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={loading || checkingServiceability}
          className="flex-1"
        >
          {loading ? "Saving..." : address ? "Update Address" : "Add Address"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}







