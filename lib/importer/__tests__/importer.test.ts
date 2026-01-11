import { normalizeProductRow, normalizeVariantRow } from "../normalizers";
import { mergeProductAndVariantData } from "../merger";
import { ProductCSVRow, VariantCSVRow, NormalizedProduct } from "../types";

describe("Importer Normalizers", () => {
  test("normalizeProductRow handles single color logic", () => {
    const row = {
      UID: "P1",
      "Product Name": "Single Color Product",
      Colors: "Red",
      Sizes_With_Stock: "S:10",
      Price: "100"
    } as unknown as ProductCSVRow;

    const normalized = normalizeProductRow(row);
    
    expect(normalized.colors).toEqual(["default"]);
    expect(normalized.single_color).toBe(true);
    expect(normalized.sizes_with_stock).toEqual({ S: 10 });
  });

  test("normalizeProductRow handles multiple colors", () => {
    const row = {
      UID: "P2",
      "Product Name": "Multi Color",
      Colors: "Red, Blue",
      Sizes_With_Stock: "S:10",
      Price: "100"
    } as unknown as ProductCSVRow;

    const normalized = normalizeProductRow(row);
    
    expect(normalized.colors).toEqual(["Red", "Blue"]);
    expect(normalized.single_color).toBe(false);
  });
});

describe("Importer Normalizer - Variant", () => {
  test("normalizeVariantRow generates SKU if missing", () => {
    const product = {
      uid: "P1",
      price: 100,
      cost_price: 50
    } as NormalizedProduct;

    const row = {
      Product_UID: "P1",
      Color: "Red",
      Size: "L",
      Stock: "5"
    } as unknown as VariantCSVRow;

    const normalized = normalizeVariantRow(row, product);
    
    expect(normalized.sku).toBe("P1-RED-L");
    expect(normalized.price).toBe(100); // Inherited
  });
});

describe("Importer Merger", () => {
  test("mergeProductAndVariantData prioritizes CSV variants", () => {
    const product = {
      uid: "P1",
      colors: ["Red", "Blue"],
      sizes_with_stock: { S: 10 },
      price: 100,
      cost_price: 50,
      is_active: true
    } as NormalizedProduct;

    const variants = [
      {
        product_uid: "P1",
        sku: "CUSTOM-SKU",
        color: "Red",
        size: "S",
        stock: 99,
        price: 120,
        cost: 60,
        is_active: true,
        images: []
      }
    ];

    const result = mergeProductAndVariantData(product, variants);
    
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe("CUSTOM-SKU");
    expect(result[0].stock).toBe(99);
  });

  test("mergeProductAndVariantData generates from seed if no CSV variants", () => {
    const product = {
      uid: "P1",
      colors: ["Red", "Blue"],
      sizes_with_stock: { S: 10, M: 5 },
      price: 100,
      cost_price: 50,
      is_active: true
    } as NormalizedProduct;

    const result = mergeProductAndVariantData(product, []);
    
    // 2 colors * 2 sizes = 4 variants
    expect(result).toHaveLength(4);
    
    const skus = result.map(v => v.sku);
    expect(skus).toContain("P1-RED-S");
    expect(skus).toContain("P1-BLUE-M");
  });
});

