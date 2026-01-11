import { createServiceRoleClient } from "@/lib/supabase/server";

export async function createAudit(
  actor_id: string | null,
  event: string,
  details: Record<string, any> = {}
) {
  try {
    const supabase = createServiceRoleClient();
    
    const { error } = await supabase.from("audit_logs").insert({
      actor_id,
      event,
      details,
    } as any);

    if (error) {
      console.error("Failed to write audit log:", error);
    }
  } catch (err) {
    console.error("Error writing audit log:", err);
  }
}
