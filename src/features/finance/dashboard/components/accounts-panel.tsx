import { CircleDollarSign } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

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
            const displayName = account.displayName ?? account.name;
            const accountHref = `/finance/accounts/${account.id}` as Route;

            return (
              <Link
                className="grid gap-3 py-4 transition first:pt-0 last:pb-0 hover:text-[var(--accent-strong)] sm:grid-cols-[1fr_auto]"
                href={accountHref}
                key={account.id}
              >
                <div className="min-w-0">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{displayName}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {formatInstitutionName(account.institutionName)}
                    </p>
                  </div>
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
              </Link>
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
