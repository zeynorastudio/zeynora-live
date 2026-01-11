/**
 * Phase 4.3 — Admin Returns Dashboard
 * Displays all return requests with filtering by status
 */

import { requireAdmin } from "@/lib/auth/requireAdmin";
import ReturnsClient from "./ReturnsClient";

export default async function ReturnsPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif-display text-night text-3xl">Returns</h1>
        <p className="sans-base text-silver-dark mt-2">Manage return requests and pickups</p>
      </div>

      <ReturnsClient />
    </div>
  );
}









