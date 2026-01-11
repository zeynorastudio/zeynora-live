"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/lib/store/session";

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const { setUser } = useSessionStore();

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  return <>{children}</>;
}



