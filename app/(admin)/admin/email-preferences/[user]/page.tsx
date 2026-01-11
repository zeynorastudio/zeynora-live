import React from "react";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/email-preferences";
import AdminEmailPreferencesClient from "./AdminEmailPreferencesClient";

export const dynamic = "force-dynamic";

export default async function AdminEmailPreferencesPage({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  // Enforce Super Admin only
  const session = await requireSuperAdmin();
  const resolvedParams = await params;
  const userId = resolvedParams.user;

  const supabase = createServiceRoleClient();

  // Get user info
  const { data: userRecord } = await supabase
    .from("users")
    .select("id, email, full_name, phone")
    .eq("id", userId)
    .single();

  const typedUserRecord = userRecord as {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
  } | null;

  if (!typedUserRecord) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">User not found</p>
        </div>
      </div>
    );
  }

  // Get email preferences
  let preferences;
  try {
    preferences = await getPreferences(userId);
  } catch (error: any) {
    console.error("Error loading email preferences:", error);
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load email preferences</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="serif-display text-3xl text-night mb-2">Email Preferences Manager</h1>
        <div className="text-silver-dark">
          <p className="font-medium">{typedUserRecord.full_name || "User"}</p>
          <p className="text-sm">{typedUserRecord.email}</p>
          {typedUserRecord.phone && <p className="text-sm">{typedUserRecord.phone}</p>}
        </div>
      </div>

      <AdminEmailPreferencesClient
        userId={userId}
        userName={typedUserRecord.full_name || typedUserRecord.email || "User"}
        initialPreferences={preferences}
        adminUserId={session.user.id}
      />
    </div>
  );
}



