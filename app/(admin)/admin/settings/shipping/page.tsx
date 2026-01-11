"use client";

import React, { useState, useEffect } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { updateShippingSettings } from "./actions";
import Card from "@/components/ui/Card";

export default function ShippingSettingsPage() {
  const { addToast } = useToastWithCompat();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    flat_rate: 100,
    free_above_amount: 2000 as number | null,
    shipping_slabs: null as Array<{
      min_amount: number;
      max_amount: number | null;
      fee: number;
    }> | null,
    cod_enabled: true,
    default_package_weight: 0.5,
    default_package_dimensions: {
      length: 35,
      breadth: 30,
      height: 5,
    },
    blocked_pincodes: [] as string[],
    region_overrides: null as Record<string, any> | null,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings/shipping");
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings({
            flat_rate: data.settings.flat_rate || 100,
            free_above_amount: data.settings.free_above_amount || 2000,
            shipping_slabs: data.settings.shipping_slabs || null,
            cod_enabled: data.settings.cod_enabled !== false,
            default_package_weight: data.settings.default_package_weight || 0.5,
            default_package_dimensions: data.settings.default_package_dimensions || {
              length: 35,
              breadth: 30,
              height: 5,
            },
            blocked_pincodes: data.settings.blocked_pincodes || [],
            region_overrides: data.settings.region_overrides || null,
          });
        }
      }
    } catch (error: any) {
      addToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const result = await updateShippingSettings(settings);

      if (result.success) {
        addToast("Shipping settings updated successfully", "success");
      } else {
        addToast(result.error || "Failed to update settings", "error");
      }
    } catch (error: any) {
      addToast(error.message || "Failed to update settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const addBlockedPincode = () => {
    const pincode = prompt("Enter pincode to block:");
    if (pincode && /^\d{6}$/.test(pincode)) {
      setSettings({
        ...settings,
        blocked_pincodes: [...settings.blocked_pincodes, pincode],
      });
    } else {
      addToast("Invalid pincode. Must be 6 digits.", "error");
    }
  };

  const removeBlockedPincode = (pincode: string) => {
    setSettings({
      ...settings,
      blocked_pincodes: settings.blocked_pincodes.filter((p) => p !== pincode),
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="serif-display text-3xl mb-6">Shipping Settings</h1>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Flat Rate */}
          <Card className="p-6" shadowVariant="warm-sm">
            <h2 className="serif-display text-xl mb-4">Flat Shipping Rate</h2>
            <div>
              <label className="block text-sm font-medium text-night mb-2">
                Flat Rate (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.flat_rate}
                onChange={(e) =>
                  setSettings({ ...settings, flat_rate: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none"
                required
              />
            </div>
          </Card>

          {/* Free Shipping Threshold */}
          <Card className="p-6" shadowVariant="warm-sm">
            <h2 className="serif-display text-xl mb-4">Free Shipping</h2>
            <div>
              <label className="block text-sm font-medium text-night mb-2">
                Free Shipping Above Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.free_above_amount || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    free_above_amount: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none"
                placeholder="Leave empty to disable"
              />
              <p className="text-xs text-silver-dark mt-1">
                Orders above this amount will have free shipping
              </p>
            </div>
          </Card>

          {/* Default Package Weight */}
          <Card className="p-6" shadowVariant="warm-sm">
            <h2 className="serif-display text-xl mb-4">Default Package Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-night mb-2">
                  Default Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.default_package_weight}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_package_weight: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-night mb-2">
                  Dimensions (L × B × H cm)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="L"
                    value={settings.default_package_dimensions.length}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_package_dimensions: {
                          ...settings.default_package_dimensions,
                          length: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-2 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="B"
                    value={settings.default_package_dimensions.breadth}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_package_dimensions: {
                          ...settings.default_package_dimensions,
                          breadth: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-2 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="H"
                    value={settings.default_package_dimensions.height}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_package_dimensions: {
                          ...settings.default_package_dimensions,
                          height: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-2 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Blocked Pincodes */}
          <Card className="p-6" shadowVariant="warm-sm">
            <h2 className="serif-display text-xl mb-4">Blocked Pincodes</h2>
            <div>
              <AdminButton
                type="button"
                onClick={addBlockedPincode}
                variant="outline"
                className="mb-4"
              >
                Add Blocked Pincode
              </AdminButton>
              {settings.blocked_pincodes && settings.blocked_pincodes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {settings.blocked_pincodes.map((pincode) => (
                    <span
                      key={pincode}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm flex items-center gap-2"
                    >
                      {pincode}
                      <button
                        type="button"
                        onClick={() => removeBlockedPincode(pincode)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* COD Enabled */}
          <Card className="p-6" shadowVariant="warm-sm">
            <h2 className="serif-display text-xl mb-4">Payment Options</h2>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.cod_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, cod_enabled: e.target.checked })
                  }
                  className="w-4 h-4 text-gold border-silver-light rounded focus:ring-gold/50"
                />
                <span className="text-sm text-night">Enable Cash on Delivery (COD)</span>
              </label>
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <AdminButton type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </AdminButton>
          </div>
        </div>
      </form>
    </div>
  );
}






