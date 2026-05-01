"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { importFintableSnapshot } from "@/features/finance/imports/fintable/importer";
import { getFintableSheetConfig } from "@/features/finance/integrations/fintable/config";
import { readFintableGoogleSheetsSnapshot } from "@/features/finance/integrations/fintable/google-sheets";
import { requireCurrentUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  type FinanceCategoryRuleConditions,
  financeCategoryRules,
  financeAccounts,
  financeTransactionCategoryAssignments,
  financeTransactions,
  financeUserCategories,
} from "@/server/db/schema";

export async function renameFinanceAccount(formData: FormData) {
  const currentUser = await requireCurrentUser();
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
    .where(
      and(
        eq(financeAccounts.id, accountId),
        eq(financeAccounts.userId, currentUser.id),
      ),
    );

  revalidatePath("/finance");
  revalidatePath(`/finance/accounts/${accountId}`);
}

export async function deleteFinanceTransaction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const transactionId = String(formData.get("transactionId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");

  if (!transactionId) {
    throw new Error("Missing transaction id");
  }

  await db
    .delete(financeTransactions)
    .where(
      and(
        eq(financeTransactions.id, transactionId),
        eq(financeTransactions.userId, currentUser.id),
      ),
    );

  revalidatePath("/finance");

  if (accountId) {
    revalidatePath(`/finance/accounts/${accountId}`);
  }
}

export async function createFinanceCategory(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const color = normalizeHexColor(String(formData.get("color") ?? ""));
  const cashFlowType = String(formData.get("cashFlowType") ?? "spending");
  const returnAccountId = String(formData.get("accountId") ?? "");

  if (!name) {
    throw new Error("Missing category name");
  }

  const userId = currentUser.id;
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
  const currentUser = await requireCurrentUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = normalizeHexColor(String(formData.get("color") ?? ""));
  const cashFlowType = String(formData.get("cashFlowType") ?? "spending");
  const returnAccountId = String(formData.get("accountId") ?? "");

  if (!categoryId || !name) {
    throw new Error("Missing category id/name");
  }

  const userId = currentUser.id;
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
      and(
        eq(financeUserCategories.id, categoryId),
        eq(financeUserCategories.userId, userId),
      ),
    );

  revalidateFinancePaths(returnAccountId);
}

export async function deleteFinanceCategory(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  const returnAccountId = String(formData.get("accountId") ?? "");

  if (!categoryId) {
    throw new Error("Missing category id");
  }

  const userId = currentUser.id;

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
      and(
        eq(financeUserCategories.id, categoryId),
        eq(financeUserCategories.userId, userId),
      ),
    );

  revalidateFinancePaths(returnAccountId);
}

export async function assignFinanceTransactionCategory(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const transactionId = String(formData.get("transactionId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");

  if (!transactionId || !categoryId) {
    throw new Error("Missing transaction/category id");
  }

  const transactionRows = await db
    .select({
      id: financeTransactions.id,
      userId: financeTransactions.userId,
      accountId: financeTransactions.accountId,
    })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.id, transactionId),
        eq(financeTransactions.userId, currentUser.id),
      ),
    )
    .limit(1);

  if (transactionRows.length === 0) {
    throw new Error("Transaction not found");
  }

  const transaction = transactionRows[0];
  const categoryRows = await db
    .select({ id: financeUserCategories.id })
    .from(financeUserCategories)
    .where(
      and(
        eq(financeUserCategories.id, categoryId),
        eq(financeUserCategories.userId, currentUser.id),
      ),
    )
    .limit(1);

  if (categoryRows.length === 0) {
    throw new Error("Category not found");
  }

  const category = categoryRows[0];

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
  const currentUser = await requireCurrentUser();
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

  await assignTransactionsToCategory({
    accountId,
    categoryId,
    transactionIds,
    userId: currentUser.id,
  });
}

export async function createFinanceCategoryTextRule(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const terms = parseMatchTerms(String(formData.get("matchText") ?? ""));
  const transactionIds = Array.from(
    new Set(
      formData
        .getAll("transactionIds")
        .map((value) => String(value))
        .filter(Boolean),
    ),
  );

  if (!categoryId || terms.length === 0) {
    throw new Error("Missing category id or match terms");
  }

  const categoryRows = await db
    .select({
      id: financeUserCategories.id,
      userId: financeUserCategories.userId,
    })
    .from(financeUserCategories)
    .where(
      and(
        eq(financeUserCategories.id, categoryId),
        eq(financeUserCategories.userId, currentUser.id),
      ),
    )
    .limit(1);

  if (categoryRows.length === 0) {
    throw new Error("Category not found");
  }

  const category = categoryRows[0];

  const conditions: FinanceCategoryRuleConditions = [
    { field: "description", operator: "contains_any", value: terms },
    { field: "merchant", operator: "contains_any", value: terms },
    { field: "category", operator: "contains_any", value: terms },
    {
      field: "personal_finance_category.primary",
      operator: "contains_any",
      value: terms,
    },
    {
      field: "personal_finance_category.detailed",
      operator: "contains_any",
      value: terms,
    },
    { field: "raw.category", operator: "contains_any", value: terms },
    { field: "raw.name", operator: "contains_any", value: terms },
    { field: "raw.merchant_name", operator: "contains_any", value: terms },
    { field: "raw.website", operator: "contains_any", value: terms },
  ];

  await db.insert(financeCategoryRules).values({
    userId: category.userId,
    categoryId: category.id,
    name: createTextRuleName(terms),
    priority: 40,
    matchLogic: "any",
    conditions,
  });

  if (transactionIds.length > 0) {
    await assignTransactionsToCategory({
      accountId,
      categoryId,
      transactionIds,
      userId: currentUser.id,
    });
    return;
  }

  revalidateFinancePaths(accountId);
}

async function assignTransactionsToCategory({
  accountId,
  categoryId,
  transactionIds,
  userId,
}: {
  accountId: string;
  categoryId: string;
  transactionIds: string[];
  userId: string;
}) {
  const categoryRows = await db
    .select({
      id: financeUserCategories.id,
      userId: financeUserCategories.userId,
    })
    .from(financeUserCategories)
    .where(
      and(
        eq(financeUserCategories.id, categoryId),
        eq(financeUserCategories.userId, userId),
      ),
    )
    .limit(1);

  if (categoryRows.length === 0) {
    throw new Error("Category not found");
  }

  const category = categoryRows[0];

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

function parseMatchTerms(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length >= 2),
    ),
  ).slice(0, 30);
}

function createTextRuleName(terms: string[]) {
  const label = terms.slice(0, 4).join(", ");
  return `Text match: ${label} (${Date.now()})`;
}

export async function syncFintableNow() {
  const user = await requireCurrentUser();

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

async function categorySlugExists({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}) {
  const [category] = await db
    .select({ id: financeUserCategories.id })
    .from(financeUserCategories)
    .where(
      and(
        eq(financeUserCategories.userId, userId),
        eq(financeUserCategories.slug, slug),
      ),
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
