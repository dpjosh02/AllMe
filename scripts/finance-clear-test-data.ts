import {
  requireImportUserEmail,
  SYNTHETIC_FINANCE_PROVIDER,
  SYNTHETIC_FINANCE_SOURCE_TYPE,
} from "./finance-test-data-utils";

const userEmail = requireImportUserEmail();

const [
  { and, eq, inArray, sql },
  { db },
  {
    financeBalanceSnapshots,
    financeRawRecords,
    financeTransactionCategoryAssignments,
    financeTransactions,
    users,
  },
] = await Promise.all([
  import("drizzle-orm"),
  import("@/server/db"),
  import("@/server/db/schema"),
]);

const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, userEmail));

if (!user) {
  console.error(`No AllMe user found for ALLME_IMPORT_USER_EMAIL=${userEmail}`);
  process.exit(1);
}

const syntheticTransactions = await db
  .select({ id: financeTransactions.id })
  .from(financeTransactions)
  .where(
    and(
      eq(financeTransactions.userId, user.id),
      eq(financeTransactions.sourceType, SYNTHETIC_FINANCE_SOURCE_TYPE),
    ),
  );
const syntheticTransactionIds = syntheticTransactions.map((transaction) => transaction.id);

let assignmentsDeleted = 0;

if (syntheticTransactionIds.length > 0) {
  const deletedAssignments = await db
    .delete(financeTransactionCategoryAssignments)
    .where(
      and(
        eq(financeTransactionCategoryAssignments.userId, user.id),
        inArray(
          financeTransactionCategoryAssignments.transactionId,
          syntheticTransactionIds,
        ),
      ),
    )
    .returning({ id: financeTransactionCategoryAssignments.id });

  assignmentsDeleted = deletedAssignments.length;
}

const deletedTransactions = await db
  .delete(financeTransactions)
  .where(
    and(
      eq(financeTransactions.userId, user.id),
      eq(financeTransactions.sourceType, SYNTHETIC_FINANCE_SOURCE_TYPE),
    ),
  )
  .returning({ id: financeTransactions.id });

const deletedBalanceSnapshots = await db
  .delete(financeBalanceSnapshots)
  .where(
    and(
      eq(financeBalanceSnapshots.userId, user.id),
      sql`${financeBalanceSnapshots.rawRecordId} in (
        select id from ${financeRawRecords}
        where ${financeRawRecords.provider} = ${SYNTHETIC_FINANCE_PROVIDER}
      )`,
    ),
  )
  .returning({ id: financeBalanceSnapshots.id });

const deletedRawRecords = await db
  .delete(financeRawRecords)
  .where(
    and(
      eq(financeRawRecords.userId, user.id),
      eq(financeRawRecords.provider, SYNTHETIC_FINANCE_PROVIDER),
    ),
  )
  .returning({ id: financeRawRecords.id });

console.info("Synthetic finance test data cleared.");
console.info(`Synthetic assignments deleted: ${assignmentsDeleted}`);
console.info(`Synthetic transactions deleted: ${deletedTransactions.length}`);
console.info(`Synthetic balance snapshots deleted: ${deletedBalanceSnapshots.length}`);
console.info(`Synthetic raw records deleted: ${deletedRawRecords.length}`);
