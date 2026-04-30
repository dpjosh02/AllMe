import { and, eq } from "drizzle-orm";

import type { FintableImportPlan } from "@/features/finance/imports/fintable/plan";
import type { db as appDb } from "@/server/db";
import { financeAccounts } from "@/server/db/schema";

type Database = typeof appDb;
type StoredAccount = {
  id: string;
  name: string;
  sourceAccountId: string;
};

export async function upsertAccounts({
  connectionId,
  db,
  plan,
  userId,
}: {
  connectionId: string;
  db: Database;
  plan: FintableImportPlan;
  userId: string;
}) {
  const bySourceId = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const account of plan.accounts) {
    const mergedAccount = await mergeExistingAccountByName({
      account,
      byName,
      bySourceId,
      connectionId,
      db,
      userId,
    });

    if (mergedAccount) {
      continue;
    }

    const storedAccount = await upsertAccount({
      account,
      connectionId,
      db,
      userId,
    });

    addStoredAccountToLookup({ byName, bySourceId, storedAccount });
  }

  return { byName, bySourceId };
}

async function mergeExistingAccountByName({
  account,
  byName,
  bySourceId,
  connectionId,
  db,
  userId,
}: {
  account: FintableImportPlan["accounts"][number];
  byName: Map<string, string>;
  bySourceId: Map<string, string>;
  connectionId: string;
  db: Database;
  userId: string;
}) {
  const existingAccountBySourceIdRows = await db
    .select({
      id: financeAccounts.id,
      sourceAccountId: financeAccounts.sourceAccountId,
      name: financeAccounts.name,
    })
    .from(financeAccounts)
    .where(
      and(
        eq(financeAccounts.userId, userId),
        eq(financeAccounts.sourceAccountId, account.sourceAccountId),
      ),
    )
    .limit(1);

  if (existingAccountBySourceIdRows.length > 0) {
    return false;
  }

  const existingAccountByNameRows = await db
    .select({
      id: financeAccounts.id,
      sourceAccountId: financeAccounts.sourceAccountId,
      name: financeAccounts.name,
    })
    .from(financeAccounts)
    .where(
      and(
        eq(financeAccounts.userId, userId),
        eq(financeAccounts.name, account.name),
      ),
    )
    .limit(1);

  if (existingAccountByNameRows.length === 0) {
    return false;
  }

  const existingAccountByName = existingAccountByNameRows[0];

  const [mergedAccount] = await db
    .update(financeAccounts)
    .set({
      connectionId,
      sourceAccountId: account.sourceAccountId,
      institutionName: account.institutionName,
      currency: account.currency,
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(financeAccounts.id, existingAccountByName.id))
    .returning({
      id: financeAccounts.id,
      sourceAccountId: financeAccounts.sourceAccountId,
      name: financeAccounts.name,
    });

  addStoredAccountToLookup({
    byName,
    bySourceId,
    storedAccount: mergedAccount,
  });

  return true;
}

async function upsertAccount({
  account,
  connectionId,
  db,
  userId,
}: {
  account: FintableImportPlan["accounts"][number];
  connectionId: string;
  db: Database;
  userId: string;
}) {
  const [storedAccount] = await db
    .insert(financeAccounts)
    .values({
      userId,
      connectionId,
      sourceAccountId: account.sourceAccountId,
      name: account.name,
      institutionName: account.institutionName,
      type: account.type,
      currency: account.currency,
    })
    .onConflictDoUpdate({
      target: [financeAccounts.userId, financeAccounts.sourceAccountId],
      set: {
        connectionId,
        name: account.name,
        institutionName: account.institutionName,
        currency: account.currency,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: financeAccounts.id,
      sourceAccountId: financeAccounts.sourceAccountId,
      name: financeAccounts.name,
    });

  return storedAccount;
}

function addStoredAccountToLookup({
  byName,
  bySourceId,
  storedAccount,
}: {
  byName: Map<string, string>;
  bySourceId: Map<string, string>;
  storedAccount: StoredAccount | undefined;
}) {
  if (storedAccount) {
    bySourceId.set(storedAccount.sourceAccountId, storedAccount.id);
    byName.set(storedAccount.name, storedAccount.id);
  }
}
