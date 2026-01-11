import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import MediaPageClient from "./components/MediaPageClient";

export const metadata = {
  title: "Media Manager | Admin Dashboard",
};

export default async function MediaPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  // Admin and Super Admin both allowed access, per "Admin permissions" rule.
  
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="serif-display text-3xl text-night">Media Manager</h1>
        <p className="sans-base text-silver-dark mt-1">
          Browse and manage product imagery.
        </p>
      </div>

      <MediaPageClient role={session.role} />
    </div>
  );
}
