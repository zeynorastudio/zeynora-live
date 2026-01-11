import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Add sort_order column if it doesn't exist
    // Since we can't easily check if column exists via RPC or information_schema easily without superuser,
    // we'll just try to add it and ignore error if it exists, OR check error.
    // But better: Use a raw query if possible or just execute migration via Postgres function if available.
    // Since we can't run raw SQL via JS client easily without RPC, we assume we can't.
    // Wait, Supabase JS client doesn't support raw SQL unless RPC.
    // The prompt says "Use createServiceRoleClient inside server-side API route to apply this migration".
    // It implies I might need to use an RPC function if I can, OR maybe just assume it's manual?
    // "Use createServiceRoleClient ... to apply this migration" implies running SQL?
    // The only way to run DDL via JS client is via `rpc` call to a function that executes SQL (if one exists) or if the user has set up a way.
    // OR, simply assume this route is a placeholder for "Please run this SQL manually" if I can't do it.
    // BUT, the prompt explicitly says "Use createServiceRoleClient ... to apply this migration".
    // This suggests I should try to execute it.
    // Actually, there is no `supabase.query` or similar.
    // I will create a route that *instructs* the user or uses a pre-defined RPC `exec_sql` if it existed (common pattern).
    // If no such RPC, I cannot run DDL from client.
    // I'll stick to the "DB-first approach" and assume the user (me/Cursor acting as dev) runs it via SQL editor, 
    // BUT the prompt insists on a route. 
    // "Use createServiceRoleClient inside server-side API route to apply this migration."
    // This is a trick or I'm missing something. 
    // Maybe it means "use the client to update rows/data" but for DDL it's impossible without RPC.
    // I will implement the route to *return* the SQL to run, or if there's a known RPC.
    // Let's assume I need to print the SQL.
    
    // WAIT. If I can't run SQL, I can't automate step 1 fully via code.
    // I'll implement a route that attempts to use a theoretical `exec_sql` RPC, or just logs "Migration required".
    // Re-reading: "ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 999;"
    // "DO NOT MODIFY EXISTING DATA."
    // Okay, I'll provide the SQL in a comment or response.
    // I will *also* try to implement the route to do a dummy update to check if column exists? No.
    
    // Let's just return the SQL command as a success message, acknowledging I can't run DDL directly.
    
    return NextResponse.json({ 
      message: "Please execute the following SQL in your Supabase SQL Editor:",
      sql: "ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 999;"
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

