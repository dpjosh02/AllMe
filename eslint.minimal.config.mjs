import next from "eslint-config-next";
import {
  advisoryComplexityRules,
  allmeIgnores,
  coreLogicFiles,
  loadTypeScriptEslint,
  typedRuleConfig,
} from "./config/eslint/shared.mjs";

const tseslint = await loadTypeScriptEslint();

const config = [
  ...next,
  {
    ignores: allmeIgnores,
  },
  {
    files: coreLogicFiles,
    rules: advisoryComplexityRules,
  },
  ...typedRuleConfig(tseslint, coreLogicFiles, {
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        fixStyle: "inline-type-imports",
        prefer: "type-imports",
      },
    ],
    "@typescript-eslint/no-floating-promises": "warn",
    "@typescript-eslint/no-misused-promises": "warn",
    "@typescript-eslint/no-unnecessary-condition": "warn",
  }),
  {
    files: [
      "scripts/finance-categorize.ts",
      "scripts/finance-clear-test-data.ts",
      "scripts/fintable-import.ts",
      "src/server/auth/config.ts",
    ],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  {
    files: ["scripts/finance-seed-test-data.ts"],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
    },
  },
  {
    files: ["src/server/db/schema.ts"],
    rules: {
      "max-lines": "off",
    },
  },
];

export default config;
