"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminButton } from "@/components/admin/AdminButton";

export default function AdminLoginPage() {
  const supabase = createBrowserSupabaseClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    console.log("🔐 Attempting login for:", email);

    const { data, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signErr || !data?.user) {
      console.error("❌ Auth failed:", signErr);
      setError(signErr?.message ?? "Authentication failed");
      setLoading(false);
      return;
    }

    console.log("✅ Auth successful, user:", data.user.id);

    try {
      console.log("🔍 Checking role...");
      const res = await fetch("/api/admin/check-role", { 
        method: "POST",
        credentials: "include",
      });
      
      const body = await res.json();
      console.log("📦 API response:", res.status, body);

      if (!res.ok) {
        setError(body.error || "Unable to verify admin role");
        setLoading(false);
        return;
      }

      const { role } = body;

      if (role !== "super_admin" && role !== "admin") {
        setError("Unauthorized: admin access required");
        setLoading(false);
        return;
      }

      console.log("✅ Role verified:", role);
      console.log("🔄 Reloading page to trigger middleware redirect...");
      
      // Simple approach: reload the current page
      // The middleware will see the session and redirect appropriately
      window.location.reload();
      
    } catch (err: any) {
      console.error("💥 Error:", err);
      setError(err?.message || "Server error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-offwhite flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="serif-display text-4xl text-night mb-2">
            ZEYNORA <span className="text-gold">Admin</span>
          </h1>
          <p className="text-silver-dark mt-2">Sign in to manage your store</p>
        </div>

        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-night mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                placeholder="admin@zeynora.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-night mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <AdminButton
              type="submit"
              className="w-full bg-gold hover:bg-gold-dark text-white border-none py-3 text-base font-semibold"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </AdminButton>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}
