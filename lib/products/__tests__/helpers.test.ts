/**
 * Tests for Phase 1.1 Product Helpers
 */

import {
  parseSubcategoryWithCategory,
  resolveEffectiveCategory,
  slugifyTag,
  generateProductTags,
  processProductInput,
} from "../helpers";

describe("parseSubcategoryWithCategory", () => {
  test("parses subcategory with category in parentheses", () => {
    const result = parseSubcategoryWithCategory("Anarkali (Wedding & Bridal)");
    expect(result).toEqual({
      subcategory: "Anarkali",
      derivedCategory: "Wedding & Bridal",
    });
  });

  test("handles subcategory without category", () => {
    const result = parseSubcategoryWithCategory("Sarees");
    expect(result).toEqual({
      subcategory: "Sarees",
      derivedCategory: null,
    });
  });

  test("handles empty input", () => {
    const result = parseSubcategoryWithCategory("");
    expect(result).toEqual({
      subcategory: "",
      derivedCategory: null,
    });
  });
});

describe("resolveEffectiveCategory", () => {
  test("prioritizes category override", () => {
    const result = resolveEffectiveCategory("Override", "Derived", "Super");
    expect(result).toBe("Override");
  });

  test("falls back to derived category", () => {
    const result = resolveEffectiveCategory(null, "Derived", "Super");
    expect(result).toBe("Derived");
  });

  test("falls back to super category", () => {
    const result = resolveEffectiveCategory(null, null, "Super");
    expect(result).toBe("Super");
  });

  test("returns null when all are empty", () => {
    const result = resolveEffectiveCategory(null, null, null);
    expect(result).toBe(null);
  });
});

describe("slugifyTag", () => {
  test("converts to lowercase and hyphenates", () => {
    expect(slugifyTag("Wedding & Bridal")).toBe("wedding-bridal");
  });

  test("handles single words", () => {
    expect(slugifyTag("Anarkali")).toBe("anarkali");
  });

  test("removes special characters", () => {
    expect(slugifyTag("Party Night!")).toBe("party-night");
  });

  test("handles null/empty input", () => {
    expect(slugifyTag(null)).toBe(null);
    expect(slugifyTag("")).toBe(null);
    expect(slugifyTag("  ")).toBe(null);
  });
});

describe("generateProductTags", () => {
  test("generates tags from all attributes", () => {
    const tags = generateProductTags({
      effectiveCategory: "Wedding & Bridal",
      subcategory: "Anarkali",
      occasion: "Party Night",
      style: "Semi-Formal",
      season: "Winter",
      is_featured: true,
      is_best_selling: true,
      is_new_launch: true,
    });

    expect(tags).toContain("wedding-bridal");
    expect(tags).toContain("anarkali");
    expect(tags).toContain("party-night");
    expect(tags).toContain("semi-formal");
    expect(tags).toContain("winter");
    expect(tags).toContain("featured");
    expect(tags).toContain("best-selling");
    expect(tags).toContain("new-launch");
  });

  test("only includes provided attributes", () => {
    const tags = generateProductTags({
      effectiveCategory: "Ethnic",
      subcategory: "Sarees",
      is_featured: true,
    });

    expect(tags).toContain("ethnic");
    expect(tags).toContain("sarees");
    expect(tags).toContain("featured");
    expect(tags).not.toContain("best-selling");
    expect(tags).not.toContain("new-launch");
  });

  test("returns empty array for empty input", () => {
    const tags = generateProductTags({});
    expect(tags).toEqual([]);
  });

  test("removes duplicates and sorts", () => {
    const tags = generateProductTags({
      effectiveCategory: "Ethnic",
      subcategory: "Anarkali",
      style: "Anarkali", // Duplicate slug
    });

    expect(tags).toEqual(["anarkali", "ethnic"]);
  });
});

describe("processProductInput", () => {
  test("processes complete product input", () => {
    const result = processProductInput({
      subcategoryInput: "Anarkali (Wedding & Bridal)",
      categoryOverride: null,
      superCategory: null,
      occasion: "Party Night",
      style: "Semi-Formal",
      season: "Winter",
      is_featured: true,
      is_best_selling: false,
      is_new_launch: true,
    });

    expect(result.subcategory).toBe("Anarkali");
    expect(result.derivedCategory).toBe("Wedding & Bridal");
    expect(result.effectiveCategory).toBe("Wedding & Bridal");
    expect(result.categoryOverride).toBe(null);
    expect(result.tags).toContain("wedding-bridal");
    expect(result.tags).toContain("anarkali");
    expect(result.tags).toContain("featured");
    expect(result.tags).toContain("new-launch");
  });

  test("prioritizes category override", () => {
    const result = processProductInput({
      subcategoryInput: "Anarkali (Wedding & Bridal)",
      categoryOverride: "Festive Collection",
      superCategory: null,
      is_featured: false,
      is_best_selling: false,
      is_new_launch: false,
    });

    expect(result.effectiveCategory).toBe("Festive Collection");
    expect(result.categoryOverride).toBe("Festive Collection");
    expect(result.tags).toContain("festive-collection");
  });

  test("handles minimal input", () => {
    const result = processProductInput({
      subcategoryInput: "Sarees",
    });

    expect(result.subcategory).toBe("Sarees");
    expect(result.derivedCategory).toBe(null);
    expect(result.effectiveCategory).toBe(null);
    expect(result.tags).toContain("sarees");
  });
});
















