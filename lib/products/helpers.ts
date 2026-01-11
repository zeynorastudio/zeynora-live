/**
 * Product Data Model Helpers - Phase 1.1
 * 
 * This module provides unified logic for:
 * - Category auto-derivation from subcategory
 * - Tag auto-generation (no manual tags)
 * - Subcategory parsing
 * - Effective category resolution
 */

import slugify from "slugify";

/**
 * Parse subcategory string in format "Subcategory Name (Category Name)"
 * Returns { subcategory: "Subcategory Name", derivedCategory: "Category Name" }
 * 
 * Examples:
 * - "Anarkali (Wedding & Bridal)" → { subcategory: "Anarkali", derivedCategory: "Wedding & Bridal" }
 * - "Sarees" → { subcategory: "Sarees", derivedCategory: null }
 */
export function parseSubcategoryWithCategory(input: string): {
  subcategory: string;
  derivedCategory: string | null;
} {
  if (!input || typeof input !== "string") {
    return { subcategory: "", derivedCategory: null };
  }

  const trimmed = input.trim();
  
  // Check for format: "Name (Category)"
  const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
  
  if (match) {
    return {
      subcategory: match[1].trim(),
      derivedCategory: match[2].trim(),
    };
  }
  
  // No parentheses - just subcategory name
  return {
    subcategory: trimmed,
    derivedCategory: null,
  };
}

/**
 * Resolve effective category
 * Priority: category_override > derived_category > super_category > null
 */
export function resolveEffectiveCategory(
  categoryOverride: string | null | undefined,
  derivedCategory: string | null | undefined,
  superCategory: string | null | undefined
): string | null {
  if (categoryOverride && categoryOverride.trim()) {
    return categoryOverride.trim();
  }
  
  if (derivedCategory && derivedCategory.trim()) {
    return derivedCategory.trim();
  }
  
  if (superCategory && superCategory.trim()) {
    return superCategory.trim();
  }
  
  return null;
}

/**
 * Slugify a string for use in tags and URLs
 * Lowercase, hyphenated, no special characters
 */
export function slugifyTag(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string" || !input.trim()) {
    return null;
  }
  
  return slugify(input.trim(), {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });
}

/**
 * Auto-generate tags from product attributes
 * 
 * Tags are generated from:
 * - effectiveCategory
 * - subcategory
 * - occasion
 * - style
 * - season
 * - visibility flags (featured, best_selling, new_launch)
 * 
 * All tags are:
 * - Lowercase
 * - Hyphenated
 * - Unique
 * - Deterministic (same input → same output)
 * 
 * NO MANUAL TAGS ALLOWED
 */
export function generateProductTags(input: {
  effectiveCategory?: string | null;
  subcategory?: string | null;
  occasion?: string | null;
  style?: string | null;
  season?: string | null;
  is_featured?: boolean | null;
  is_best_selling?: boolean | null;
  is_new_launch?: boolean | null;
}): string[] {
  const tags: string[] = [];
  
  // Add category tag
  if (input.effectiveCategory) {
    const categoryTag = slugifyTag(input.effectiveCategory);
    if (categoryTag) tags.push(categoryTag);
  }
  
  // Add subcategory tag
  if (input.subcategory) {
    const subcategoryTag = slugifyTag(input.subcategory);
    if (subcategoryTag) tags.push(subcategoryTag);
  }
  
  // Add occasion tag
  if (input.occasion) {
    const occasionTag = slugifyTag(input.occasion);
    if (occasionTag) tags.push(occasionTag);
  }
  
  // Add style tag
  if (input.style) {
    const styleTag = slugifyTag(input.style);
    if (styleTag) tags.push(styleTag);
  }
  
  // Add season tag
  if (input.season) {
    const seasonTag = slugifyTag(input.season);
    if (seasonTag) tags.push(seasonTag);
  }
  
  // Add visibility flag tags
  if (input.is_featured === true) {
    tags.push("featured");
  }
  
  if (input.is_best_selling === true) {
    tags.push("best-selling");
  }
  
  if (input.is_new_launch === true) {
    tags.push("new-launch");
  }
  
  // Remove duplicates and empty values
  const uniqueTags = Array.from(new Set(tags.filter((tag) => tag && tag.length > 0)));
  
  // Sort for deterministic output
  return uniqueTags.sort();
}

/**
 * Process product input for save (create or update)
 * 
 * This function:
 * 1. Parses subcategory to extract derived category
 * 2. Resolves effective category
 * 3. Auto-generates tags
 * 4. Returns processed data ready for DB insert/update
 */
export interface ProcessProductInputParams {
  // Subcategory input (may contain category in parentheses)
  subcategoryInput?: string | null;
  
  // Optional manual overrides
  categoryOverride?: string | null;
  superCategory?: string | null;
  
  // Attributes for tag generation
  occasion?: string | null;
  style?: string | null;
  season?: string | null;
  
  // Visibility flags
  is_featured?: boolean | null;
  is_best_selling?: boolean | null;
  is_new_launch?: boolean | null;
}

export interface ProcessedProductData {
  // Clean subcategory name (without parentheses)
  subcategory: string | null;
  
  // Auto-derived category from subcategory
  derivedCategory: string | null;
  
  // Effective category (priority: override > derived > super)
  effectiveCategory: string | null;
  
  // Auto-generated tags (no manual input)
  tags: string[];
  
  // Category override (if provided)
  categoryOverride: string | null;
}

export function processProductInput(input: ProcessProductInputParams): ProcessedProductData {
  // Parse subcategory
  const { subcategory, derivedCategory } = parseSubcategoryWithCategory(
    input.subcategoryInput || ""
  );
  
  // Resolve effective category
  const effectiveCategory = resolveEffectiveCategory(
    input.categoryOverride,
    derivedCategory,
    input.superCategory
  );
  
  // Generate tags
  const tags = generateProductTags({
    effectiveCategory,
    subcategory: subcategory || null,
    occasion: input.occasion,
    style: input.style,
    season: input.season,
    is_featured: input.is_featured,
    is_best_selling: input.is_best_selling,
    is_new_launch: input.is_new_launch,
  });
  
  return {
    subcategory: subcategory || null,
    derivedCategory: derivedCategory || null,
    effectiveCategory,
    tags,
    categoryOverride: input.categoryOverride || null,
  };
}
















