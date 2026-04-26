"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { importFintableSnapshot } from "@/features/finance/imports/fintable/importer";
import { getFintableSheetConfig } from "@/features/finance/integrations/fintable/config";
import { readFintableGoogleSheetsSnapshot } from "@/features/finance/integrations/fintable/google-sheets";
import { db } from "@/server/db";
import {
  financeAccounts,
  financeTransactionCategoryAssignments,
  financeTransactions,
  financeUserCategories,
  users,
} from "@/server/db/schema";

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
  revalidatePath(`/finance/accounts/${accountId}`);
}

export async function deleteFinanceTransaction(formData: FormData) {
  const transactionId = String(formData.get("transactionId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");

  if (!transactionId) {
    throw new Error("Missing transaction id");
  }

  await db
    .delete(financeTransactions)
    .where(eq(financeTransactions.id, transactionId));

  revalidatePath("/finance");

  if (accountId) {
    revalidatePath(`/finance/accounts/${accountId}`);
  }
}

export async function createFinanceCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const color = normalizeHexColor(String(formData.get("color") ?? ""));
  const cashFlowType = String(formData.get("cashFlowType") ?? "spending");
  const returnAccountId = String(formData.get("accountId") ?? "");

  if (!name) {
    throw new Error("Missing category name");
  }

  const userId = await getDefaultFinanceUserId();
  const slug = await createUniqueCategorySlug({ name, userId });
  const includeInIncome = cashFlowType === "income";
  const includeInSpending = cashFlowType === "spending";

  await db.insert(financeUserCategories).values({
    userId,
    name,
    slug,
    color,
    icon: "tag",
    includeInIncome,
    includeInSpending,
    sortOrder: 500,
  });

  revalidatePath("/finance");

  if (returnAccountId) {
    revalidatePath(`/finance/accounts/${returnAccountId}`);
  }
}

export async function updateFinanceCategory(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = normalizeHexColor(String(formData.get("color") ?? ""));
  const cashFlowType = String(formData.get("cashFlowType") ?? "spending");
  const returnAccountId = String(formData.get("accountId") ?? "");

  if (!categoryId || !name) {
    throw new Error("Missing category id/name");
  }

  const userId = await getDefaultFinanceUserId();
  const includeInIncome = cashFlowType === "income";
  const includeInSpending = cashFlowType === "spending";

  await db
    .update(financeUserCategories)
    .set({
      name,
      color,
      includeInIncome,
      includeInSpending,
      updatedAt: new Date(),
    })
    .where(
      and(eq(financeUserCategories.id, categoryId), eq(financeUserCategories.userId, userId)),
    );

  revalidateFinancePaths(returnAccountId);
}

export async function deleteFinanceCategory(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "");
  const returnAccountId = String(formData.get("accountId") ?? "");

  if (!categoryId) {
    throw new Error("Missing category id");
  }

  const userId = await getDefaultFinanceUserId();

  await db
    .update(financeTransactionCategoryAssignments)
    .set({
      categoryId: null,
      source: "uncategorized",
      matchedRuleId: null,
      confidence: 0,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(financeTransactionCategoryAssignments.userId, userId),
        eq(financeTransactionCategoryAssignments.categoryId, categoryId),
      ),
    );

  await db
    .delete(financeUserCategories)
    .where(
      and(eq(financeUserCategories.id, categoryId), eq(financeUserCategories.userId, userId)),
    );

  revalidateFinancePaths(returnAccountId);
}

