import { createServerClient } from "@/lib/supabase/server";
import { UserRole } from "@/types/roles";

export async function getAdminSession(): Promise<{ user: any; role: UserRole } | null> {
  try {
    const supabase = await createServerClient();
    
    // Use getUser() instead of getSession() for better security
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: userRow, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_uid", user.id)
      .single();

    if (roleError || !userRow) {
      return null;
    }

    // Type assertion
    const typedUserRow = userRow as { role: string };
    return {
      user: user,
      role: typedUserRow.role as UserRole,
    };
  } catch (error) {
    console.error("Error in getAdminSession:", error);
    return null;
  }
}
