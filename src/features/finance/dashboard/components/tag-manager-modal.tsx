"use client";

import { Pencil, X } from "lucide-react";
import { useState } from "react";

import {
  assignFinanceCategoryToTransactions,
  createFinanceCategory,
  createFinanceCategoryTextRule,
  deleteFinanceCategory,
  updateFinanceCategory,
} from "@/features/finance/dashboard/actions";
import type {
  CategoryOption,
  RecentTransaction,
  TagMatchField,
  TagMatchFieldOption,
} from "@/features/finance/dashboard/components/recent-transactions-types";

const tagMatchFieldOptions: TagMatchFieldOption[] = [
  {
    description: "Matches provider detailed category text.",
    id: "rawPersonalFinanceDetailed",
    label: "Provider detailed category",
  },
  {
    description: "Matches provider primary category text.",
    id: "rawPersonalFinancePrimary",
    label: "Provider primary category",
  },
  {
    description: "Matches the raw category path from the source payload.",
    id: "rawCategoryPath",
    label: "Raw category path",
  },
  {
    description: "Matches normalized merchant names.",
    id: "rawMerchantName",
    label: "Merchant",
  },
  {
    description: "Matches visible or raw transaction descriptions.",
    id: "description",
    label: "Description",
  },
];

export function TagManagerModal({
  accountId,
  categories,
  onClose,
  transactions,
}: {
  accountId: string | null;
  categories: CategoryOption[];
  onClose: () => void;
  transactions: RecentTransaction[];
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );

  async function createCategoryAndCloseEditor(formData: FormData) {
    await createFinanceCategory(formData);
    setIsCreating(false);
  }

  async function updateCategoryAndCloseEditor(formData: FormData) {
    await updateFinanceCategory(formData);
    setEditingCategoryId(null);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="max-h-[min(42rem,92vh)] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Tags
            </p>
            <h3 className="mt-1 text-2xl font-semibold">Manage Categories</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Edit tag details and build match rules for similar transactions.
            </p>
          </div>
          <button
            aria-label="Close tag manager"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--line)] transition hover:border-[var(--accent)]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-2">
          {categories.map((category) => {
            const isEditing = editingCategoryId === category.id;
            const isDeleting = deletingCategoryId === category.id;

            if (isEditing) {
              return (
                <div
                  className="rounded-md border border-[var(--line)] bg-[var(--empty)] p-3"
                  key={category.id}
                >
                  <form action={updateCategoryAndCloseEditor}>
                    <input
                      name="categoryId"
                      type="hidden"
                      value={category.id}
                    />
                    {accountId ? (
                      <input name="accountId" type="hidden" value={accountId} />
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <label className="flex flex-col gap-1 text-sm font-semibold">
                        <span>Tag name</span>
                        <input
                          className="min-h-10 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 outline-none transition focus:border-[var(--accent)]"
                          defaultValue={category.name}
                          name="name"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-semibold">
                        <span>Color</span>
                        <input
                          className="h-10 w-20 rounded-md border border-[var(--line)] bg-[var(--input)] p-1"
                          defaultValue={category.color}
                          name="color"
                          type="color"
                        />
                      </label>
                    </div>
                    <fieldset className="mt-3">
                      <legend className="mb-2 text-sm font-semibold">
                        Cash-flow behavior
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <CashFlowRadio
                          defaultChecked={category.includeInSpending}
                          description="Counts as spending."
                          label="Spending"
                          value="spending"
                        />
                        <CashFlowRadio
                          defaultChecked={category.includeInIncome}
                          description="Counts as income."
                          label="Income"
                          value="income"
                        />
                        <CashFlowRadio
                          defaultChecked={
                            !category.includeInSpending &&
                            !category.includeInIncome
                          }
                          description="Excluded from cash flow."
                          label="Neutral"
                          value="neutral"
                        />
                      </div>
                    </fieldset>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--line)] px-4 text-sm font-semibold transition hover:border-[var(--accent)]"
                        onClick={() => setEditingCategoryId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)]"
                        type="submit"
                      >
                        Save tag
                      </button>
                    </div>
                  </form>
                  <TagRuleTools
                    accountId={accountId}
                    category={category}
                    transactions={transactions}
                  />
                </div>
              );
            }

            return (
              <div
                className="rounded-md border border-[var(--line)] bg-[var(--empty)] p-3"
                key={category.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {category.name}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatCategoryBehavior(category)} ·{" "}
                        {category.transactionCount} tagged
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      aria-label={`Edit ${category.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                      onClick={() => {
                        setDeletingCategoryId(null);
                        setEditingCategoryId(category.id);
                      }}
                      type="button"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={`Delete ${category.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--danger)] text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-[var(--panel)]"
                      onClick={() =>
                        setDeletingCategoryId(isDeleting ? null : category.id)
                      }
                      type="button"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {isDeleting ? (
                  <form
                    action={deleteFinanceCategory}
                    className="mt-3 rounded-md border border-[var(--danger)] bg-[var(--panel)] p-3"
                  >
                    <input
                      name="categoryId"
                      type="hidden"
                      value={category.id}
                    />
                    {accountId ? (
                      <input name="accountId" type="hidden" value={accountId} />
                    ) : null}
                    <p className="text-sm font-semibold text-[var(--danger)]">
                      Delete this tag?
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Existing transactions using this tag will become
                      uncategorized.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--line)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
                        onClick={() => setDeletingCategoryId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md bg-[var(--danger)] px-3 text-sm font-semibold text-[var(--panel)] transition hover:opacity-90"
                        type="submit"
                      >
                        Delete tag
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>

        {isCreating ? (
          <form
            action={createCategoryAndCloseEditor}
            className="mt-5 rounded-md border border-[var(--line)] bg-[var(--empty)] p-4"
          >
            {accountId ? (
              <input name="accountId" type="hidden" value={accountId} />
            ) : null}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="flex flex-col gap-1 text-sm font-semibold">
                <span>Tag name</span>
                <input
                  autoFocus
                  className="min-h-10 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 outline-none transition focus:border-[var(--accent)]"
                  name="name"
                  placeholder="Ordering Out, Rent, Subscriptions"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                <span>Color</span>
                <input
                  className="h-10 w-20 rounded-md border border-[var(--line)] bg-[var(--input)] p-1"
                  defaultValue="#0f766e"
                  name="color"
                  type="color"
                />
              </label>
            </div>

            <fieldset className="mt-3">
              <legend className="mb-2 text-sm font-semibold">
                Cash-flow behavior
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                <CashFlowRadio
                  defaultChecked
                  description="Counts as spending."
                  label="Spending"
                  value="spending"
                />
                <CashFlowRadio
                  description="Counts as income."
                  label="Income"
                  value="income"
                />
                <CashFlowRadio
                  description="Excluded from cash flow."
                  label="Neutral"
                  value="neutral"
                />
              </div>
            </fieldset>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--line)] px-4 text-sm font-semibold transition hover:border-[var(--accent)]"
                onClick={() => setIsCreating(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)]"
                type="submit"
              >
                Create tag
              </button>
            </div>
          </form>
        ) : (
          <button
            className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)]"
            onClick={() => setIsCreating(true)}
            type="button"
          >
            Create new tag
          </button>
        )}
      </div>
    </div>
  );
}

