"use client";

import { useState } from "react";
import { Mail, Lock, AlertCircle, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { updateEmailPreferencesAdminAction } from "./actions";
import type { EmailPreferences } from "@/lib/email-preferences";

interface AdminEmailPreferencesClientProps {
  userId: string;
  userName: string;
  initialPreferences: EmailPreferences;
  adminUserId: string;
}

export default function AdminEmailPreferencesClient({
  userId,
  userName,
  initialPreferences,
  adminUserId,
}: AdminEmailPreferencesClientProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleToggle = async (field: keyof EmailPreferences, value: boolean) => {
    // Don't allow changes if master toggle is ON (except for master toggle itself)
    if (preferences.master_toggle && field !== "master_toggle") {
      setError("Please disable 'Disable all marketing emails' first to change individual preferences.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateEmailPreferencesAdminAction({
        user_id: userId,
        [field]: value,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update preferences");
      }

      // Reload preferences to get updated state
      const updatedPreferences = { ...preferences, [field]: value };

      // If master toggle is enabled, disable all optional categories
      if (field === "master_toggle" && value === true) {
        updatedPreferences.marketing_emails = false;
        updatedPreferences.new_arrivals = false;
        updatedPreferences.sale_announcements = false;
        updatedPreferences.restock_alerts = false;
        updatedPreferences.wishlist_alerts = false;
        updatedPreferences.abandoned_cart = false;
      }

      setPreferences(updatedPreferences);
      setSuccess("Preferences updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  const ToggleSwitch = ({
    label,
    description,
    checked,
    onChange,
    disabled = false,
    locked = false,
  }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    locked?: boolean;
  }) => (
    <div className="flex items-start justify-between py-4 border-b border-silver-light last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <label className="sans-base font-medium text-night cursor-pointer">
            {label}
          </label>
          {locked && (
            <Lock className="w-4 h-4 text-silver-dark" aria-label="This setting cannot be changed" />
          )}
        </div>
        {description && (
          <p className="text-sm text-silver-dark">{description}</p>
        )}
      </div>
      <div className="ml-4">
        <button
          type="button"
          onClick={() => !disabled && !locked && onChange(!checked)}
          disabled={disabled || locked}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${checked ? "bg-gold" : "bg-silver-light"}
            ${disabled || locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
          aria-label={`Toggle ${label}`}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${checked ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Preferences Card */}
      <div className="bg-cream border border-silver rounded-xl p-6 shadow-luxury">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-gold" />
          <h2 className="serif-display text-xl text-night">Email Preferences</h2>
        </div>

        <ToggleSwitch
          label="Disable all marketing emails"
          description="Turn off all marketing and promotional emails. User will still receive order confirmations and shipping updates."
          checked={preferences.master_toggle}
          onChange={(checked) => handleToggle("master_toggle", checked)}
          disabled={loading}
        />

        <div className="mt-6 pt-6 border-t border-silver">
          <h3 className="sans-base font-medium text-night mb-4">
            Optional Email Categories
          </h3>
          <p className="text-sm text-silver-dark mb-4">
            {preferences.master_toggle
              ? "Enable 'Disable all marketing emails' to manage individual categories."
              : "Choose which types of emails the user should receive."}
          </p>

          <ToggleSwitch
            label="Marketing & Promotional Emails"
            description="Newsletters, special offers, and brand updates"
            checked={preferences.marketing_emails}
            onChange={(checked) => handleToggle("marketing_emails", checked)}
            disabled={loading || preferences.master_toggle}
          />

          <ToggleSwitch
            label="New Arrivals"
            description="Get notified when we add new products"
            checked={preferences.new_arrivals}
            onChange={(checked) => handleToggle("new_arrivals", checked)}
            disabled={loading || preferences.master_toggle}
          />

          <ToggleSwitch
            label="Sale Announcements"
            description="Exclusive sale notifications and discount codes"
            checked={preferences.sale_announcements}
            onChange={(checked) => handleToggle("sale_announcements", checked)}
            disabled={loading || preferences.master_toggle}
          />

          <ToggleSwitch
            label="Restock Alerts"
            description="Notifications when out-of-stock items become available"
            checked={preferences.restock_alerts}
            onChange={(checked) => handleToggle("restock_alerts", checked)}
            disabled={loading || preferences.master_toggle}
          />

          <ToggleSwitch
            label="Wishlist Alerts"
            description="Updates about items in wishlist"
            checked={preferences.wishlist_alerts}
            onChange={(checked) => handleToggle("wishlist_alerts", checked)}
            disabled={loading || preferences.master_toggle}
          />

          <ToggleSwitch
            label="Abandoned Cart Reminders"
            description="Reminders about items left in cart"
            checked={preferences.abandoned_cart}
            onChange={(checked) => handleToggle("abandoned_cart", checked)}
            disabled={loading || preferences.master_toggle}
          />
        </div>

        {/* Mandatory Emails Section */}
        <div className="mt-6 pt-6 border-t border-silver">
          <h3 className="sans-base font-medium text-night mb-4">
            System Emails (Always Enabled)
          </h3>
          <p className="text-sm text-silver-dark mb-4">
            These emails are required for order management and cannot be disabled.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="sans-base text-night">Order Confirmations</span>
                <Lock className="w-4 h-4 text-silver-dark" />
              </div>
              <span className="text-sm text-silver-dark">Always On</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="sans-base text-night">Shipping Updates</span>
                <Lock className="w-4 h-4 text-silver-dark" />
              </div>
              <span className="text-sm text-silver-dark">Always On</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="sans-base text-night">Payment Receipts</span>
                <Lock className="w-4 h-4 text-silver-dark" />
              </div>
              <span className="text-sm text-silver-dark">Always On</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="sans-base text-night">Return Status Updates</span>
                <Lock className="w-4 h-4 text-silver-dark" />
              </div>
              <span className="text-sm text-silver-dark">Always On</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}
    </div>
  );
}



