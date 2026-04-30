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
const stagedTypedRules = {
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
  "@typescript-eslint/restrict-template-expressions": "warn",
  "@typescript-eslint/switch-exhaustiveness-check": "warn",
};

const config = [
  ...next,
  {
    ignores: allmeIgnores,
  },
  {
    files: [...coreLogicFiles, ...queryActionFiles],
    rules: {
      ...advisoryComplexityRules,
      "max-lines": [
        "warn",
        {
          max: 300,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  ...typedRuleConfig(tseslint, coreLogicFiles, stagedTypedRules),
  ...typedRuleConfig(tseslint, queryActionFiles, stagedTypedRules),
];

export default config;
