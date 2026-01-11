"use client";

import React, { useState, useEffect } from "react";
import AddressForm from "@/components/address/AddressForm";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { maskPhone } from "@/lib/addresses/validators";
import { Plus, Check } from "lucide-react";

interface Address {
  id: string;
  label?: string | null;
  recipient_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

interface AddressSelectorProps {
  onAddressSelect: (address: Address) => void;
  selectedAddressId?: string | null;
}

export default function AddressSelector({
  onAddressSelect,
  selectedAddressId,
}: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [checkingServiceability, setCheckingServiceability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch("/api/addresses/list");
      const data = await response.json();

      if (data.success && data.addresses) {
        setAddresses(data.addresses);
        // Auto-select default address if available
        const defaultAddress = data.addresses.find((a: Address) => a.is_default);
        if (defaultAddress && !selectedAddressId) {
          handleSelectAddress(defaultAddress);
        } else if (selectedAddressId) {
          const selected = data.addresses.find((a: Address) => a.id === selectedAddressId);
          if (selected) {
            handleSelectAddress(selected);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = async (address: Address) => {
    // Re-check serviceability before allowing selection
    setCheckingServiceability({ ...checkingServiceability, [address.id]: true });

    try {
      const response = await fetch(
        `/api/shipping/serviceability?pincode=${address.pincode}`
      );
      const data = await response.json();

      if (!data.serviceable) {
        alert(
          `We do not ship to pincode ${address.pincode}. Please select a different address or add a new one.`
        );
        return;
      }

      onAddressSelect(address);
    } catch (error) {
      console.error("Serviceability check failed:", error);
      // Still allow selection if check fails (graceful degradation)
      onAddressSelect(address);
    } finally {
      setCheckingServiceability({ ...checkingServiceability, [address.id]: false });
    }
  };

  const handleFormSuccess = () => {
    setShowNewForm(false);
    fetchAddresses();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-silver-light animate-pulse rounded-lg" />
        <div className="h-32 bg-silver-light animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing Addresses */}
      {addresses.length > 0 && (
        <div className="space-y-3">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedAddressId === address.id
                  ? "border-2 border-gold bg-gold/5"
                  : "border border-silver-light hover:border-gold/50"
              }`}
              onClick={() => handleSelectAddress(address)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-night">{address.recipient_name}</h3>
                    {address.is_default && (
                      <Badge variant="gold" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-silver-dark mb-2">{maskPhone(address.phone)}</p>
                  <div className="text-sm text-night">
                    <p>{address.address_line_1}</p>
                    {address.address_line_2 && <p>{address.address_line_2}</p>}
                    <p>
                      {address.city}, {address.state} - {address.pincode}
                    </p>
                  </div>
                </div>
                {selectedAddressId === address.id && (
                  <div className="ml-4">
                    <Check className="w-6 h-6 text-gold" />
                  </div>
                )}
                {checkingServiceability[address.id] && (
                  <div className="ml-4 text-xs text-silver-dark">Checking...</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Address */}
      {showNewForm ? (
        <Card className="p-6" shadowVariant="warm-sm">
          <h3 className="serif-display text-lg mb-4">Add New Address</h3>
          <AddressForm
            onSuccess={handleFormSuccess}
            onCancel={() => setShowNewForm(false)}
          />
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowNewForm(true)}
          icon={Plus}
          className="w-full"
        >
          Add New Address
        </Button>
      )}
    </div>
  );
}






