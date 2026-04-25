import {
  Activity,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  NotebookPen,
  RefreshCcw,
} from "lucide-react";

const agenda = [
  { time: "8:30 AM", title: "Review today", tone: "Focus" },
  { time: "12:00 PM", title: "Finance import check", tone: "Admin" },
  { time: "5:30 PM", title: "Workout", tone: "Health" },
];

const financeMetrics = [
  { label: "Net worth", value: "$--", detail: "Waiting for first import" },
  { label: "Monthly spend", value: "$--", detail: "No transactions yet" },
  { label: "Investments", value: "$--", detail: "Holdings snapshot pending" },
];

const progressItems = [
  { label: "Daily note", done: true },
  { label: "Calendar review", done: false },
  { label: "Movement", done: false },
  { label: "Finance sync", done: false },
];

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-5 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              AllMe
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Today, money, notes, and progress in one operating view.
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--muted)]">
            <RefreshCcw aria-hidden="true" className="h-4 w-4" />
            <span>Finance import not configured</span>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Today</h2>
                <p className="text-sm text-[var(--muted)]">
                  A compact command surface for daily review.
                </p>
              </div>
              <NotebookPen aria-hidden="true" className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <textarea
              aria-label="Daily note"
              className="min-h-48 w-full resize-y rounded-md border border-[var(--line)] bg-white/70 p-4 text-base leading-7 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgb(15_118_110_/_18%)]"
              placeholder="Start the daily note..."
            />
          </div>

          <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Agenda</h2>
              <CalendarDays aria-hidden="true" className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div className="space-y-3">
              {agenda.map((item) => (
                <div
                  className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0"
                  key={`${item.time}-${item.title}`}
                >
                  <span className="text-sm font-semibold text-[var(--accent-strong)]">
                    {item.time}
                  </span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-[var(--muted)]">{item.tone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {financeMetrics.map((metric) => (
            <article
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm"
              key={metric.label}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {metric.label}
                </h2>
                <CircleDollarSign aria-hidden="true" className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <p className="text-3xl font-semibold">{metric.value}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Progress</h2>
              <Activity aria-hidden="true" className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {progressItems.map((item) => (
                <div
                  className="flex min-h-14 items-center justify-between rounded-md border border-[var(--line)] bg-white/62 px-4"
                  key={item.label}
                >
                  <span className="font-medium">{item.label}</span>
                  <CheckCircle2
                    aria-hidden="true"
                    className={
                      item.done
                        ? "h-5 w-5 text-[var(--success)]"
                        : "h-5 w-5 text-[var(--line)]"
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)] p-5">
            <h2 className="text-xl font-semibold">Milestone 0</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              The current build is the project foundation: app shell, quality tooling,
              database schema, and integration boundaries before production features.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
