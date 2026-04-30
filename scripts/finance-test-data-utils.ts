import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import type { loadEnvConfig as loadNextEnvConfig } from "@next/env";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as {
  loadEnvConfig: typeof loadNextEnvConfig;
};

loadEnvConfig(process.cwd());

export const SYNTHETIC_FINANCE_PROVIDER = "synthetic_test_data";
export const SYNTHETIC_FINANCE_SOURCE_TYPE = "synthetic_test_data";

export function requireImportUserEmail() {
  const userEmail = process.env.ALLME_IMPORT_USER_EMAIL;

  if (!userEmail) {
    console.error(
      "Missing required environment variable: ALLME_IMPORT_USER_EMAIL",
    );
    process.exit(1);
  }

  return userEmail;
}

export function hashStableValue(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function createDeterministicRandom(seedText: string) {
  let seed = Number.parseInt(hashStableValue(seedText).slice(0, 8), 16);

  return function random() {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);

  return next;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function parseDateKey(date: string) {
  return new Date(`${date}T00:00:00`);
}

export function formatMoney(amount: number) {
  return amount.toFixed(2);
}

export function randomInt(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}
