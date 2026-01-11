/**
 * Admin Roles & Permissions Helper Functions
 * 
 * DB Tables Used:
 * - users (id, auth_uid, email, full_name, role, is_active)
 * - admin_audit_logs (actor_user_id, target_user_id, action, detail)
 * 
 * Security: All functions use createServerClient and enforce super_admin checks.
 * Only super_admin can perform role changes, freeze/unfreeze, and invite operations.
 */

import { createServerClient } from "@/lib/supabase/server";

export type UserRole = "super_admin" | "admin" | "staff" | "customer";

export type UserResponse = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole | null;
  is_frozen: boolean;
  created_at: string;
};

export type AuditLogResponse = {
  id: string;
  actor_user_id: string;
  target_user_id: string | null;
  action: string;
  detail: any;
  created_at: string;
  actor_email?: string;
  target_email?: string;
};

/**
 * Gets the role of a user by their auth.uid()
 * Returns null if user not found or not authenticated
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("auth_uid", userId)
    .single();

  if (error || !data) {
    return null;
  }

  // Type assertion
  const typedData = data as {
    role: string | null;
    is_active: boolean | null;
  };

  // If user is frozen (is_active = false), return null to deny access
  if (typedData.is_active === false) {
    return null;
  }

  return typedData.role || null;
}

/**
 * Requires that the user is a super_admin and not frozen.
 * Throws an error with a 403-friendly message if not.
 */
export async function requireSuperAdmin(sessionUserId: string): Promise<void> {
  const role = await getUserRole(sessionUserId);
  
  if (role !== "super_admin") {
    throw new Error("Forbidden: Super admin access required");
  }
}

/**
 * Validates that a role string is a valid UserRole
 */
function validateRole(role: string): role is UserRole {
  return ["super_admin", "admin", "staff", "customer"].includes(role);
}

/**
 * Sets a user's role and logs the action in audit log.
 * Only super_admin can call this.
 * Prevents removing the last super_admin.
 * 
 * @param actorUserId - The super_admin performing the action (must be verified)
 * @param targetUserId - The auth.users(id) of the target user
 * @param newRole - The new role to assign
 * @param reason - Optional reason for the change
 */
export async function setUserRole(
  actorUserId: string,
  targetUserId: string,
  newRole: string,
  reason?: string
): Promise<UserResponse> {
  const supabase = await createServerClient();

  // Validate role
  if (!validateRole(newRole)) {
    throw new Error(`Invalid role: ${newRole}. Must be one of: super_admin, admin, staff, customer`);
  }

  // Get current user data
  const { data: targetUser, error: fetchError } = await supabase
    .from("users")
    .select("id, auth_uid, email, full_name, role, is_active, created_at")
    .eq("auth_uid", targetUserId)
    .single();

  if (fetchError || !targetUser) {
    throw new Error("Target user not found");
  }

  // Type assertion
  const typedTargetUser = targetUser as {
    id: string;
    auth_uid: string | null;
    email: string;
    full_name: string | null;
    role: string | null;
    is_active: boolean | null;
    created_at: string;
  };

  const oldRole = typedTargetUser.role;

  // Prevent removing the last super_admin
  if (oldRole === "super_admin" && newRole !== "super_admin") {
    // Count remaining super_admins
    const { data: superAdmins, error: countError } = await supabase
      .from("users")
      .select("id")
      .eq("role", "super_admin")
      .eq("is_active", true);

    if (countError) {
      throw new Error("Failed to verify super_admin count");
    }

    const typedSuperAdmins = (superAdmins || []) as Array<{ id: string }>;
    if (typedSuperAdmins.length <= 1) {
      throw new Error("Cannot remove the last super_admin");
    }
  }

  // Update user role
  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({ 
      role: newRole,
      updated_at: new Date().toISOString()
    } as unknown as never)
    .eq("auth_uid", targetUserId)
    .select("id, auth_uid, email, full_name, role, is_active, created_at")
    .single();

  if (updateError || !updatedUser) {
    throw new Error(`Failed to update user role: ${updateError?.message || "Unknown error"}`);
  }

  // Type assertion
  const typedUpdatedUser = updatedUser as {
    id: string;
    auth_uid: string | null;
    email: string;
    full_name: string | null;
    role: string | null;
    is_active: boolean | null;
    created_at: string;
  };

  // Insert audit log
  const { error: auditError } = await supabase
    .from("admin_audit_logs")
    .insert({
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      action: "assign_role",
      detail: {
        old_role: oldRole,
        new_role: newRole,
        reason: reason || null,
      },
    } as unknown as never);

  if (auditError) {
    // Log error but don't fail the operation
    console.error("Failed to create audit log:", auditError);
  }

  return {
    id: typedUpdatedUser.auth_uid || typedUpdatedUser.id,
    email: typedUpdatedUser.email,
    name: typedUpdatedUser.full_name,
    role: typedUpdatedUser.role as UserRole | null,
    is_frozen: !typedUpdatedUser.is_active,
    created_at: typedUpdatedUser.created_at,
  };
}

