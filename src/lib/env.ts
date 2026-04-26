import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  GOOGLE_SHEETS_API_KEY: z.string().min(1).optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
  FINTABLE_SPREADSHEET_ID: z.string().min(1).optional(),
  FINTABLE_ACCOUNTS_RANGE: z.string().min(1).optional(),
  FINTABLE_TRANSACTIONS_RANGE: z.string().min(1).optional(),
});

export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  GOOGLE_SHEETS_API_KEY: process.env.GOOGLE_SHEETS_API_KEY,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  FINTABLE_SPREADSHEET_ID: process.env.FINTABLE_SPREADSHEET_ID,
  FINTABLE_ACCOUNTS_RANGE: process.env.FINTABLE_ACCOUNTS_RANGE,
  FINTABLE_TRANSACTIONS_RANGE: process.env.FINTABLE_TRANSACTIONS_RANGE,
});
