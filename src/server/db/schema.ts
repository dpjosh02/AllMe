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
    userProviderIdx: index("finance_connections_user_provider_idx").on(
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
    userAccountNameUnique: uniqueIndex("finance_accounts_user_name_unique").on(
      table.userId,
      table.name,
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
