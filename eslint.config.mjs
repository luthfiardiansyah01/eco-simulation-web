import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["scripts/**/*.js"],
    rules: {
      // Standalone Node scripts intentionally use CommonJS.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "android/**",
    "next-env.d.ts",
    // Generated test and coverage output.
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    // Browser service worker globals are not part of the app TS environment.
    "public/sw.js",
  ]),
]);

export default eslintConfig;
