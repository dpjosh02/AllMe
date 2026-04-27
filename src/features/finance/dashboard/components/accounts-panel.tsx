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
    <div className="allme-card p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="allme-kicker">Balance Sheet</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
            Accounts
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Latest balance snapshots from Fintable.
          </p>
        </div>
        <CircleDollarSign
          aria-hidden="true"
          className="h-6 w-6 text-[var(--accent)]"
        />
      </div>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-[var(--panel)] to-transparent"
        />
        <div className="max-h-[22rem] overflow-y-auto pr-2 [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]">
          <div className="space-y-2">
            {accounts.length === 0 ? (
              <EmptyState label="No accounts imported yet." />
            ) : (
              accounts.map((account) => {
                const displayName = account.displayName ?? account.name;
                const accountHref = `/finance/accounts/${account.id}` as Route;

                return (
                  <Link
                    className="grid gap-3 rounded-xl border border-transparent bg-[var(--empty)] px-3 py-3 transition hover:border-[var(--accent)] hover:bg-[var(--panel-strong)] sm:grid-cols-[1fr_auto]"
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
                      <p
                        className={`font-semibold tracking-[-0.02em] ${getAmountClass(account.balance ?? "0")}`}
                      >
                        {account.balance
                          ? formatCurrency(account.balance)
                          : "--"}
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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[var(--panel)] to-transparent"
        />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="allme-card-subtle border-dashed p-4 text-sm text-[var(--muted)]">
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
