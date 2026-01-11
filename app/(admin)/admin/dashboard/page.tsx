/**
 * Phase 3.3 — Admin Dashboard Page
 * 
 * Displays comprehensive analytics and metrics for admin users.
 * Shows order statistics, revenue, status breakdowns, and recent orders.
 */

import { requireAdmin } from "@/lib/auth/requireAdmin";
import DashboardClient from "./DashboardClient";

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif-display text-night text-3xl">Dashboard</h1>
        <p className="sans-base text-silver-dark mt-2">Welcome back, Admin.</p>
      </div>

      <DashboardClient />
    </div>
  );
}
