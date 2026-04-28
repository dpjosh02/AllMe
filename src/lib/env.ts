import { z } from "zod";

import { assertValidAuthMode } from "@/server/auth/access-control";

const optionalNonEmptyString = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  emptyStringToUndefined,
  z.string().url().optional(),
);

const optionalEmail = z.preprocess(
  emptyStringToUndefined,
  z.string().email().optional(),
);

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    DATABASE_URL: optionalUrl,
    ALLME_AUTH_MODE: z.enum(["hosted", "local-owner"]).optional(),
    ALLME_IMPORT_USER_EMAIL: optionalEmail,
    AUTH_SECRET: optionalNonEmptyString,
    AUTH_GOOGLE_ID: optionalNonEmptyString,
    AUTH_GOOGLE_SECRET: optionalNonEmptyString,
    GOOGLE_SHEETS_API_KEY: optionalNonEmptyString,
    GOOGLE_APPLICATION_CREDENTIALS: optionalNonEmptyString,
    FINTABLE_SPREADSHEET_ID: optionalNonEmptyString,
    FINTABLE_ACCOUNTS_RANGE: optionalNonEmptyString,
    FINTABLE_TRANSACTIONS_RANGE: optionalNonEmptyString,
  })
  .transform((value) => ({
    ...value,
    ALLME_AUTH_MODE: assertValidAuthMode({
      configuredMode: value.ALLME_AUTH_MODE,
      nodeEnv: value.NODE_ENV,
    }),
  }));

export const serverEnv = serverEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  ALLME_AUTH_MODE: process.env.ALLME_AUTH_MODE,
  ALLME_IMPORT_USER_EMAIL: process.env.ALLME_IMPORT_USER_EMAIL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  GOOGLE_SHEETS_API_KEY: process.env.GOOGLE_SHEETS_API_KEY,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  FINTABLE_SPREADSHEET_ID: process.env.FINTABLE_SPREADSHEET_ID,
  FINTABLE_ACCOUNTS_RANGE: process.env.FINTABLE_ACCOUNTS_RANGE,
  FINTABLE_TRANSACTIONS_RANGE: process.env.FINTABLE_TRANSACTIONS_RANGE,
});

function emptyStringToUndefined(value: unknown) {
  return value === "" ? undefined : value;
}
