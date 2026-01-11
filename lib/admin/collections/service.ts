import { createServiceRoleClient } from "@/lib/supabase/server";
import { CollectionInput, CollectionRule } from "@/lib/admin/validators";
import { evaluateRules } from "@/lib/admin/collection-rules/evaluator";

export async function createCollection(input: CollectionInput, userId: string) {
  const supabase = createServiceRoleClient();
  
  // 1. Create Collection
  const { data: collection, error } = await supabase
    .from("collections")
    .insert({
      ...input,
      created_by: userId
    } as unknown as never)
    .select()
    .single();

  if (error) throw error;

  // 2. If Smart, evaluate and link products
  const typedCollection = collection as { id: string; is_manual: boolean } | null;
  if (typedCollection && !typedCollection.is_manual && input.rule_json) {
    await refreshSmartCollection(typedCollection.id, input.rule_json);
  }

  return collection;
}

export async function updateCollection(id: string, input: Partial<CollectionInput>) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("collections")
    .update(input as unknown as never)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Refresh if rules changed
  const typedData = data as { is_manual: boolean } | null;
  if (input.rule_json && typedData && !typedData.is_manual) {
    await refreshSmartCollection(id, input.rule_json);
  }

  return data;
}

export async function deleteCollection(id: string) {
  const supabase = createServiceRoleClient();
  // Delete collection. Links in collection_products should cascade if configured, or manual delete.
  // Assuming cascade on DB.
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw error;
}

export async function refreshSmartCollection(collectionId: string, rules: CollectionRule[]) {
  const supabase = createServiceRoleClient();
  
  // 1. Evaluate Rules -> Get Product IDs
  const productIds = await evaluateRules(rules);

  // 2. Sync collection_products
  // Delete old
  await supabase.from("collection_products").delete().eq("collection_id", collectionId);
  
  // Insert new
  if (productIds.length > 0) {
    const links = productIds.map(pid => ({
      collection_id: collectionId,
      product_uid: pid
    }));
    await supabase.from("collection_products").insert(links as unknown as never);
  }
}

export async function manualAssign(collectionId: string, productUids: string[], action: "add" | "remove") {
  const supabase = createServiceRoleClient();
  if (action === "add") {
    const links = productUids.map(uid => ({
      collection_id: collectionId,
      product_uid: uid
    }));
    await supabase.from("collection_products").upsert(links as unknown as never, { onConflict: "collection_id,product_uid" as any });
  } else {
    await supabase.from("collection_products").delete()
      .eq("collection_id", collectionId)
      .in("product_uid", productUids);
  }
}

