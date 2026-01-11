import { evaluateRules } from "../collection-rules/evaluator";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gt: jest.fn(() => Promise.resolve({ data: [{ uid: "p1" }] })),
          lt: jest.fn(() => Promise.resolve({ data: [] })),
        })),
        contains: jest.fn(() => Promise.resolve({ data: [{ uid: "p2" }] }))
      }))
    }))
  }))
}));

describe("Collection Rules Evaluator", () => {
  test("evaluates price > 100", async () => {
    const rules = [{ field: "price" as const, operator: "gt" as const, value: 100 }];
    const result = await evaluateRules(rules);
    expect(result).toContain("p1");
  });

  test("evaluates tag contains", async () => {
    const rules = [{ field: "tags" as const, operator: "contains" as const, value: "summer" }];
    const result = await evaluateRules(rules);
    expect(result).toContain("p2");
  });
});

