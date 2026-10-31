import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

// Define project root for TypeScript parsing
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Project boundaries. `libs/shared` may not reach into an app, and no app may reach
 * into another app — cross-app code belongs in `libs/shared`. Relative imports are
 * banned everywhere so every import goes through a path alias (`@soundcircle/shared/...`,
 * `@apps/<app>/...`), which is what keeps a file movable.
 */
const APPS = ["core-api"];

const boundaryPatterns = (allowedApp) => [
  "./**/*",
  "../**/*",
  ...APPS.filter((app) => app !== allowedApp).map((app) => `@apps/${app}/*`),
  ...APPS.filter((app) => app !== allowedApp).map((app) => `@apps/${app}`),
];

const boundary = (allowedApp) => ({
  files: allowedApp ? [`apps/${allowedApp}/**/*.ts`] : ["libs/shared/**/*.ts"],
  rules: {
    "no-restricted-imports": ["error", { patterns: boundaryPatterns(allowedApp) }],
  },
});

export default [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "**/*.d.ts", "eslint.config.mjs"],
  },
  js.configs.recommended, // Default JavaScript ESLint rules
  prettierConfig, // Disables ESLint rules that conflict with Prettier
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: [path.resolve(__dirname, "tsconfig.json")],
        tsconfigRootDir: __dirname,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": ts,
      prettier,
    },
    settings: {},
    files: ["**/*.ts"],
    linterOptions: {
      noInlineConfig: true,
    },
    rules: {
      "prefer-const": "error",
      "prettier/prettier": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-duplicate-enum-values": "error",
      "@typescript-eslint/no-mixed-enums": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-empty": "off",
      "no-useless-catch": "off",
      "no-case-declarations": "off",
      "no-dupe-else-if": "off",
    },
  },
  boundary(null),
  ...APPS.map((app) => boundary(app)),
];
