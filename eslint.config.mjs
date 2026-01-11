import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "node_modules/**",
    ],
  },
  {
    rules: {
      // TODO: Fix all explicit any types throughout codebase - temporarily downgraded to warning
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars are warnings, not errors
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow unescaped entities temporarily
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default eslintConfig;
