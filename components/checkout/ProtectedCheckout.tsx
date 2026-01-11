"use client";

import { useCustomer } from "@/lib/hooks/useCustomer";
import LoginModal from "@/components/auth/LoginModal";
import { usePathname, useRouter } from "next/navigation";

interface ProtectedCheckoutProps {
  children: React.ReactNode;
}

export default function ProtectedCheckout({ children }: ProtectedCheckoutProps) {
  const { user, loading } = useCustomer();
  const pathname = usePathname();
  const router = useRouter();

  // Show loading skeleton while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="lg:col-span-1">
                <div className="h-96 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in, show login modal with blurred checkout
  if (!user) {
    return (
      <>
        {/* Blurred checkout UI */}
        <div className="relative min-h-screen bg-offwhite">
          <div className="blur-sm pointer-events-none">{children}</div>
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/30 z-40"></div>
        </div>

        {/* Login Modal - always open when user is null */}
        <LoginModal
          open={true}
          onClose={() => {
            // If user closes modal without logging in, redirect to home
            router.push("/");
          }}
          redirectAfterLogin={pathname}
        />
      </>
    );
  }

  // User is logged in, render checkout normally
  return <>{children}</>;
}

