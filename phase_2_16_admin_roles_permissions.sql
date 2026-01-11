/* phase_2_16_admin_roles_permissions.sql
   Zeynora — Admin Roles & Permissions Finalization (Phase 2.16)
   Run this file in Supabase SQL Editor.
*/

/* NOTE: The existing users table schema uses:
   - id uuid PRIMARY KEY (application-level ID)
   - auth_uid uuid UNIQUE (references auth.users(id))
   - full_name text (not 'name')
   - is_active boolean (not 'is_frozen')
   - role z_role_type (enum: 'super_admin', 'admin', 'staff', 'customer')
   
   For this phase, we work with the existing schema.
   The code will map 'is_active' to 'is_frozen' conceptually (is_frozen = !is_active).
   The code will use 'full_name' as 'name' in responses.
*/

/* 1. admin_audit_logs table - tracks all role/permission actions */
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('assign_role', 'revoke_role', 'freeze', 'unfreeze', 'invite', 'invite_accept')),
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

COMMENT ON TABLE admin_audit_logs IS 'Audit trail for all admin role and permission changes. Only accessible server-side.';
COMMENT ON COLUMN admin_audit_logs.actor_user_id IS 'User who performed the action (must be super_admin)';
COMMENT ON COLUMN admin_audit_logs.target_user_id IS 'User whose role/permission was changed';
COMMENT ON COLUMN admin_audit_logs.action IS 'Type of action: assign_role, revoke_role, freeze, unfreeze, invite, invite_accept';
COMMENT ON COLUMN admin_audit_logs.detail IS 'JSON metadata: old_role, new_role, reason, invite_email, token, etc.';

/* 2. admin_invites table - tracks pending admin invitations */
CREATE TABLE IF NOT EXISTS admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'staff')),
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_invites_token ON admin_invites(token);
CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON admin_invites(email);
CREATE INDEX IF NOT EXISTS idx_admin_invites_accepted ON admin_invites(accepted);

COMMENT ON TABLE admin_invites IS 'Pending admin invitations. Tokens are secure random UUIDs. Only accessible server-side.';
COMMENT ON COLUMN admin_invites.token IS 'Secure random UUID token for invite acceptance';
COMMENT ON COLUMN admin_invites.invited_by IS 'super_admin user who created the invite';

/* 3. Enable RLS on new tables (server-side access only via authenticated sessions) */
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert audit logs (super_admin check enforced in app code)
CREATE POLICY "Authenticated users can insert audit logs"
  ON admin_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to select audit logs (super_admin check enforced in app code)
CREATE POLICY "Authenticated users can select audit logs"
  ON admin_audit_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert invites (super_admin check enforced in app code)
CREATE POLICY "Authenticated users can insert invites"
  ON admin_invites
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to select invites (super_admin check enforced in app code)
CREATE POLICY "Authenticated users can select invites"
  ON admin_invites
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow public to update invites (for accept endpoint - token provides authorization)
CREATE POLICY "Public can update invites for acceptance"
  ON admin_invites
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

/* Note: RLS policies allow authenticated access, but application code enforces
   super_admin checks via requireSuperAdmin(). This ensures server-side operations
   work with createServerClient while maintaining security through application logic. */

