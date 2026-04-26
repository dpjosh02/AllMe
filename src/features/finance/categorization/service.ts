import { and, eq, ne } from "drizzle-orm";

import { DEFAULT_FINANCE_CATEGORIES } from "@/features/finance/categorization/defaults";
import {
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

export async function ensureDefaultFinanceCategories({
  db,
  userId,
}: {
  db: Database;
  userId: string;
}) {
  const categoryIdsBySlug = new Map<string, string>();

  for (const category of DEFAULT_FINANCE_CATEGORIES) {
    const [storedCategory] = await db
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
      .returning({ id: financeUserCategories.id, slug: financeUserCategories.slug });

    if (!storedCategory) {
      throw new Error(`Failed to seed finance category ${category.slug}`);
    }

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

  const rules = await db
    .select({
      id: financeCategoryRules.id,
      categoryId: financeCategoryRules.categoryId,
      priority: financeCategoryRules.priority,
      matchLogic: financeCategoryRules.matchLogic,
      conditions: financeCategoryRules.conditions,
    })
    .from(financeCategoryRules)
    .where(
      and(eq(financeCategoryRules.userId, userId), eq(financeCategoryRules.isActive, true)),
    );

  const transactions = await db
    .select({
      id: financeTransactions.id,
      amount: financeTransactions.amount,
      category: financeTransactions.category,
      description: financeTransactions.description,
      merchant: financeTransactions.merchant,
      rawPayload: financeRawRecords.payload,
    })
    .from(financeTransactions)
    .leftJoin(financeRawRecords, eq(financeRawRecords.id, financeTransactions.rawRecordId))
    .where(eq(financeTransactions.userId, userId));

  let ruleAssigned = 0;
  let uncategorized = 0;

  for (const transaction of transactions) {
    const input = {
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description,
      merchant: transaction.merchant,
      rawPayload: transaction.rawPayload,
    } satisfies CategorizationTransactionInput;

    const match = findBestCategoryRuleMatch({ rules, transaction: input });

    if (match) {
      ruleAssigned += 1;
      await db
        .insert(financeTransactionCategoryAssignments)
        .values({
          userId,
          transactionId: transaction.id,
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
      continue;
    }

    uncategorized += 1;
    await db
      .insert(financeTransactionCategoryAssignments)
      .values({
        userId,
        transactionId: transaction.id,
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

  return {
    transactionsScanned: transactions.length,
    ruleAssigned,
    uncategorized,
  };
}
