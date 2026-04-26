import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Database,
} from "lucide-react";

import { RecentTransactions } from "@/features/finance/dashboard/components/recent-transactions";
import { getFinanceDashboardData } from "@/features/finance/dashboard/queries";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function FinancePage() {
  const data = await getFinanceDashboardData();
  const accountNames = data.accounts.map((account) => account.name);

  return (
    <main className="min-h-screen px-5 py-5 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              className="mb-3 inline-flex text-sm font-semibold text-[var(--accent-strong)]"
              href="/"
            >
              AllMe
            </Link>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Finance
            </h1>
          </div>
          <ImportStatus latestImport={data.latestImport} />
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            detail="Imported active accounts"
            icon={<Banknote aria-hidden="true" className="h-5 w-5" />}
            label="Accounts"
            value={String(data.summary.accountCount)}
          />
          <MetricCard
            detail="Normalized transactions"
            icon={<Database aria-hidden="true" className="h-5 w-5" />}
            label="Transactions"
            value={String(data.summary.transactionCount)}
          />
          <MetricCard
            detail="Positive cash flow rows"
            icon={<ArrowDownLeft aria-hidden="true" className="h-5 w-5" />}
            label="Inflows"
            value={formatCurrency(data.summary.totalInflow)}
            valueClassName="money-positive"
          />
          <MetricCard
            detail="Spend and transfers out"
            icon={<ArrowUpRight aria-hidden="true" className="h-5 w-5" />}
            label="Outflows"
            value={`-${formatCurrency(data.summary.totalOutflow)}`}
            valueClassName="money-negative"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
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
              {data.accounts.length === 0 ? (
                <EmptyState label="No accounts imported yet." />
              ) : (
                data.accounts.map((account) => (
                  <div
                    className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
                    key={account.id}
                  >
                    <div>
                      <p className="font-semibold">{account.name}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {account.institutionName ?? "Unknown institution"}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={`font-semibold ${getAmountClass(account.balance ?? "0")}`}>
                        {account.balance ? formatCurrency(account.balance) : "--"}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {account.snapshotDate
                          ? dateFormatter.format(new Date(`${account.snapshotDate}T00:00:00`))
                          : "No snapshot"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <RecentTransactions
            accountNames={accountNames}
            transactions={data.recentTransactions}
          />
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  value,
  valueClassName,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <article className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between text-[var(--accent)]">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
        </h2>
        {icon}
      </div>
      <p className={`text-3xl font-semibold ${valueClassName ?? ""}`}>{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
    </article>
  );
}

function ImportStatus({
  latestImport,
}: {
  latestImport: Awaited<ReturnType<typeof getFinanceDashboardData>>["latestImport"];
}) {
  if (!latestImport) {
    return (
      <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--muted)]">
        No imports yet
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--muted)]">
      <span className="font-semibold text-[var(--foreground)]">
        Import {latestImport.status}
      </span>
      <span>
        {" "}
        · {latestImport.rowsScanned} scanned · {latestImport.rowsSkipped} skipped
      </span>
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

function getAmountClass(value: string) {
  return Number(value) < 0 ? "money-negative" : "money-positive";
}
