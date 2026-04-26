"use client";

import { CircleDollarSign, Pencil, RotateCcw, X } from "lucide-react";
import { useState } from "react";

import { renameFinanceAccount } from "@/features/finance/dashboard/actions";

type Account = {
  id: string;
  name: string;
  displayName: string | null;
  institutionName: string | null;
  balance: string | null;
  snapshotDate: string | null;
};

type AccountsPanelProps = {
  accounts: Account[];
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function AccountsPanel({ accounts }: AccountsPanelProps) {
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Accounts</h2>
          <p className="text-sm text-[var(--muted)]">
            Latest balance snapshots from Fintable.
          </p>
        </div>
        <CircleDollarSign aria-hidden="true" className="h-6 w-6 text-[var(--accent)]" />
      </div>
      <div className="divide-y divide-[var(--line)]">
        {accounts.length === 0 ? (
          <EmptyState label="No accounts imported yet." />
        ) : (
          accounts.map((account) => {
            const isEditing = editingAccountId === account.id;
            const displayName = account.displayName ?? account.name;

            return (
              <div
                className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
                key={account.id}
              >
                <div className="min-w-0">
                  {isEditing ? (
                    <form
                      action={async (formData) => {
                        await renameFinanceAccount(formData);
                        setEditingAccountId(null);
                      }}
                      className="flex flex-col gap-2 sm:flex-row"
                    >
                      <input name="accountId" type="hidden" value={account.id} />
                      <input
                        autoFocus
                        className="min-h-10 min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
                        defaultValue={displayName}
                        name="displayName"
                        placeholder={account.name}
                      />
                      <div className="flex gap-2">
                        <button
                          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--line)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
                          type="submit"
                        >
                          Save
                        </button>
                        <button
                          aria-label="Cancel account rename"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] transition hover:border-[var(--accent)]"
                          onClick={() => setEditingAccountId(null)}
                          type="button"
                        >
                          <X aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex min-w-0 items-start gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{displayName}</p>
                        <p className="text-sm text-[var(--muted)]">
                          {formatInstitutionName(account.institutionName)}
                        </p>
                        {account.displayName ? (
                          <p className="truncate text-xs text-[var(--muted)]">
                            Fintable: {account.name}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          aria-label={`Rename ${displayName}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--muted)] transition hover:border-[var(--line)] hover:text-[var(--foreground)]"
                          onClick={() => setEditingAccountId(account.id)}
                          type="button"
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </button>
                        {account.displayName ? (
                          <form action={renameFinanceAccount}>
                            <input name="accountId" type="hidden" value={account.id} />
                            <input name="displayName" type="hidden" value="" />
                            <button
                              aria-label={`Reset ${displayName} to Fintable name`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--muted)] transition hover:border-[var(--line)] hover:text-[var(--foreground)]"
                              type="submit"
                            >
                              <RotateCcw aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <p className={`font-semibold ${getAmountClass(account.balance ?? "0")}`}>
                    {account.balance ? formatCurrency(account.balance) : "--"}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {account.snapshotDate
                      ? dateFormatter.format(
                          new Date(`${account.snapshotDate}T00:00:00`),
                        )
                      : "No snapshot"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--empty)] p-4 text-sm text-[var(--muted)]">
      {label}
    </div>
  );
}

function formatCurrency(value: string) {
  return currencyFormatter.format(Number(value));
}

function formatInstitutionName(institutionName: string | null) {
  if (!institutionName) {
    return "Unknown institution";
  }

  return institutionName.replace(/\s*\(Connection-\d+.*?\)\s*/gi, "").trim();
}

function getAmountClass(value: string) {
  return Number(value) < 0 ? "money-negative" : "money-positive";
}
