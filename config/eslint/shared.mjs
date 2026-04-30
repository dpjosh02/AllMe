export const allmeIgnores = [
  ".next/**",
  "coverage/**",
  "db/migrations/**",
  "node_modules/**",
  "playwright-report/**",
  "test-results/**",
];

export const coreLogicFiles = [
  "src/server/**/*.ts",
  "src/lib/**/*.ts",
  "scripts/**/*.ts",
  "src/features/finance/imports/**/*.ts",
  "src/features/finance/categorization/**/*.ts",
];

export const queryActionFiles = [
  "src/features/finance/dashboard/queries.ts",
  "src/features/finance/dashboard/actions.ts",
  "src/features/settings/**/*.ts",
  "src/features/today/**/*.ts",
];

export const advisoryComplexityRules = {
  complexity: ["warn", { max: 12 }],
  "max-depth": ["warn", 4],
  "max-lines": [
    "warn",
    {
      max: 350,
      skipBlankLines: true,
      skipComments: true,
    },
  ],
  "max-lines-per-function": [
    "warn",
    {
      max: 80,
      skipBlankLines: true,
      skipComments: true,
    },
  ],
};

export async function loadTypeScriptEslint() {
  try {
    const typescriptEslintModule = await import("typescript-eslint");
    return typescriptEslintModule.default ?? typescriptEslintModule;
  } catch {
    return null;
  }
}

export function typedRuleConfig(tseslint, files, rules) {
  if (!tseslint) {
    return [];
  }

  return [
    {
      files,
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          project: true,
          tsconfigRootDir: new URL("../..", import.meta.url).pathname,
        },
      },
      plugins: {
        "@typescript-eslint": tseslint.plugin,
      },
      rules,
    },
  ];
}
