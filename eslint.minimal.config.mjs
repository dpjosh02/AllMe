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
];

export default config;
