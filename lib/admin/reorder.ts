import { createServiceRoleClient } from "@/lib/supabase/server";
import { createAudit } from "@/lib/audit/log";

interface ReorderItem {
  id: string;
  order_index: number;
}

/**
 * Updates the order_index for a batch of items in a specific table.
 * Uses service role client as these are admin operations.
 */
export async function updateOrderIndices(
  tableName: string,
  items: ReorderItem[],
  actorId: string
) {
  const supabase = createServiceRoleClient();

  // We'll do this in a loop or via a custom RPC if performance demands, 
  // but for < 20 items, individual updates are acceptable or we can construct a single query.
  // Supabase doesn't support multi-row update with different values easily in one go without RPC.
  // We will use Promise.all for parallel updates.

  const updates = items.map((item) =>
    supabase
      .from(tableName as any)
      .update({ order_index: item.order_index } as unknown as never)
      .eq("id", item.id)
  );

  await Promise.all(updates);

  await createAudit(actorId, `reorder_${tableName}`, {
    count: items.length,
    item_ids: items.map((i) => i.id),
  });

  return { success: true };
}
