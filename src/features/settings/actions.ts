"use server";

import { revalidatePath } from "next/cache";

import {
  currencyOptions,
  timezoneOptions,
} from "@/features/settings/queries";
import { requireOwnerUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { userSettings } from "@/server/db/schema";

export async function updateOwnerSettings(formData: FormData) {
  const owner = await requireOwnerUser();

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
