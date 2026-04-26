"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/server/db";
import { financeAccounts } from "@/server/db/schema";

export async function renameFinanceAccount(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!accountId) {
    throw new Error("Missing account id");
  }

  await db
    .update(financeAccounts)
    .set({
      displayName: displayName.length > 0 ? displayName : null,
      updatedAt: new Date(),
    })
    .where(eq(financeAccounts.id, accountId));

  revalidatePath("/finance");
}
