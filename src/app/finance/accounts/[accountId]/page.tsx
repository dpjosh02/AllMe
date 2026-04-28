import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { renameFinanceAccount } from "@/features/finance/dashboard/actions";
import { RecentTransactions } from "@/features/finance/dashboard/components/recent-transactions";
import { getFinanceAccountDetail } from "@/features/finance/dashboard/queries";
import { requirePageUser } from "@/server/auth/guards";

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

export default async function FinanceAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const currentUser = await requirePageUser(`/finance/accounts/${accountId}`);
  const account = await getFinanceAccountDetail({
    accountId,
    userId: currentUser.id,
  });

  if (!account) {
    notFound();
  }

  const displayName = account.displayName ?? account.name;

  return (
    <main className="min-h-screen px-5 py-5 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"
            href="/finance"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Finance
          </Link>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Account
              </p>
              <h1 className="truncate text-4xl font-semibold leading-tight sm:text-5xl">
                {displayName}
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {formatInstitutionName(account.institutionName)}
              </p>
            </div>
            <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm lg:min-w-72">
              <p
                className={`text-2xl font-semibold ${getAmountClass(
                  account.balance ?? "0",
                )}`}
              >
                {account.balance ? formatCurrency(account.balance) : "--"}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {account.snapshotDate
                  ? `Snapshot ${dateFormatter.format(
                      new Date(`${account.snapshotDate}T00:00:00`),
                    )}`
                  : "No balance snapshot"}
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Account Name</h2>
            <p className="text-sm text-[var(--muted)]">
              Local display names are preserved across future Fintable imports.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <form action={renameFinanceAccount} className="flex flex-col gap-2 sm:flex-row">
              <input name="accountId" type="hidden" value={account.id} />
              <input
                className="min-h-10 min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
                defaultValue={displayName}
                name="displayName"
                placeholder={account.name}
              />
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)]"
                type="submit"
              >
                Save name
              </button>
            </form>
            {account.displayName ? (
              <form action={renameFinanceAccount}>
                <input name="accountId" type="hidden" value={account.id} />
                <input name="displayName" type="hidden" value="" />
                <button
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--line)] px-4 text-sm font-semibold transition hover:border-[var(--accent)] lg:w-auto"
                  type="submit"
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Reset
                </button>
              </form>
            ) : null}
          </div>
          {account.displayName ? (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Original Fintable name: {account.name}
            </p>
          ) : null}
        </section>

        <RecentTransactions
          accounts={[account]}
          categories={account.categories}
          showAccountFilter={false}
          transactions={account.transactions}
        />
      </div>
    </main>
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
