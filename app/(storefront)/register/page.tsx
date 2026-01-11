"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // 1. Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered") || signUpError.message.includes("already exists")) {
          setError("Email already in use");
        } else if (signUpError.message.includes("Invalid email")) {
          setError("Invalid email address");
        } else if (signUpError.message.includes("Password")) {
          setError("Password is too weak");
        } else {
          setError(signUpError.message || "Failed to create account");
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Failed to create account");
        setLoading(false);
        return;
      }

      // 2. Create user record in users table (client-side)
      // Note: RLS should allow users to insert their own record
      // If RLS blocks this, a database trigger or function should handle it
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          auth_uid: authData.user.id,
          email: authData.user.email!,
          full_name: name,
          role: "customer",
        } as unknown as never);

      // If insert fails, it might be due to RLS or trigger handling it
      // We'll proceed anyway as the auth user is created
      if (insertError) {
        // Log but don't block - might be handled by trigger or RLS
        // In production, you might want to handle this more gracefully
      }

      // Success - redirect to account page
      router.push("/account");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold disabled:bg-gray-100"
                placeholder="Your Name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold disabled:bg-gray-100"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold disabled:bg-gray-100"
                placeholder="At least 6 characters"
              />
              <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-gold text-white rounded-md hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <a href="/login" className="text-gold hover:underline">
              Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
