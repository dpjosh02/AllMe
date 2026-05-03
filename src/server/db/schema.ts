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

export const calendarConnectionStatus = pgEnum("calendar_connection_status", [
  "active",
  "reauthorization_required",
  "disabled",
  "revoked",
]);

export const calendarEventStatus = pgEnum("calendar_event_status", [
  "confirmed",
  "tentative",
  "cancelled",
]);

export const calendarSyncKind = pgEnum("calendar_sync_kind", [
  "full",
  "incremental",
  "recovery_full",
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

export const authOAuthTokens = pgTable(
  "auth_oauth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id"),
    accountEmail: text("account_email").notNull(),
    accessTokenCiphertext: text("access_token_ciphertext").notNull(),
    refreshTokenCiphertext: text("refresh_token_ciphertext"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userProviderUnique: uniqueIndex("auth_oauth_tokens_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
    userProviderAccountIdx: index("auth_oauth_tokens_user_provider_account_idx").on(
      table.userId,
      table.providerAccountId,
    ),
  }),
);

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

export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id"),
    accountEmail: text("account_email"),
    displayName: text("display_name").notNull(),
    status: calendarConnectionStatus("status").notNull().default("active"),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    syncToken: text("sync_token"),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userProviderUnique: uniqueIndex("calendar_connections_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
    userStatusIdx: index("calendar_connections_user_status_idx").on(
      table.userId,
      table.status,
    ),
  }),
);

export const calendarCalendars = pgTable(
  "calendar_calendars",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => calendarConnections.id, { onDelete: "cascade" }),
    sourceCalendarId: text("source_calendar_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    timezone: text("timezone"),
    color: text("color"),
    accessRole: text("access_role"),
    isPrimary: boolean("is_primary").notNull().default(false),
    isSelected: boolean("is_selected").notNull().default(true),
    isDeleted: boolean("is_deleted").notNull().default(false),
    syncToken: text("sync_token"),
    rawPayload: jsonb("raw_payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceCalendarUnique: uniqueIndex("calendar_calendars_source_calendar_unique").on(
      table.userId,
      table.connectionId,
      table.sourceCalendarId,
    ),
    userVisibilityIdx: index("calendar_calendars_user_visibility_idx").on(
      table.userId,
      table.isSelected,
      table.isDeleted,
    ),
  }),
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => calendarConnections.id, { onDelete: "cascade" }),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => calendarCalendars.id, { onDelete: "cascade" }),
    sourceEventId: text("source_event_id").notNull(),
    sourceIcalUid: text("source_ical_uid"),
    recurringEventId: text("recurring_event_id"),
    originalStartAt: timestamp("original_start_at", { withTimezone: true }),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    status: calendarEventStatus("status").notNull().default("confirmed"),
    visibility: text("visibility"),
    transparency: text("transparency"),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    isAllDay: boolean("is_all_day").notNull().default(false),
    timezone: text("timezone"),
    htmlLink: text("html_link"),
    etag: text("etag"),
    providerUpdatedAt: timestamp("provider_updated_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    rawPayload: jsonb("raw_payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceEventUnique: uniqueIndex("calendar_events_source_event_unique").on(
      table.userId,
      table.calendarId,
      table.sourceEventId,
    ),
    userStartAtIdx: index("calendar_events_user_start_at_idx").on(
      table.userId,
      table.startAt,
    ),
    userStartDateIdx: index("calendar_events_user_start_date_idx").on(
      table.userId,
      table.startDate,
    ),
    userStatusIdx: index("calendar_events_user_status_idx").on(
      table.userId,
      table.status,
    ),
    userIcalUidIdx: index("calendar_events_user_ical_uid_idx").on(
      table.userId,
      table.sourceIcalUid,
    ),
  }),
);

export const calendarSyncRuns = pgTable(
  "calendar_sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id").references(() => calendarConnections.id, {
      onDelete: "set null",
    }),
    calendarId: uuid("calendar_id").references(() => calendarCalendars.id, {
      onDelete: "set null",
    }),
    sourceType: text("source_type").notNull().default("google_calendar"),
    status: importStatus("status").notNull().default("pending"),
    syncKind: calendarSyncKind("sync_kind").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    windowStart: timestamp("window_start", { withTimezone: true }),
    windowEnd: timestamp("window_end", { withTimezone: true }),
    eventsScanned: integer("events_scanned").notNull().default(0),
    eventsInserted: integer("events_inserted").notNull().default(0),
    eventsUpdated: integer("events_updated").notNull().default(0),
    eventsCancelled: integer("events_cancelled").notNull().default(0),
    eventsSkipped: integer("events_skipped").notNull().default(0),
    nextSyncTokenWritten: boolean("next_sync_token_written").notNull().default(false),
    errorSummary: text("error_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index("calendar_sync_runs_user_status_idx").on(
      table.userId,
      table.status,
    ),
    userConnectionCreatedIdx: index("calendar_sync_runs_user_connection_created_idx").on(
      table.userId,
      table.connectionId,
      table.createdAt,
    ),
    userCalendarCreatedIdx: index("calendar_sync_runs_user_calendar_created_idx").on(
      table.userId,
      table.calendarId,
      table.createdAt,
    ),
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