export async function assignFinanceTransactionCategory(formData: FormData) {
  const transactionId = String(formData.get("transactionId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");

  if (!transactionId || !categoryId) {
    throw new Error("Missing transaction/category id");
  }

  const [transaction] = await db
    .select({
      id: financeTransactions.id,
      userId: financeTransactions.userId,
      accountId: financeTransactions.accountId,
    })
    .from(financeTransactions)
    .where(eq(financeTransactions.id, transactionId))
    .limit(1);

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  const [category] = await db
    .select({ id: financeUserCategories.id })
    .from(financeUserCategories)
    .where(
      and(
        eq(financeUserCategories.id, categoryId),
        eq(financeUserCategories.userId, transaction.userId),
      ),
    )
    .limit(1);

  if (!category) {
    throw new Error("Category not found");
  }

  await db
    .insert(financeTransactionCategoryAssignments)
    .values({
      userId: transaction.userId,
      transactionId: transaction.id,
      categoryId: category.id,
      source: "manual",
      confidence: 100,
    })
    .onConflictDoUpdate({
      target: [
        financeTransactionCategoryAssignments.userId,
        financeTransactionCategoryAssignments.transactionId,
      ],
      set: {
        categoryId: category.id,
        source: "manual",
        matchedRuleId: null,
        confidence: 100,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/finance");
  revalidatePath(`/finance/accounts/${accountId || transaction.accountId}`);
}

export async function assignFinanceCategoryToTransactions(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const transactionIds = Array.from(
    new Set(
      formData
        .getAll("transactionIds")
        .map((value) => String(value))
        .filter(Boolean),
    ),
  );

  if (!categoryId || transactionIds.length === 0) {
    throw new Error("Missing category id or transaction ids");
  }

  const [category] = await db
    .select({ id: financeUserCategories.id, userId: financeUserCategories.userId })
    .from(financeUserCategories)
    .where(eq(financeUserCategories.id, categoryId))
    .limit(1);

  if (!category) {
    throw new Error("Category not found");
  }

  const transactions = await db
    .select({ id: financeTransactions.id })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.userId, category.userId),
        inArray(financeTransactions.id, transactionIds),
      ),
    );

  if (transactions.length === 0) {
    throw new Error("No matching transactions found");
  }

  await db
    .insert(financeTransactionCategoryAssignments)
    .values(
      transactions.map((transaction) => ({
        userId: category.userId,
        transactionId: transaction.id,
        categoryId: category.id,
        source: "manual" as const,
        confidence: 100,
      })),
    )
    .onConflictDoUpdate({
      target: [
        financeTransactionCategoryAssignments.userId,
        financeTransactionCategoryAssignments.transactionId,
      ],
      set: {
        categoryId: category.id,
        source: "manual",
        matchedRuleId: null,
        confidence: 100,
        updatedAt: new Date(),
      },
    });

  revalidateFinancePaths(accountId);
}

export async function syncFintableNow() {
  const userEmail = process.env.ALLME_IMPORT_USER_EMAIL;

  if (!userEmail) {
    throw new Error("Missing required environment variable: ALLME_IMPORT_USER_EMAIL");
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, userEmail));

  if (!user) {
    throw new Error(`No AllMe user found for ALLME_IMPORT_USER_EMAIL=${userEmail}`);
  }

  const config = getFintableSheetConfig();
  const snapshot = await readFintableGoogleSheetsSnapshot({
    apiKey: config.apiKey,
    credentialsFile: config.credentialsFile,
    spreadsheetId: config.spreadsheetId,
    accountsRange: config.accountsRange,
    transactionsRange: config.transactionsRange,
  });

  await importFintableSnapshot({
    db,
    userId: user.id,
    snapshot,
  });

  revalidatePath("/finance");
}

function revalidateFinancePaths(accountId: string) {
  revalidatePath("/finance");

  if (accountId) {
    revalidatePath(`/finance/accounts/${accountId}`);
  }
}

async function getDefaultFinanceUserId() {
  const userEmail = process.env.ALLME_IMPORT_USER_EMAIL;

  if (!userEmail) {
    throw new Error("Missing required environment variable: ALLME_IMPORT_USER_EMAIL");
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, userEmail));

  if (!user) {
    throw new Error(`No AllMe user found for ALLME_IMPORT_USER_EMAIL=${userEmail}`);
  }

  return user.id;
}

async function createUniqueCategorySlug({
  name,
  userId,
}: {
  name: string;
  userId: string;
}) {
  const baseSlug = slugify(name) || "category";
  let candidate = baseSlug;
  let suffix = 2;

  while (await categorySlugExists({ slug: candidate, userId })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function categorySlugExists({ slug, userId }: { slug: string; userId: string }) {
  const [category] = await db
    .select({ id: financeUserCategories.id })
    .from(financeUserCategories)
    .where(
      and(eq(financeUserCategories.userId, userId), eq(financeUserCategories.slug, slug)),
    )
    .limit(1);

  return Boolean(category);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : "#64748b";
}
