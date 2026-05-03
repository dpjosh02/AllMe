import {
  CircleAlert,
  CircleDollarSign,
  Clock3,
  CalendarDays,
  KeyRound,
  PlugZap,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  AllMeCard,
  AppPageShell,
  KeyValueRow,
  MetricGrid,
  PageGrid,
  PageGridItem,
  PageHero,
  PageSection,
  StatusPill,
  type StatusTone,
} from "@/components/layout/page-scaffold";
import { updateOwnerSettings } from "@/features/settings/actions";
import {
  currencyOptions,
  getSettingsPageData,
  timezoneOptions,
} from "@/features/settings/queries";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await requirePageUser("/settings");
  const data = await getSettingsPageData(currentUser.id);

  return (
    <AppPageShell>
      <PageHero
        eyebrow="Settings"
        right={
          <div className="flex h-full flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="allme-kicker">Current mode</p>
                <p className="mt-2 text-lg font-semibold">
                  {data.authBoundary.modeLabel}
                </p>
              </div>
              <StatusPill
                label={data.authBoundary.statusLabel}
                tone={data.authBoundary.tone}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              {data.authBoundary.enforcementLabel}
            </p>
          </div>
        }
        subtitle="Owner defaults, authentication posture, integration health, and sync readiness for the private AllMe environment."
        title="Control panel"
      />

      <PageGrid>
        <PageGridItem span="primary">
          <AllMeCard variant="form">
            <PageSection
              description="Default context for Today, Notes, Calendar, and Finance."
              eyebrow="Owner Profile"
              icon={
                <UserRound aria-hidden="true" className="h-6 w-6 shrink-0" />
              }
              title="Profile defaults"
            >
              {data.owner.exists && data.settings ? (
                <form action={updateOwnerSettings} className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <ReadOnlyField
                      label="Owner email"
                      value={data.owner.email ?? "Not set"}
                    />
                    <ReadOnlyField
                      label="Display name"
                      value={data.owner.name ?? "Not set"}
                    />
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
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="support">
          <StatusCard
            detail={
              data.auth.googleProviderConfigured
                ? "Google sign-in credential presence is visible here. Client ids and secrets stay hidden."
                : "Local owner mode is intentional for this phase. Google OAuth is only required for hosted auth."
            }
            icon={<KeyRound aria-hidden="true" className="h-5 w-5" />}
            kicker="Security & Access"
            label="Authorization"
            rows={[
              ["Mode", data.auth.status],
              [
                "Auth secret",
                data.auth.authSecretConfigured ? "Configured" : "Missing",
              ],
              [
                "Google OAuth",
                data.auth.googleProviderConfigured
                  ? "Configured"
                  : "Not configured",
              ],
              ["Secret values", "Hidden"],
            ]}
            statusLabel={data.auth.badgeLabel}
            tone={data.auth.tone}
          />
        </PageGridItem>

        <PageGridItem span="third">
          <StatusCard
            detail={
              data.fintable.ready
                ? "Google Sheets access and spreadsheet configuration are present. Identifiers and secrets stay hidden."
                : "Fintable needs spreadsheet and Google access configuration."
            }
            icon={<PlugZap aria-hidden="true" className="h-5 w-5" />}
            kicker="Integrations"
            label="Fintable"
            rows={[
              [
                "Spreadsheet",
                data.fintable.hasSpreadsheet ? "Configured" : "Missing",
              ],
              [
                "Google access",
                data.fintable.hasGoogleAccess
                  ? data.fintable.accessMode
                  : "Missing",
              ],
              ["Accounts range", data.fintable.accountsRange],
              ["Transactions range", data.fintable.transactionsRange],
              ["Secret values", "Hidden"],
            ]}
            statusLabel={data.fintable.badgeLabel}
            tone={data.fintable.tone}
          />
        </PageGridItem>

        <PageGridItem span="twoThirds">
          <ImportHealthCard importHealth={data.importHealth} />
        </PageGridItem>

        <PageGridItem span="half">
          <StatusCard
            detail={
              data.calendar.hasConnection
                ? "Google Calendar read-only access metadata is present. Tokens and secret values stay hidden."
                : "Calendar sync is not connected yet. OAuth will request read-only calendar access when hosted Google sign-in is used."
            }
            icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
            kicker="Integrations"
            label="Calendar"
            rows={[
              ["Status", data.calendar.status],
              ["Account", data.calendar.accountEmail],
              ["Scope", data.calendar.scopeStatus],
              [
                "Last sync",
                data.calendar.lastSyncedAt
                  ? dateFormatter.format(data.calendar.lastSyncedAt)
                  : "Never",
              ],
              ["Secret values", data.calendar.secretValues],
            ]}
            statusLabel={data.calendar.badgeLabel}
            tone={data.calendar.tone}
          />
        </PageGridItem>

        <PageGridItem span="half">
          <AllMeCard variant="status">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
              <div>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="allme-kicker">Deployment Readiness</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                      Access boundary
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {data.authBoundary.routePolicy}
                    </p>
                  </div>
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-6 w-6 shrink-0 text-[var(--accent)]"
                  />
                </div>
                <StatusPill
                  label={data.authBoundary.statusLabel}
                  tone={data.authBoundary.tone}
                />
              </div>

              <div className="grid gap-3">
                <MetricGrid>
                  {[
                    ["Mode", data.authBoundary.modeLabel],
                    ["Enforcement", data.authBoundary.enforcementLabel],
                    ["Product routes", "App shell routes"],
                    ["Public routes", "Auth and assets"],
                  ].map(([rowLabel, value]) => (
                    <KeyValueRow
                      key={rowLabel}
                      label={rowLabel}
                      value={value}
                    />
                  ))}
                </MetricGrid>
                <div className="grid gap-3 border-t border-[var(--line)] pt-4 text-sm md:grid-cols-2">
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
              </div>
            </div>
          </AllMeCard>
        </PageGridItem>
      </PageGrid>
    </AppPageShell>
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
  icon: ReactNode;
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
  kicker,
  label,
  rows,
  statusLabel,
  tone,
}: {
  children?: ReactNode;
  detail: string;
  icon: ReactNode;
  kicker: string;
  label: string;
  rows: Array<[string, string]>;
  statusLabel: string;
  tone: StatusTone;
}) {
  return (
    <AllMeCard variant="status">
      <PageSection
        description={detail}
        eyebrow={kicker}
        icon={icon}
        title={label}
      >
        <StatusPill label={statusLabel} tone={tone} />
      </PageSection>
      <MetricGrid className="mt-4 md:grid-cols-1">
        {rows.map(([rowLabel, value]) => (
          <KeyValueRow key={rowLabel} label={rowLabel} value={value} />
        ))}
      </MetricGrid>
      {children}
    </AllMeCard>
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
    <AllMeCard variant="status">
      <div className="grid gap-5 2xl:grid-cols-[minmax(18rem,0.52fr)_minmax(0,1.48fr)] 2xl:items-start">
        <div>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="allme-kicker">Sync Health</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                Sync Health
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {latest
                  ? "Latest import-run health from AllMe's local database. Error text is hidden here to avoid exposing provider details."
                  : "No Fintable import run has been recorded for this owner yet."}
              </p>
            </div>
            <PlugZap
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-[var(--accent)]"
            />
          </div>
          <StatusPill label={statusLabel} tone={tone} />
        </div>

        <div className="grid gap-3">
          <MetricGrid>
            {[
              ["Last status", formatImportStatus(latest?.status)],
              [
                "Last finished",
                latest?.finishedAt
                  ? dateFormatter.format(latest.finishedAt)
                  : "Not finished",
              ],
              ["Rows scanned", latest ? String(latest.rowsScanned) : "--"],
              ["Rows inserted", latest ? String(latest.rowsInserted) : "--"],
              ["Rows updated", latest ? String(latest.rowsUpdated) : "--"],
              ["Rows skipped", latest ? String(latest.rowsSkipped) : "--"],
              [
                "Failure detail",
                latest?.hasErrorSummary ? "Stored, hidden" : "None",
              ],
            ].map(([rowLabel, value]) => (
              <KeyValueRow key={rowLabel} label={rowLabel} value={value} />
            ))}
          </MetricGrid>

          {importHealth && importHealth.recent.length > 1 ? (
            <div className="border-t border-[var(--line)] pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Recent runs
              </p>
              <div className="grid gap-2 md:grid-cols-3">
                {importHealth.recent.slice(0, 3).map((run) => (
                  <div
                    className="rounded-xl bg-[var(--empty)] px-3 py-2 text-sm"
                    key={run.id}
                  >
                    <p className="font-semibold">
                      {formatImportStatus(run.status)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {dateFormatter.format(run.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AllMeCard>
  );
}

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

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});
