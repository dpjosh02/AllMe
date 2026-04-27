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
    <main className="allme-page min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[92rem] flex-col gap-7">
        <header className="allme-card overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <Link
                className="allme-kicker mb-3 inline-flex text-[var(--accent)]"
                href="/"
              >
                AllMe / Money
              </Link>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
                Finance command ledger.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                A daily operating view for accounts, cash flow, review work, and
                transaction-level decisions.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <ImportStatus latestImport={data.latestImport} />
              <form action={syncFintableNow}>
                <SyncFintableButton />
              </form>
            </div>
          </div>
        </header>

        <SummaryMetrics
          accountCount={data.summary.accountCount}
          transactions={data.metricTransactions}
        />

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.35fr]">
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
  latestImport: Awaited<
    ReturnType<typeof getFinanceDashboardData>
  >["latestImport"];
}) {
  if (!latestImport) {
    return (
      <div className="allme-control px-3 py-2 text-sm text-[var(--muted)]">
        No imports yet
      </div>
    );
  }

  return (
    <div className="allme-control px-3 py-2 text-sm text-[var(--muted)]">
      <span className="font-semibold text-[var(--foreground)]">
        Import {latestImport.status}
      </span>
      <span>
        {" "}
        · {latestImport.rowsScanned} scanned · {latestImport.rowsSkipped}{" "}
        skipped
      </span>
    </div>
  );
}
