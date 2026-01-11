"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/**
 * Hook to get current customer user session
 * SSR-safe and hydration-safe
 */
export function useCustomer() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guard against SSR
    if (typeof window === "undefined") {
      return;
    }

    const supabase = createBrowserSupabaseClient();

    // Get initial user
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        setUser(user);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}























