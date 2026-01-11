import { productCreateSchema } from "../schemas";
import { generateUniqueSlug } from "../slug";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null })) // Always unique
        }))
      }))
    }))
  }))
}));

describe("Product Schemas", () => {
  test("validates correct product input", () => {
    const input = {
      name: "Valid Product",
      slug: "valid-product",
      price: 100,
      cost_price: 50,
      tags: ["tag1"],
      colors: ["Red"],
      sizes_with_stock: "S:10"
    };
    const result = productCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  test("rejects invalid price", () => {
    const input = {
      name: "Invalid",
      slug: "invalid",
      price: -10
    };
    const result = productCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("Slug Generation", () => {
  test("generates slug correctly", async () => {
    const slug = await generateUniqueSlug("test-slug");
    expect(slug).toBe("test-slug");
  });
});

