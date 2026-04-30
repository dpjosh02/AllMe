import { and, eq, ne } from "drizzle-orm";

import { DEFAULT_FINANCE_CATEGORIES } from "@/features/finance/categorization/defaults";
import {
  type CategoryRuleMatch,
  findBestCategoryRuleMatch,
  type CategorizationTransactionInput,
} from "@/features/finance/categorization/rules";
import type { db as appDb } from "@/server/db";
import {
  financeCategoryRules,
  financeRawRecords,
  financeTransactionCategoryAssignments,
  financeTransactions,
  financeUserCategories,
} from "@/server/db/schema";

type Database = typeof appDb;
type StoredDefaultCategory = {
  id: string;
  slug: string;
};
type CategorizationTransactionRecord = CategorizationTransactionInput & {
  id: string;
};

export async function ensureDefaultFinanceCategories({
  db,
  userId,
}: {
  db: Database;
  userId: string;
}) {
  const categoryIdsBySlug = new Map<string, string>();

  for (const category of DEFAULT_FINANCE_CATEGORIES) {
    const [storedCategoryResult] = await db
      .insert(financeUserCategories)
      .values({
        userId,
        name: category.name,
        slug: category.slug,
        color: category.color,
        icon: category.icon,
        includeInSpending: category.includeInSpending,
        includeInIncome: category.includeInIncome,
        sortOrder: category.sortOrder,
      })
      .onConflictDoUpdate({
        target: [financeUserCategories.userId, financeUserCategories.slug],
        set: {
          name: category.name,
          color: category.color,
          icon: category.icon,
          includeInSpending: category.includeInSpending,
          includeInIncome: category.includeInIncome,
          sortOrder: category.sortOrder,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: financeUserCategories.id,
        slug: financeUserCategories.slug,
      });

    const storedCategory = requireStoredCategory(
      storedCategoryResult,
      category.slug,
    );

    categoryIdsBySlug.set(storedCategory.slug, storedCategory.id);

    for (const rule of category.rules) {
      await db
        .insert(financeCategoryRules)
        .values({
          userId,
          categoryId: storedCategory.id,
          name: rule.name,
          priority: rule.priority,
          matchLogic: rule.matchLogic,
          conditions: rule.conditions,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [
            financeCategoryRules.userId,
            financeCategoryRules.categoryId,
            financeCategoryRules.name,
          ],
          set: {
            priority: rule.priority,
            matchLogic: rule.matchLogic,
            conditions: rule.conditions,
            isActive: true,
            updatedAt: new Date(),
          },
        });
    }
  }

  return categoryIdsBySlug;
}

export async function categorizeFinanceTransactions({
  db,
  userId,
}: {
  db: Database;
  userId: string;
}) {
  await ensureDefaultFinanceCategories({ db, userId });

  const rules = await loadActiveCategoryRules({ db, userId });
  const transactions = await loadCategorizationTransactions({ db, userId });

  let ruleAssigned = 0;
  let uncategorized = 0;

  for (const transaction of transactions) {
    const match = findBestCategoryRuleMatch({ rules, transaction });

    if (match) {
      ruleAssigned += 1;
      await assignTransactionRuleCategory({
        db,
        match,
        transactionId: transaction.id,
        userId,
      });
      continue;
    }

    uncategorized += 1;
    await assignTransactionUncategorized({
      db,
      transactionId: transaction.id,
      userId,
    });
  }

  return {
    transactionsScanned: transactions.length,
    ruleAssigned,
    uncategorized,
  };
}

function requireStoredCategory(
  storedCategory: StoredDefaultCategory | undefined,
  slug: string,
) {
  if (!storedCategory) {
    throw new Error(`Failed to seed finance category ${slug}`);
  }

  return storedCategory;
}

async function loadActiveCategoryRules({
  db,
  userId,
}: {
  db: Database;
  userId: string;
}) {
  return db
    .select({
      id: financeCategoryRules.id,
      categoryId: financeCategoryRules.categoryId,
      priority: financeCategoryRules.priority,
      matchLogic: financeCategoryRules.matchLogic,
      conditions: financeCategoryRules.conditions,
    })
    .from(financeCategoryRules)
    .where(
      and(
        eq(financeCategoryRules.userId, userId),
        eq(financeCategoryRules.isActive, true),
      ),
    );
}

async function loadCategorizationTransactions({
  db,
  userId,
}: {
  db: Database;
  userId: string;
}): Promise<CategorizationTransactionRecord[]> {
  return db
    .select({
      id: financeTransactions.id,
      amount: financeTransactions.amount,
      category: financeTransactions.category,
      description: financeTransactions.description,
      merchant: financeTransactions.merchant,
      rawPayload: financeRawRecords.payload,
    })
    .from(financeTransactions)
    .leftJoin(
      financeRawRecords,
      eq(financeRawRecords.id, financeTransactions.rawRecordId),
    )
    .where(eq(financeTransactions.userId, userId));
}

async function assignTransactionRuleCategory({
  db,
  match,
  transactionId,
  userId,
}: {
  db: Database;
  match: CategoryRuleMatch;
  transactionId: string;
  userId: string;
}) {
  await db
    .insert(financeTransactionCategoryAssignments)
    .values({
      userId,
      transactionId,
      categoryId: match.rule.categoryId,
      source: "rule",
      matchedRuleId: match.rule.id,
      confidence: match.confidence,
    })
    .onConflictDoUpdate({
      target: [
        financeTransactionCategoryAssignments.userId,
        financeTransactionCategoryAssignments.transactionId,
      ],
      set: {
        categoryId: match.rule.categoryId,
        source: "rule",
        matchedRuleId: match.rule.id,
        confidence: match.confidence,
        updatedAt: new Date(),
      },
      setWhere: ne(financeTransactionCategoryAssignments.source, "manual"),
    });
}

async function assignTransactionUncategorized({
  db,
  transactionId,
  userId,
}: {
  db: Database;
  transactionId: string;
  userId: string;
}) {
  await db
    .insert(financeTransactionCategoryAssignments)
    .values({
      userId,
      transactionId,
      source: "uncategorized",
      confidence: 0,
    })
    .onConflictDoNothing({
      target: [
        financeTransactionCategoryAssignments.userId,
        financeTransactionCategoryAssignments.transactionId,
      ],
    });
}
