import { createServiceRoleClient } from "@/lib/supabase/server";
import { CollectionRule } from "@/lib/admin/validators";

export async function evaluateRules(rules: CollectionRule[]): Promise<string[]> {
  const supabase = createServiceRoleClient();
  let query = supabase.from("products").select("uid").eq("active", true); // Only active? Or all? Smart collections usually public.

  // Apply filters
  // Supported: field, operator, value
  // fields: tags, category, price, season, occasion, featured, created_at
  
  for (const rule of rules) {
    switch (rule.field) {
      case "price":
        applyNumericFilter(query, "price", rule.operator, rule.value);
        break;
      case "featured":
        if (rule.operator === "equals") query = query.eq("is_featured", rule.value);
        break;
      case "category":
        // Assuming join or simple match if denormalized?
        // We don't have easy join filtering in builder without raw SQL usually.
        // Assuming normalized 'category_id' or we filter by joining categories table.
        // Simplest: if rule.value is category ID or Slug?
        // Let's assume we store category_id in products.
        if (rule.operator === "equals") query = query.eq("category_id", rule.value); 
        break;
      case "tags":
        // products.tags is text[]
        if (rule.operator === "contains") query = query.contains("tags", [rule.value]);
        break;
      case "season":
        if (rule.operator === "equals") query = query.eq("season", rule.value);
        break;
      case "occasion":
        if (rule.operator === "equals") query = query.eq("occasion", rule.value);
        break;
      case "created_at":
        // Date operators
        applyDateFilter(query, "created_at", rule.operator, rule.value);
        break;
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("Rule evaluation error:", error);
    return [];
  }
  const typedData = (data || []) as Array<{ uid: string }>;
  return typedData.map(p => p.uid);
}

function applyNumericFilter(query: any, col: string, op: string, val: any) {
  if (op === "equals") query.eq(col, val);
  if (op === "gt") query.gt(col, val);
  if (op === "lt") query.lt(col, val);
  if (op === "between" && Array.isArray(val)) query.gte(col, val[0]).lte(col, val[1]);
}

function applyDateFilter(query: any, col: string, op: string, val: any) {
  if (op === "gt") query.gt(col, val); // After
  if (op === "lt") query.lt(col, val); // Before
}

