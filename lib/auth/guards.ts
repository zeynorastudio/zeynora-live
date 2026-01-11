import { requireSuperAdmin as requireSuperAdminOriginal } from "@/lib/auth/requireSuperAdmin";

/**
 * Enforces super_admin role for the current session.
 * Redirects to login or dashboard if authorization fails.
 */
export async function requireSuperAdmin() {
  return requireSuperAdminOriginal();
}




















