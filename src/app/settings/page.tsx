import {
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  KeyRound,
  PlugZap,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { updateOwnerSettings } from "@/features/settings/actions";
import {
  currencyOptions,
  getSettingsPageData,
  timezoneOptions,
} from "@/features/settings/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getSettingsPageData();

  return (
    <main className="allme-page min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="allme-card overflow-hidden p-5 sm:p-6">
          <p className="allme-kicker text-[var(--accent)]">Settings</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            Control panel.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            Owner preferences, identity assumptions, and integration health for
            the local personal build.
          </p>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
          <section className="allme-card p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="allme-kicker">Owner Preferences</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                  Profile defaults
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  These values live in Postgres and become the default context
                  for future Today, Notes, Calendar, and Finance views.
                </p>
              </div>
              <UserRound
                aria-hidden="true"
                className="h-6 w-6 shrink-0 text-[var(--accent)]"
              />
            </div>

            {data.owner.exists && data.settings ? (
              <form action={updateOwnerSettings} className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <ReadOnlyField label="Owner email" value={data.owner.email ?? "Not set"} />
                  <ReadOnlyField
                    label="Display name"
                    value={data.owner.name ?? "Not set"}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    defaultValue={data.settings.timezone}
                    icon={<Clock3 aria-hidden="true" className="h-4 w-4" />}
                    label="Timezone"
                    name="timezone"
                    options={timezoneOptions}
                  />
                  <SelectField
                    defaultValue={data.settings.preferredCurrency}
                    icon={
                      <CircleDollarSign
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    }
                    label="Preferred currency"
                    name="preferredCurrency"
                    options={currencyOptions}
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--muted)]">
                    Last updated{" "}
                    {data.settings.updatedAt
                      ? dateFormatter.format(data.settings.updatedAt)
                      : "never"}
                  </p>
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent-strong)]"
                    type="submit"
                  >
                    Save settings
                  </button>
                </div>
              </form>
            ) : (
              <MissingOwnerNotice
                emailConfigured={data.owner.emailConfigured}
                ownerEmail={data.owner.email}
              />
            )}
          </section>

          <section className="grid gap-5">
            <StatusCard
              detail={
                data.fintable.ready
                  ? "Google Sheets access and spreadsheet configuration are present. Secret values and identifiers are intentionally hidden."
                  : "Fintable needs spreadsheet and Google access configuration."
              }
              icon={<PlugZap aria-hidden="true" className="h-5 w-5" />}
              label="Fintable"
              statusLabel={data.fintable.badgeLabel}
              tone={data.fintable.tone}
              rows={[
                ["Spreadsheet", data.fintable.hasSpreadsheet ? "Configured" : "Missing"],
                ["Google access", data.fintable.hasGoogleAccess ? data.fintable.accessMode : "Missing"],
                ["Accounts range", data.fintable.accountsRange],
                ["Transactions range", data.fintable.transactionsRange],
                ["Secret values", "Hidden"],
              ]}
            />
            <ImportHealthCard importHealth={data.importHealth} />
            <StatusCard
              detail={
                data.auth.googleProviderConfigured
                  ? "Google sign-in credential presence is visible here, but client ids and secrets are hidden."
                  : "Local owner mode is intentional for this phase. Google OAuth is not required until hosted auth is enabled."
              }
              icon={<KeyRound aria-hidden="true" className="h-5 w-5" />}
              label="Identity"
              statusLabel={data.auth.badgeLabel}
              tone={data.auth.tone}
              rows={[
                ["Mode", data.auth.status],
                [
                  "Auth secret",
                  data.auth.authSecretConfigured ? "Configured" : "Missing",
                ],
                [
                  "Google OAuth",
                  data.auth.googleProviderConfigured ? "Configured" : "Not configured",
                ],
                ["Secret values", "Hidden"],
              ]}
            />
            <StatusCard
              detail={data.authBoundary.routePolicy}
              icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
              label="Access Boundary"
              statusLabel={data.authBoundary.statusLabel}
              tone={data.authBoundary.tone}
              rows={[
                ["Mode", data.authBoundary.modeLabel],
                ["Enforcement", data.authBoundary.enforcementLabel],
                ["Product routes", "App shell routes"],
                ["Public routes", "Auth and assets"],
              ]}
            >
              <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                    Routes covered
                  </p>
                  <p className="mt-1 leading-6 text-[var(--foreground)]">
                    {data.authBoundary.productRoutesSummary}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                    Next boundary step
                  </p>
                  <p className="mt-1 leading-6 text-[var(--muted)]">
                    {data.authBoundary.nextStep}
                  </p>
                </div>
              </div>
            </StatusCard>
          </section>
        </section>
      </div>
    </main>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function SelectField({
  defaultValue,
  icon,
  label,
  name,
  options,
}: {
  defaultValue: string;
  icon: React.ReactNode;
  label: string;
  name: string;
  options: readonly string[];
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <select
        className="allme-control min-h-11 px-3 outline-none"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MissingOwnerNotice({
  emailConfigured,
  ownerEmail,
}: {
  emailConfigured: boolean;
  ownerEmail: string | null;
}) {
  return (
    <div className="rounded-xl border border-[var(--warn)] bg-[var(--empty)] p-4">
      <div className="flex items-start gap-3">
        <CircleAlert
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warn)]"
        />
        <div>
          <p className="font-semibold">Owner user is not ready.</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            {emailConfigured
              ? `ALLME_IMPORT_USER_EMAIL is configured for ${ownerEmail}, but that user does not exist in Postgres yet.`
              : "ALLME_IMPORT_USER_EMAIL is not configured."}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  children,
  detail,
  icon,
  label,
  rows,
  statusLabel,
  tone,
}: {
  children?: React.ReactNode;
  detail: string;
  icon: React.ReactNode;
  label: string;
  rows: Array<[string, string]>;
  statusLabel: string;
  tone: StatusTone;
}) {
  const statusStyle = getStatusStyle(tone);

  return (
    <article className="allme-card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="allme-kicker">{label}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {detail}
          </p>
        </div>
        <div className="text-[var(--accent)]">{icon}</div>
      </div>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--empty)] px-3 py-1 text-xs font-semibold">
        {tone === "attention" ? (
          <CircleAlert
            aria-hidden="true"
            className={`h-4 w-4 ${statusStyle.iconClassName}`}
          />
        ) : (
          <CheckCircle2
            aria-hidden="true"
            className={`h-4 w-4 ${statusStyle.iconClassName}`}
          />
        )}
        {statusLabel}
      </div>
      <dl className="grid gap-2">
        {rows.map(([rowLabel, value]) => (
          <div
            className="flex items-center justify-between gap-4 rounded-xl bg-[var(--empty)] px-3 py-2"
            key={rowLabel}
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              {rowLabel}
            </dt>
            <dd className="truncate text-right text-sm font-semibold">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {children}
    </article>
  );
}

function ImportHealthCard({
  importHealth,
}: {
  importHealth: Awaited<
    ReturnType<typeof getSettingsPageData>
  >["importHealth"];
}) {
  const latest = importHealth?.latest ?? null;
  const tone = getImportHealthTone(latest?.status);
  const statusLabel = getImportStatusLabel(latest?.status);

  return (
    <StatusCard
      detail={
        latest
          ? "Latest import-run health from AllMe's local database. Error text is hidden here to avoid exposing provider details."
          : "No Fintable import run has been recorded for this owner yet."
      }
      icon={<PlugZap aria-hidden="true" className="h-5 w-5" />}
      label="Sync Health"
      rows={[
        ["Last status", formatImportStatus(latest?.status)],
        ["Last finished", latest?.finishedAt ? dateFormatter.format(latest.finishedAt) : "Not finished"],
        ["Rows scanned", latest ? String(latest.rowsScanned) : "--"],
        ["Rows inserted", latest ? String(latest.rowsInserted) : "--"],
        ["Rows updated", latest ? String(latest.rowsUpdated) : "--"],
        ["Rows skipped", latest ? String(latest.rowsSkipped) : "--"],
        ["Failure detail", latest?.hasErrorSummary ? "Stored, hidden" : "None"],
      ]}
      statusLabel={statusLabel}
      tone={tone}
    >
      {importHealth && importHealth.recent.length > 1 ? (
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Recent runs
          </p>
          <div className="grid gap-2">
            {importHealth.recent.slice(0, 3).map((run) => (
              <div
                className="flex items-center justify-between gap-3 rounded-xl bg-[var(--empty)] px-3 py-2 text-sm"
                key={run.id}
              >
                <span className="font-semibold">
                  {formatImportStatus(run.status)}
                </span>
                <span className="text-right text-xs text-[var(--muted)]">
                  {dateFormatter.format(run.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </StatusCard>
  );
}

type StatusTone = "attention" | "neutral" | "ready";

function getImportHealthTone(status: string | null | undefined): StatusTone {
  if (status === "succeeded") {
    return "ready";
  }

  if (status === "failed") {
    return "attention";
  }

  return status ? "neutral" : "attention";
}

function getImportStatusLabel(status: string | null | undefined) {
  if (status === "succeeded") {
    return "Last sync succeeded";
  }

  if (status === "failed") {
    return "Last sync failed";
  }

  if (status === "running") {
    return "Sync running";
  }

  if (status === "pending") {
    return "Sync pending";
  }

  return "No sync runs";
}

function formatImportStatus(status: string | null | undefined) {
  if (!status) {
    return "No runs";
  }

  return status
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusStyle(tone: StatusTone) {
  if (tone === "ready") {
    return { iconClassName: "text-[var(--success)]" };
  }

  if (tone === "attention") {
    return { iconClassName: "text-[var(--warn)]" };
  }

  return { iconClassName: "text-[var(--accent)]" };
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});
