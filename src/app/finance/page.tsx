import Link from "next/link";

import { syncFintableNow } from "@/features/finance/dashboard/actions";
import { AccountsPanel } from "@/features/finance/dashboard/components/accounts-panel";
import { RecentTransactions } from "@/features/finance/dashboard/components/recent-transactions";
import { SummaryMetrics } from "@/features/finance/dashboard/components/summary-metrics";
import { SyncFintableButton } from "@/features/finance/dashboard/components/sync-fintable-button";
import { getFinanceDashboardData } from "@/features/finance/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const data = await getFinanceDashboardData();

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
          <div className="flex flex-col gap-2 sm:items-end">
            <ImportStatus latestImport={data.latestImport} />
            <form action={syncFintableNow}>
              <SyncFintableButton />
            </form>
          </div>
        </header>

        <SummaryMetrics
          accountCount={data.summary.accountCount}
          transactions={data.metricTransactions}
        />

        <section className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
          <AccountsPanel accounts={data.accounts} />

          <RecentTransactions
            accounts={data.accounts}
            categories={data.categories}
            transactions={data.recentTransactions}
          />
        </section>
      </div>
    </main>
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
