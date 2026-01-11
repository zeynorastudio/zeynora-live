"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AddressForm from "./AddressForm";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { maskPhone } from "@/lib/addresses/validators";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Edit2, Trash2, Star, Plus } from "lucide-react";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/(storefront)/account/addresses/actions";

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
  created_at: string;
}

interface AddressBookClientProps {
  initialAddresses: Address[];
}

export default function AddressBookClient({ initialAddresses }: AddressBookClientProps) {
  const router = useRouter();
  const { addToast } = useToastWithCompat();
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const handleAddNew = () => {
    setEditingAddress(null);
    setShowForm(true);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) {
      return;
    }

    setDeletingId(addressId);
    try {
      const result = await deleteAddressAction(addressId);

      if (!result.success) {
        throw new Error(result.error || "Failed to delete address");
      }

      addToast("Address deleted successfully", "success");
      router.refresh();
    } catch (error: any) {
      addToast(error.message || "Failed to delete address", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setSettingDefaultId(addressId);
    try {
      const result = await setDefaultAddressAction(addressId);

      if (!result.success) {
        throw new Error(result.error || "Failed to set default address");
      }

      addToast("Default address updated", "success");
      router.refresh();
    } catch (error: any) {
      addToast(error.message || "Failed to set default address", "error");
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAddress(null);
    router.refresh();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  return (
    <div className="space-y-6">
      {/* Add New Button */}
      {!showForm && (
        <div className="flex justify-end">
          <Button onClick={handleAddNew} icon={Plus}>
            Add New Address
          </Button>
        </div>
      )}

      {/* Address Form */}
      {showForm && (
        <Card className="p-6" shadowVariant="warm-sm">
          <h2 className="serif-display text-xl mb-4">
            {editingAddress ? "Edit Address" : "Add New Address"}
          </h2>
          <AddressForm
            address={editingAddress ? {
              id: editingAddress.id,
              label: editingAddress.label || undefined,
              recipient_name: editingAddress.recipient_name,
              phone: editingAddress.phone,
              address_line_1: editingAddress.address_line_1,
              address_line_2: editingAddress.address_line_2 || undefined,
              city: editingAddress.city,
              state: editingAddress.state,
              pincode: editingAddress.pincode,
              country: editingAddress.country,
              is_default: editingAddress.is_default,
            } : null}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </Card>
      )}

      {/* Address List */}
      {!showForm && (
        <div className="space-y-4">
          {addresses.length === 0 ? (
            <Card className="p-8 text-center" shadowVariant="warm-sm">
              <p className="text-silver-dark mb-4">No addresses saved yet</p>
              <Button onClick={handleAddNew} icon={Plus}>
                Add Your First Address
              </Button>
            </Card>
          ) : (
            addresses.map((address) => (
              <Card key={address.id} className="p-6" shadowVariant="warm-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="serif-display text-lg text-night">
                        {address.recipient_name}
                      </h3>
                      {address.is_default && (
                        <Badge variant="gold" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-silver-dark mb-2">
                      {maskPhone(address.phone)}
                    </p>
                    <div className="text-sm text-night">
                      <p>{address.address_line_1}</p>
                      {address.address_line_2 && <p>{address.address_line_2}</p>}
                      <p>
                        {address.city}, {address.state} - {address.pincode}
                      </p>
                      <p>{address.country}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!address.is_default && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        disabled={settingDefaultId === address.id}
                        className="p-2 text-gold hover:text-gold-dark transition-colors disabled:opacity-50"
                        aria-label="Set as default"
                        title="Set as default"
                      >
                        <Star className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(address)}
                      className="p-2 text-night hover:text-gold transition-colors"
                      aria-label="Edit address"
                      title="Edit address"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      disabled={deletingId === address.id}
                      className="p-2 text-vine hover:text-vine-dark transition-colors disabled:opacity-50"
                      aria-label="Delete address"
                      title="Delete address"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}






