import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminButton } from "@/components/admin/AdminButton";
import { AlertTriangle, Key, CheckCircle } from "lucide-react";

export default async function ShiprocketSettingsPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div>
        <h1 className="serif-display text-night text-3xl">Shiprocket Settings</h1>
        <p className="sans-base text-silver-dark mt-2">Configure shipping integration credentials</p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 flex gap-4">
        <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-orange-800 mb-1">Security Warning</h3>
          <p className="text-sm text-orange-800/80 leading-relaxed">
            Do NOT store API keys directly in the database or this UI. 
            Credentials should be managed securely via environment variables in your deployment platform (Vercel/Supabase).
          </p>
        </div>
      </div>

      <AdminCard title="Configuration Guide">
        <div className="space-y-6">
          <div className="p-4 bg-offwhite rounded-lg border border-silver-light">
            <h4 className="font-bold text-night text-sm mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-gold" />
              Required Environment Variables
            </h4>
            <pre className="bg-black text-white p-4 rounded text-xs font-mono overflow-x-auto">
{`SHIPROCKET_EMAIL="your-email@example.com"
SHIPROCKET_PASSWORD="your-password"
# Or if using token directly:
SHIPROCKET_TOKEN="your-jwt-token"`}
            </pre>
            <p className="text-xs text-silver-dark mt-3">
              Add these to your <code>.env.local</code> for local development and your project settings for production.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-silver-darker">Default Pickup Location ID</label>
              <input 
                type="text" 
                placeholder="e.g. Primary_Warehouse"
                className="w-full px-3 py-2 border border-silver-light rounded focus:ring-1 focus:ring-gold/50 outline-none"
                disabled
              />
              <p className="text-xs text-silver-dark">Managed in Shiprocket Panel</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-silver-darker">Auto-Assign Courier</label>
              <div className="flex items-center h-10">
                <span className="text-sm text-green-600 font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Enabled
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-silver-light flex justify-end">
            <AdminButton variant="outline" disabled>Test Connection (TODO)</AdminButton>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}


