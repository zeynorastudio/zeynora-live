import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    console.log("🔍 API: check-role called");
    
    const supabase = await createServerClient();
    
    console.log("🔍 API: Getting user (secure)...");
    // Use getUser() instead of getSession() for security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log("🔍 API: User data:", {
      hasUser: !!user,
      userId: user?.id,
      error: userError
    });

    if (userError || !user) {
      console.error("❌ API: No user found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;
    console.log("👤 API: User ID:", userId);

    console.log("🔍 API: Fetching user role...");
    const { data: userRow, error } = await supabase
      .from("users")
      .select("role")
      .eq("auth_uid", userId)
      .single();

    // Type assertion
    const typedUserRow = userRow as { role: string } | null;

    console.log("🔍 API: User query result:", {
      hasData: !!typedUserRow,
      role: typedUserRow?.role,
      error: error
    });

    if (error) {
      console.error("❌ API: Database error:", error);
      return NextResponse.json(
        { error: "Database error: " + error.message },
        { status: 500 }
      );
    }

    if (!typedUserRow?.role) {
      console.error("❌ API: No role found for user");
      return NextResponse.json(
        { error: "Role not assigned" },
        { status: 403 }
      );
    }

    console.log("✅ API: Returning role:", typedUserRow.role);
    return NextResponse.json({ role: typedUserRow.role });
    
  } catch (error: any) {
    console.error("💥 API: Unexpected error:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
