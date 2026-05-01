"use client";

import { Check, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import {
  assignFinanceTransactionCategory,
  deleteFinanceTransaction,
} from "@/features/finance/dashboard/actions";
import type {
  CategoryOption,
  RecentTransaction,
} from "@/features/finance/dashboard/components/recent-transactions-types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const skipDeleteWarningStorageKey = "allme.skipTransactionDeleteWarning";

export function CategoryBadge({
  color,
  name,
}: {
  color: string | null;
  name: string | null;
}) {
  const label = name ?? "Uncategorized";
  const badgeColor = color ?? "#64748b";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span
        className="inline-flex items-center rounded-full border px-2 py-1 font-semibold"
        style={{
          borderColor: badgeColor,
          color: badgeColor,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function TransactionDetailModal({
  categories,
  onClose,
  transaction,
}: {
  categories: CategoryOption[];
  onClose: () => void;
  transaction: RecentTransaction;
}) {
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [dontShowDeleteWarningAgain, setDontShowDeleteWarningAgain] =
    useState(false);

  function startDeleteFlow() {
    if (localStorage.getItem(skipDeleteWarningStorageKey) === "true") {
      deleteFormRef.current?.requestSubmit();
      return;
    }

    setIsConfirmingDelete(true);
  }

  function submitDelete() {
    if (dontShowDeleteWarningAgain) {
      localStorage.setItem(skipDeleteWarningStorageKey, "true");
    }

    onClose();
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      data-testid="transaction-detail-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="max-h-[min(42rem,92vh)] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Transaction Detail
            </p>
            <h3 className="mt-1 truncate text-2xl font-semibold">
              {transaction.description}
            </h3>
          </div>
          <button
            aria-label="Close transaction detail"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--line)] transition hover:border-[var(--accent)]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            label="Amount"
            value={
              <span className={getAmountClass(transaction.amount)}>
                {formatCurrency(transaction.amount)}
              </span>
            }
          />
          <DetailItem
            label="Date"
            value={dateFormatter.format(
              new Date(`${transaction.postedDate}T00:00:00`),
            )}
          />
          <DetailItem label="Account" value={transaction.accountName} />
          <CategoryDetailItem
            categories={categories}
            isOpen={isCategoryPickerOpen}
            onToggle={() => setIsCategoryPickerOpen((current) => !current)}
            transaction={transaction}
          />
          <DetailItem
            label="Raw Response Description"
            value={transaction.rawDescription ?? "Not provided"}
          />
          <DetailItem
            label="Raw Merchant"
            value={transaction.rawMerchantName ?? "Not provided"}
          />
          <DetailItem
            label="Raw Category Path"
            value={transaction.rawCategoryPath ?? "Not provided"}
          />
          <DetailItem
            label="Raw Personal Finance Category"
            value={formatRawPersonalFinanceCategory(transaction)}
          />
          <DetailItem
            label="Fintable Sheet Category"
            value={transaction.storedCategory ?? "Not provided"}
          />
        </div>

        <form
          action={deleteFinanceTransaction}
          className="hidden"
          onSubmit={submitDelete}
          ref={deleteFormRef}
        >
          <input name="transactionId" type="hidden" value={transaction.id} />
          <input name="accountId" type="hidden" value={transaction.accountId} />
        </form>

        <div className="mt-5 rounded-md border border-[var(--line)] bg-[var(--empty)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Remove transaction</p>
              <p className="text-sm text-[var(--muted)]">
                This removes the local database row. A future Fintable sync can
                re-import it unless we add an ignore list.
              </p>
            </div>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--danger)] px-4 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-[var(--panel)]"
              onClick={startDeleteFlow}
              type="button"
            >
              Delete
            </button>
          </div>

          {isConfirmingDelete ? (
            <div className="mt-4 rounded-md border border-[var(--danger)] bg-[var(--panel)] p-3">
              <p className="font-semibold text-[var(--danger)]">
                Are you sure?
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                This action deletes this transaction from the local database.
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  checked={dontShowDeleteWarningAgain}
                  className="h-4 w-4 accent-[var(--accent)]"
                  onChange={(event) =>
                    setDontShowDeleteWarningAgain(event.target.checked)
                  }
                  type="checkbox"
                />
                Do not show this warning again
              </label>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--line)] px-4 text-sm font-semibold transition hover:border-[var(--accent)]"
                  onClick={() => setIsConfirmingDelete(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--danger)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:opacity-90"
                  onClick={() => deleteFormRef.current?.requestSubmit()}
                  type="button"
                >
                  Delete transaction
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CategoryDetailItem({
  categories,
  isOpen,
  onToggle,
  transaction,
}: {
  categories: CategoryOption[];
  isOpen: boolean;
  onToggle: () => void;
  transaction: RecentTransaction;
}) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--empty)] p-3 sm:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        AllMe Category
      </p>
      <button
        className="mt-2 inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-left text-sm font-semibold transition hover:border-[var(--accent)]"
        onClick={onToggle}
        type="button"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full"
            style={{
              backgroundColor: transaction.assignedCategoryColor ?? "#64748b",
            }}
          />
          <span className="truncate">
            {transaction.assignedCategoryName ?? "Uncategorized"}
          </span>
        </span>
        <span className="text-xs text-[var(--muted)]">Change</span>
      </button>

      {isOpen ? (
        <div className="mt-3 space-y-4">
          <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {categories.map((category) => {
              const isSelected = category.id === transaction.assignedCategoryId;

              return (
                <form
                  action={assignFinanceTransactionCategory}
                  key={category.id}
                >
                  <input
                    name="transactionId"
                    type="hidden"
                    value={transaction.id}
                  />
                  <input
                    name="accountId"
                    type="hidden"
                    value={transaction.accountId}
                  />
                  <input name="categoryId" type="hidden" value={category.id} />
                  <button
                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 text-left text-sm font-semibold transition hover:border-[var(--accent)] ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--panel-strong)]"
                        : "border-[var(--line)] bg-[var(--panel)]"
                    }`}
                    type="submit"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate">{category.name}</span>
                    </span>
                    {isSelected ? (
                      <Check aria-hidden="true" className="h-4 w-4" />
                    ) : null}
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--empty)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}

function formatCurrency(value: string) {
  return currencyFormatter.format(Number(value));
}

function getAmountClass(value: string) {
  return Number(value) < 0 ? "money-negative" : "money-positive";
}

function formatRawPersonalFinanceCategory(transaction: RecentTransaction) {
  const categoryParts = [
    transaction.rawPersonalFinancePrimary,
    transaction.rawPersonalFinanceDetailed,
  ].filter(Boolean);

  if (categoryParts.length === 0) {
    return "Not provided";
  }

  const confidence = transaction.rawPersonalFinanceConfidence
    ? ` (${transaction.rawPersonalFinanceConfidence})`
    : "";

  return `${categoryParts.join(" / ")}${confidence}`;
}