function TagRuleTools({
  accountId,
  category,
  transactions,
}: {
  accountId: string | null;
  category: CategoryOption;
  transactions: RecentTransaction[];
}) {
  const [customMatchText, setCustomMatchText] = useState("");
  const [matchField, setMatchField] = useState<TagMatchField>(
    "rawPersonalFinanceDetailed",
  );
  const [matchValue, setMatchValue] = useState("");
  const selectedField =
    tagMatchFieldOptions.find((option) => option.id === matchField) ??
    tagMatchFieldOptions[0];
  const matchTerms = parseCustomMatchTerms(matchValue);
  const fieldMatches =
    matchTerms.length > 0
      ? transactions.filter((transaction) =>
          doesTransactionMatchField(transaction, matchField, matchTerms),
        )
      : [];
  const fieldMatchIds = fieldMatches.map((transaction) => transaction.id);
  const customMatchTerms = parseCustomMatchTerms(customMatchText);
  const customMatches =
    customMatchTerms.length > 0
      ? transactions.filter((transaction) =>
          doesTransactionMatchCustomTerms(transaction, customMatchTerms),
        )
      : [];
  const customMatchIds = customMatches.map((transaction) => transaction.id);

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
      <div>
        <p className="text-sm font-semibold">Tag automation</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Preview is based on the transactions currently loaded in Recent
          Transactions. Applied matches become manual assignments.
        </p>
      </div>

      <form
        action={assignFinanceCategoryToTransactions}
        className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3"
      >
        <input name="accountId" type="hidden" value={accountId ?? ""} />
        <input name="categoryId" type="hidden" value={category.id} />
        {fieldMatchIds.map((transactionId) => (
          <input
            key={transactionId}
            name="transactionIds"
            type="hidden"
            value={transactionId}
          />
        ))}
        <p className="text-sm font-semibold">Match by</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.1fr]">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            <span>Field</span>
            <select
              className="min-h-10 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 outline-none transition focus:border-[var(--accent)]"
              onChange={(event) =>
                setMatchField(event.target.value as TagMatchField)
              }
              value={matchField}
            >
              {tagMatchFieldOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            <span>Contains</span>
            <input
              className="min-h-10 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 outline-none transition focus:border-[var(--accent)]"
              onChange={(event) => setMatchValue(event.target.value)}
              placeholder="restaurant, food, cafe"
              value={matchValue}
            />
          </label>
        </div>
        <div className="mt-3 rounded-md border border-dashed border-[var(--line)] bg-[var(--empty)] p-3 text-sm">
          <p className="font-semibold">
            {fieldMatches.length} transaction
            {fieldMatches.length === 1 ? "" : "s"} match
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {matchTerms.length > 0
              ? `${selectedField.description} Terms: ${matchTerms.join(", ")}`
              : "Enter one or more comma-separated values to preview matches."}
          </p>
        </div>
        <button
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={fieldMatches.length === 0}
          type="submit"
        >
          Apply tag to previewed matches
        </button>
      </form>

      <form
        action={createFinanceCategoryTextRule}
        className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3"
      >
        <input name="accountId" type="hidden" value={accountId ?? ""} />
        <input name="categoryId" type="hidden" value={category.id} />
        <input name="matchText" type="hidden" value={customMatchText} />
        {customMatchIds.map((transactionId) => (
          <input
            key={transactionId}
            name="transactionIds"
            type="hidden"
            value={transactionId}
          />
        ))}
        <p className="text-sm font-semibold">Custom text rule</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Save reusable terms for future imports and apply them to the loaded
          preview.
        </p>
        <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
          <span>Match words/categories</span>
          <textarea
            className="min-h-20 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 py-2 outline-none transition focus:border-[var(--accent)]"
            onChange={(event) => setCustomMatchText(event.target.value)}
            placeholder="food, restaurant, beverage, cafe"
            value={customMatchText}
          />
        </label>
        <div className="mt-3 rounded-md border border-dashed border-[var(--line)] bg-[var(--empty)] p-3 text-sm">
          <p className="font-semibold">
            {customMatches.length} transaction
            {customMatches.length === 1 ? "" : "s"} match
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {customMatchTerms.length > 0
              ? `Using ${customMatchTerms.length} term${
                  customMatchTerms.length === 1 ? "" : "s"
                }: ${customMatchTerms.join(", ")}`
              : "Separate multiple terms with commas or new lines."}
          </p>
        </div>
        <button
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={customMatchTerms.length === 0}
          type="submit"
        >
          Save rule and apply preview
        </button>
      </form>
    </div>
  );
}

