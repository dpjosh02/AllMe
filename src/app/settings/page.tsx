import {
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  KeyRound,
  PlugZap,
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
                  ? "Google Sheets access and spreadsheet configuration are present."
                  : "Fintable needs spreadsheet and Google access configuration."
              }
              icon={<PlugZap aria-hidden="true" className="h-5 w-5" />}
              isReady={data.fintable.ready}
              label="Fintable"
              rows={[
                ["Spreadsheet", data.fintable.hasSpreadsheet ? "Configured" : "Missing"],
                ["Google access", data.fintable.hasGoogleAccess ? data.fintable.accessMode : "Missing"],
                ["Accounts range", data.fintable.accountsRange],
                ["Transactions range", data.fintable.transactionsRange],
              ]}
            />
            <StatusCard
              detail={
                data.auth.googleProviderConfigured
                  ? "Google sign-in credentials are configured."
                  : "The app is currently operating as a local owner-mode build."
              }
              icon={<KeyRound aria-hidden="true" className="h-5 w-5" />}
              isReady={data.auth.googleProviderConfigured}
              label="Identity"
              rows={[
                ["Mode", data.auth.status],
                [
                  "Auth secret",
                  data.auth.authSecretConfigured ? "Configured" : "Missing",
                ],
                [
                  "Google OAuth",
                  data.auth.googleProviderConfigured ? "Configured" : "Missing",
                ],
              ]}
            />
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
  detail,
  icon,
  isReady,
  label,
  rows,
}: {
  detail: string;
  icon: React.ReactNode;
  isReady: boolean;
  label: string;
  rows: Array<[string, string]>;
}) {
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
        {isReady ? (
          <CheckCircle2
            aria-hidden="true"
            className="h-4 w-4 text-[var(--success)]"
          />
        ) : (
          <CircleAlert
            aria-hidden="true"
            className="h-4 w-4 text-[var(--warn)]"
          />
        )}
        {isReady ? "Ready" : "Needs attention"}
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
    </article>
  );
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});
