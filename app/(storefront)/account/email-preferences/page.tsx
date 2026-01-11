import React from "react";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPreferences } from "@/lib/email-preferences";
import EmailPreferencesClient from "./EmailPreferencesClient";

export const dynamic = "force-dynamic";

export default async function EmailPreferencesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user record
  const { data: userRecord } = await supabase
    .from("users")
    .select("id")
    .eq("auth_uid", user.id)
    .single();

  const typedUserRecord = userRecord as { id: string } | null;
  if (!typedUserRecord) {
    redirect("/login");
  }

  // Get email preferences
  let preferences;
  try {
    preferences = await getPreferences(typedUserRecord.id);
  } catch (error: any) {
    console.error("Error loading email preferences:", error);
    // Redirect to account page if preferences can't be loaded
    redirect("/account");
  }

  return (
    <div className="min-h-screen bg-offwhite py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="serif-display text-3xl text-night mb-2">Email Preferences</h1>
          <p className="text-silver-dark">
            Manage your email notification preferences. You can control which emails you receive from ZEYNORA.
          </p>
        </div>

        <EmailPreferencesClient initialPreferences={preferences} />
      </div>
    </div>
  );
}