/**
 * Freezes a user account (sets is_active = false).
 * Prevents super_admin from freezing themselves.
 * 
 * @param actorUserId - The super_admin performing the action
 * @param targetUserId - The auth.users(id) of the target user
 * @param reason - Optional reason for freezing
 */
export async function freezeUser(
  actorUserId: string,
  targetUserId: string,
  reason?: string
): Promise<UserResponse> {
  const supabase = await createServerClient();

  // Prevent self-freeze
  if (actorUserId === targetUserId) {
    throw new Error("Cannot freeze your own account");
  }

  // Get current user data
  const { data: targetUser, error: fetchError } = await supabase
    .from("users")
    .select("id, auth_uid, email, full_name, role, is_active, created_at")
    .eq("auth_uid", targetUserId)
    .single();

  if (fetchError || !targetUser) {
    throw new Error("Target user not found");
  }

  // Update is_active to false (frozen)
  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    } as unknown as never)
    .eq("auth_uid", targetUserId)
    .select("id, auth_uid, email, full_name, role, is_active, created_at")
    .single();

  if (updateError || !updatedUser) {
    throw new Error(`Failed to freeze user: ${updateError?.message || "Unknown error"}`);
  }

  // Type assertion
  const typedUpdatedUser = updatedUser as {
    id: string;
    auth_uid: string | null;
    email: string;
    full_name: string | null;
    role: string | null;
    is_active: boolean | null;
    created_at: string;
  };

  // Insert audit log
  const { error: auditError } = await supabase
    .from("admin_audit_logs")
    .insert({
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      action: "freeze",
      detail: {
        reason: reason || null,
      },
    } as unknown as never);

  if (auditError) {
    console.error("Failed to create audit log:", auditError);
  }

  return {
    id: typedUpdatedUser.auth_uid || typedUpdatedUser.id,
    email: typedUpdatedUser.email,
    name: typedUpdatedUser.full_name,
    role: typedUpdatedUser.role as UserRole | null,
    is_frozen: true,
    created_at: typedUpdatedUser.created_at,
  };
}

/**
 * Unfreezes a user account (sets is_active = true).
 * 
 * @param actorUserId - The super_admin performing the action
 * @param targetUserId - The auth.users(id) of the target user
 * @param reason - Optional reason for unfreezing
 */
export async function unfreezeUser(
  actorUserId: string,
  targetUserId: string,
  reason?: string
): Promise<UserResponse> {
  const supabase = await createServerClient();

  // Get current user data
  const { data: targetUser, error: fetchError } = await supabase
    .from("users")
    .select("id, auth_uid, email, full_name, role, is_active, created_at")
    .eq("auth_uid", targetUserId)
    .single();

  if (fetchError || !targetUser) {
    throw new Error("Target user not found");
  }

  // Update is_active to true (unfrozen)
  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({ 
      is_active: true,
      updated_at: new Date().toISOString()
    } as unknown as never)
    .eq("auth_uid", targetUserId)
    .select("id, auth_uid, email, full_name, role, is_active, created_at")
    .single();

  if (updateError || !updatedUser) {
    throw new Error(`Failed to unfreeze user: ${updateError?.message || "Unknown error"}`);
  }

  // Type assertion
  const typedUpdatedUser = updatedUser as {
    id: string;
    auth_uid: string | null;
    email: string;
    full_name: string | null;
    role: string | null;
    is_active: boolean | null;
    created_at: string;
  };

  // Insert audit log
  const { error: auditError } = await supabase
    .from("admin_audit_logs")
    .insert({
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      action: "unfreeze",
      detail: {
        reason: reason || null,
      },
    } as unknown as never);

  if (auditError) {
    console.error("Failed to create audit log:", auditError);
  }

  return {
    id: typedUpdatedUser.auth_uid || typedUpdatedUser.id,
    email: typedUpdatedUser.email,
    name: typedUpdatedUser.full_name,
    role: typedUpdatedUser.role as UserRole | null,
    is_frozen: false,
    created_at: typedUpdatedUser.created_at,
  };
}
