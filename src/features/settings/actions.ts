"use server";

import { revalidatePath } from "next/cache";

import {
  currencyOptions,
  getOwnerByEmail,
  timezoneOptions,
} from "@/features/settings/queries";
import { serverEnv } from "@/lib/env";
import { db } from "@/server/db";
import { userSettings } from "@/server/db/schema";

export async function updateOwnerSettings(formData: FormData) {
  const ownerEmail = serverEnv.ALLME_IMPORT_USER_EMAIL;

  if (!ownerEmail) {
    throw new Error("Missing ALLME_IMPORT_USER_EMAIL");
  }

  const owner = await getOwnerByEmail(ownerEmail);

  if (!owner) {
    throw new Error("Owner user does not exist yet");
  }

  const timezone = normalizeOption({
    fallback: "America/Chicago",
    options: timezoneOptions,
    value: String(formData.get("timezone") ?? ""),
  });
  const preferredCurrency = normalizeOption({
    fallback: "USD",
    options: currencyOptions,
    value: String(formData.get("preferredCurrency") ?? ""),
  });

  await db
    .insert(userSettings)
    .values({
      preferredCurrency,
      timezone,
      userId: owner.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        preferredCurrency,
        timezone,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/settings");
}

function normalizeOption<T extends readonly string[]>({
  fallback,
  options,
  value,
}: {
  fallback: T[number];
  options: T;
  value: string;
}) {
  return options.includes(value) ? value : fallback;
}
