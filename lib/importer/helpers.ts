import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Normalize enum field by removing NBSP, collapsing spaces, and trimming
 * Used for: Occasion, Style, Season
 */
export function normalizeEnumField(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/\u00A0/g, " ")     // convert NBSP → normal space
    .replace(/\s+/g, " ")         // collapse multiple spaces
    .trim();
}

/**
 * Normalize category field by removing NBSP, collapsing spaces, and trimming
 * Used for: Super Category, Category, Subcategory
 */
export function normalizeCategoryField(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/\u00A0/g, " ")     // convert NBSP → normal space
    .replace(/\s+/g, " ")         // collapse multiple spaces
    .trim();
}

/**
 * Get enum values from PostgreSQL enum type
 * Returns array of valid enum values for validation
 */
export async function getEnumValues(enumType: string): Promise<string[]> {
  const supabase = createServiceRoleClient();
  
  try {
    const { data, error } = await supabase.rpc("get_enum_values", { enum_name: enumType });
    
    if (error) {
      console.warn(`⚠️ Failed to fetch enum values for ${enumType}:`, error.message);
      // Return empty array if RPC fails - validation will be skipped
      return [];
    }
    
    return data || [];
  } catch (err: any) {
    console.warn(`⚠️ Exception fetching enum values for ${enumType}:`, err.message);
    return [];
  }
}













