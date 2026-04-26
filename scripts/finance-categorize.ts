import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");

loadEnvConfig(process.cwd());

const userEmail = process.env.ALLME_IMPORT_USER_EMAIL;

if (!userEmail) {
  console.error("Missing required environment variable: ALLME_IMPORT_USER_EMAIL");
  process.exit(1);
}

const [{ eq }, { categorizeFinanceTransactions }, { db }, { users }] =
  await Promise.all([
    import("drizzle-orm"),
    import("@/features/finance/categorization/service"),
    import("@/server/db"),
    import("@/server/db/schema"),
  ]);

const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, userEmail));

if (!user) {
  console.error(`No AllMe user found for ALLME_IMPORT_USER_EMAIL=${userEmail}`);
  process.exit(1);
}

const result = await categorizeFinanceTransactions({
  db,
  userId: user.id,
});

console.info("Finance categorization succeeded.");
console.info(`Transactions scanned: ${result.transactionsScanned}`);
console.info(`Transactions categorized by rule: ${result.ruleAssigned}`);
console.info(`Transactions left uncategorized: ${result.uncategorized}`);
