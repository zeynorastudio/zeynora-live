import { ProductCSVRow, VariantCSVRow, NormalizedProduct, NormalizedVariant } from "./types";
import { InvalidFieldError } from "./errors";
import slugify from "slugify";
import { normalizeEnumField, normalizeCategoryField } from "./helpers";

function safeSlugify(text: string): string {
  if (!text) return "";
  return slugify(text, { lower: true, strict: true, trim: true });
}

function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove currency symbols, commas, etc.
  const clean = value.replace(/[^0-9.-]+/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function normalizeProductRow(row: ProductCSVRow): NormalizedProduct {
  // 1. Slug
  let slug = row.Slug;
  if (!slug) {
    slug = safeSlugify(row["Product Name"]);
  } else {
    slug = safeSlugify(slug);
  }

  // 2. Colors
  let colors = (row.Colors || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const isSingleColor = colors.length === 1;
  
  if (isSingleColor) {
    colors = ["default"];
  }

  // 3. Sizes with Stock
  // Format: "S:10|M:5"
  const sizesWithStockStr = row.Sizes_With_Stock || "";
  const sizesWithStock: Record<string, number> = {};
  
  if (sizesWithStockStr) {
    const parts = sizesWithStockStr.split("|");
    parts.forEach((part) => {
      const [size, stockStr] = part.split(":").map((s) => s.trim());
      if (size && stockStr) {
        sizesWithStock[size] = parseInt(stockStr, 10) || 0;
      }
    });
  }

  // 4. Tags
  const tags = (row.Tags || "")
    .split(",")
    .map((t) => safeSlugify(t))
    .filter(Boolean);

  // 5. Prices
  const price = parseCurrency(row.Price);
  const costPrice = parseCurrency(row["Cost Price"]);
  const profitPercentage = parseCurrency(row["Profit %"]);
  const profitAmount = parseCurrency(row["Profit Amount"]);

  if (price < 0) {
    throw new InvalidFieldError("Price", row.Price, "Price must be non-negative");
  }

  // 6. Booleans
  const isFeatured = row.Featured?.toLowerCase() === "true" || row.Featured === "1";
  const isBestSelling = row["Best Selling"]?.toLowerCase() === "true" || row["Best Selling"] === "1";
  const isActive = row.Active?.toLowerCase() === "true" || row.Active === "1";

  return {
    uid: row.UID || "", // UID should be generated before normalization if missing
    name: row["Product Name"],
    slug,
    category: normalizeCategoryField(row.Category),
    super_category: normalizeCategoryField(row["Super Category"]),
    subcategory: normalizeCategoryField(row.Subcategory),
    style: normalizeEnumField(row.Style),
    occasion: normalizeEnumField(row.Occasion),
    season: normalizeEnumField(row.Season),
    is_featured: isFeatured,
    is_best_selling: isBestSelling,
    is_active: isActive,
    price,
    cost_price: costPrice,
    profit_percentage: profitPercentage,
    profit_amount: profitAmount,
    seo_title: row["SEO Title"] || row["Product Name"],
    seo_description: row["SEO Description"],
    colors,
    sizes_with_stock: sizesWithStock,
    tags,
    single_color: isSingleColor,
    main_image_url: row["Main Image URL"],
  };
}

export function normalizeVariantRow(row: VariantCSVRow, product?: NormalizedProduct): NormalizedVariant {
  // 1. SKU
  let sku = row.Variant_SKU;
  if (!sku && product) {
    const colorSlug = safeSlugify(row.Color || "default");
    const sizeSlug = safeSlugify(row.Size || "os");
    sku = `${product.uid}-${colorSlug}-${sizeSlug}`.toUpperCase();
  } else if (!sku) {
     sku = `UNKNOWN-${Date.now()}`;
  }

  // 2. Images JSON
  let images: string[] = [];
  if (row.Images_JSON) {
    try {
      const parsed = JSON.parse(row.Images_JSON);
      if (Array.isArray(parsed)) {
        images = parsed.map(String);
      }
    } catch (e) {
      // ignore invalid json
    }
  }

  // 3. Price/Cost fallback
  const price = row.Price ? parseCurrency(row.Price) : (product?.price || 0);
  const cost = row.Cost ? parseCurrency(row.Cost) : (product?.cost_price || 0);
  const stock = parseInt(row.Stock || "0", 10);

  // 4. Active
  const isActive = row.Active?.toLowerCase() === "true" || row.Active === "1";

  // 5. Color and Size - sanitize
  const color = normalizeCategoryField(row.Color);
  const size = normalizeCategoryField(row.Size);
  
  return {
    product_uid: row.Product_UID,
    sku,
    color: color || null,
    size: size || null,
    stock: stock >= 0 ? stock : 0,
    price,
    cost,
    is_active: isActive,
    images,
  };
}

export function validateProductRow(row: ProductCSVRow): boolean {
  // Simple check, real validation in index via Zod
  return !!row.UID && !!row["Product Name"];
}

export function validateVariantRow(row: VariantCSVRow): boolean {
  return !!row.Product_UID;
}
