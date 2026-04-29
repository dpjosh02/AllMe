import Link from "next/link";

import {
  AppPageShell,
  PageGrid,
  PageGridItem,
  PageHero,
} from "@/components/layout/page-scaffold";
import { syncFintableNow } from "@/features/finance/dashboard/actions";
import { AccountsPanel } from "@/features/finance/dashboard/components/accounts-panel";
import { RecentTransactions } from "@/features/finance/dashboard/components/recent-transactions";
import { SummaryMetrics } from "@/features/finance/dashboard/components/summary-metrics";
import { SyncFintableButton } from "@/features/finance/dashboard/components/sync-fintable-button";
import { getFinanceDashboardData } from "@/features/finance/dashboard/queries";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const currentUser = await requirePageUser("/finance");
  const data = await getFinanceDashboardData(currentUser.id);

  return (
    <AppPageShell>
      <PageHero
        eyebrow={
          <Link className="inline-flex" href="/">
            AllMe / Money
          </Link>
        }
        right={
          <div className="flex h-full flex-col justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
            <ImportStatus latestImport={data.latestImport} />
            <form action={syncFintableNow}>
              <SyncFintableButton />
            </form>
          </div>
        }
        subtitle="A daily operating view for accounts, cash flow, review work, and transaction-level decisions."
        title="Finance command ledger"
      />

      <SummaryMetrics transactions={data.metricTransactions} />

      <PageGrid className="items-stretch">
        <PageGridItem span="five">
          <AccountsPanel accounts={data.accounts} />
        </PageGridItem>

        <PageGridItem span="seven">
          <RecentTransactions
            accounts={data.accounts}
            categories={data.categories}
            transactions={data.recentTransactions}
          />
        </PageGridItem>
      </PageGrid>
    </AppPageShell>
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
