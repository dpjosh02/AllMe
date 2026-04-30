import next from "eslint-config-next";
import {
  advisoryComplexityRules,
  allmeIgnores,
  coreLogicFiles,
  loadTypeScriptEslint,
  queryActionFiles,
  typedRuleConfig,
} from "./config/eslint/shared.mjs";

const tseslint = await loadTypeScriptEslint();
const typedRules = {
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
};

const config = [
  ...next,
  {
    ignores: allmeIgnores,
  },
  {
    files: [...coreLogicFiles, ...queryActionFiles],
    rules: advisoryComplexityRules,
  },
  ...typedRuleConfig(tseslint, coreLogicFiles, typedRules),
  ...typedRuleConfig(tseslint, queryActionFiles, typedRules),
];

export default config;
