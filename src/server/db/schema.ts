import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const importStatus = pgEnum("import_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const transactionStatus = pgEnum("transaction_status", [
  "pending",
  "posted",
  "voided",
]);

export const financeCategoryAssignmentSource = pgEnum(
  "finance_category_assignment_source",
  ["manual", "rule", "system", "uncategorized"],
);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("America/Chicago"),
  preferredCurrency: text("preferred_currency").notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    noteDate: date("note_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index("notes_user_date_idx").on(table.userId, table.noteDate),
  }),
);

export const financeConnections = pgTable(
  "finance_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    displayName: text("display_name").notNull(),
    sourceType: text("source_type").notNull(),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userProviderUnique: uniqueIndex("finance_connections_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
  }),
);

export const financeAccounts = pgTable(
  "finance_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id").references(() => financeConnections.id, {
      onDelete: "set null",
    }),
    sourceAccountId: text("source_account_id").notNull(),
    name: text("name").notNull(),
    displayName: text("display_name"),
    institutionName: text("institution_name"),
    type: text("type").notNull(),
    subtype: text("subtype"),
    currency: text("currency").notNull().default("USD"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceAccountUnique: uniqueIndex("finance_accounts_source_account_unique").on(
      table.userId,
      table.sourceAccountId,
    ),
  }),
);

export const financeImportRuns = pgTable(
  "finance_import_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id").references(() => financeConnections.id, {
      onDelete: "set null",
    }),
    sourceType: text("source_type").notNull(),
    status: importStatus("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    rowsScanned: integer("rows_scanned").notNull().default(0),
    rowsInserted: integer("rows_inserted").notNull().default(0),
    rowsUpdated: integer("rows_updated").notNull().default(0),
    rowsSkipped: integer("rows_skipped").notNull().default(0),
    errorSummary: text("error_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index("finance_import_runs_user_status_idx").on(
      table.userId,
      table.status,
    ),
  }),
);

export const financeRawRecords = pgTable(
  "finance_raw_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    importRunId: uuid("import_run_id").references(() => financeImportRuns.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull(),
    sourceName: text("source_name").notNull(),
    rowHash: text("row_hash").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    rowHashUnique: uniqueIndex("finance_raw_records_row_hash_unique").on(
      table.userId,
      table.provider,
      table.rowHash,
    ),
  }),
);

export const financeTransactions = pgTable(
  "finance_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financeAccounts.id, { onDelete: "cascade" }),
    rawRecordId: uuid("raw_record_id").references(() => financeRawRecords.id, {
      onDelete: "set null",
    }),
    sourceFingerprint: text("source_fingerprint").notNull(),
    postedDate: date("posted_date").notNull(),
    effectiveDate: date("effective_date"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    description: text("description").notNull(),
    merchant: text("merchant"),
    category: text("category"),
    status: transactionStatus("status").notNull().default("posted"),
    sourceType: text("source_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    fingerprintUnique: uniqueIndex("finance_transactions_fingerprint_unique").on(
      table.userId,
      table.sourceFingerprint,
    ),
    accountPostedDateIdx: index("finance_transactions_account_posted_date_idx").on(
      table.accountId,
      table.postedDate,
    ),
  }),
);

export const financeBalanceSnapshots = pgTable(
  "finance_balance_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financeAccounts.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    rawRecordId: uuid("raw_record_id").references(() => financeRawRecords.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountDateUnique: uniqueIndex("finance_balance_snapshots_account_date_unique").on(
      table.accountId,
      table.snapshotDate,
    ),
  }),
);

export const financeHoldingsSnapshots = pgTable(
  "finance_holdings_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financeAccounts.id, { onDelete: "cascade" }),
    rawRecordId: uuid("raw_record_id").references(() => financeRawRecords.id, {
      onDelete: "set null",
    }),
    snapshotDate: date("snapshot_date").notNull(),
    symbol: text("symbol"),
    instrumentName: text("instrument_name").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 }),
    marketValue: numeric("market_value", { precision: 14, scale: 2 }).notNull(),
    costBasis: numeric("cost_basis", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountSnapshotIdx: index("finance_holdings_snapshots_account_snapshot_idx").on(
      table.accountId,
      table.snapshotDate,
    ),
  }),
);

export type FinanceCategoryRuleCondition = {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "in"
    | "contains"
    | "contains_any"
    | "starts_with"
    | "regex"
    | "exists"
    | "amount_less_than"
    | "amount_greater_than";
  value?: unknown;
};

export type FinanceCategoryRuleConditions = FinanceCategoryRuleCondition[];

export const financeUserCategories = pgTable(
  "finance_user_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color").notNull().default("#64748b"),
    icon: text("icon"),
    parentId: uuid("parent_id"),
    includeInSpending: boolean("include_in_spending").notNull().default(true),
    includeInIncome: boolean("include_in_income").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userSlugUnique: uniqueIndex("finance_user_categories_user_slug_unique").on(
      table.userId,
      table.slug,
    ),
    userSortIdx: index("finance_user_categories_user_sort_idx").on(
      table.userId,
      table.sortOrder,
    ),
  }),
);

export const financeCategoryRules = pgTable(
  "finance_category_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => financeUserCategories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priority: integer("priority").notNull().default(100),
    matchLogic: text("match_logic").notNull().default("all"),
    conditions: jsonb("conditions")
      .$type<FinanceCategoryRuleConditions>()
      .notNull()
      .default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCategoryNameUnique: uniqueIndex("finance_category_rules_user_category_name_unique").on(
      table.userId,
      table.categoryId,
      table.name,
    ),
    userActivePriorityIdx: index("finance_category_rules_user_active_priority_idx").on(
      table.userId,
      table.isActive,
      table.priority,
    ),
  }),
);

export const financeTransactionCategoryAssignments = pgTable(
  "finance_transaction_category_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => financeTransactions.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => financeUserCategories.id, {
      onDelete: "set null",
    }),
    source: financeCategoryAssignmentSource("source")
      .notNull()
      .default("uncategorized"),
    matchedRuleId: uuid("matched_rule_id").references(() => financeCategoryRules.id, {
      onDelete: "set null",
    }),
    confidence: integer("confidence").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userTransactionUnique: uniqueIndex(
      "finance_transaction_category_assignments_user_transaction_unique",
    ).on(table.userId, table.transactionId),
    userCategoryIdx: index("finance_transaction_category_assignments_user_category_idx").on(
      table.userId,
      table.categoryId,
    ),
  }),
);