function CashFlowRadio({
  defaultChecked = false,
  description,
  label,
  value,
}: {
  defaultChecked?: boolean;
  description: string;
  label: string;
  value: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-sm">
      <input
        className="mt-1 h-4 w-4 accent-[var(--accent)]"
        defaultChecked={defaultChecked}
        name="cashFlowType"
        type="radio"
        value={value}
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs text-[var(--muted)]">{description}</span>
      </span>
    </label>
  );
}

function formatCategoryBehavior(category: CategoryOption) {
  if (category.includeInIncome) {
    return "Income";
  }

  if (category.includeInSpending) {
    return "Spending";
  }

  return "Neutral";
}

function normalizeText(value: string | null) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseCustomMatchTerms(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((term) => normalizeText(term))
        .filter((term) => term.length >= 2),
    ),
  );
}

function doesTransactionMatchField(
  transaction: RecentTransaction,
  field: TagMatchField,
  terms: string[],
) {
  const searchableText = normalizeText(
    getTransactionFieldValue(transaction, field),
  );

  return terms.some((term) => searchableText.includes(term));
}

function doesTransactionMatchCustomTerms(
  transaction: RecentTransaction,
  terms: string[],
) {
  const searchableText = normalizeText(
    [
      transaction.description,
      transaction.storedCategory,
      transaction.rawDescription,
      transaction.rawMerchantName,
      transaction.rawCategoryPath,
      transaction.rawPersonalFinancePrimary,
      transaction.rawPersonalFinanceDetailed,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return terms.some((term) => searchableText.includes(term));
}

function getTransactionFieldValue(
  transaction: RecentTransaction,
  field: TagMatchField,
) {
  switch (field) {
    case "description":
      return transaction.rawDescription ?? transaction.description;
    case "rawCategoryPath":
      return transaction.rawCategoryPath;
    case "rawMerchantName":
      return transaction.rawMerchantName;
    case "rawPersonalFinanceDetailed":
      return transaction.rawPersonalFinanceDetailed;
    case "rawPersonalFinancePrimary":
      return transaction.rawPersonalFinancePrimary;
  }
}
