import Link from "next/link";

type ComingSoonPageProps = {
  description: string;
  items: string[];
  kicker: string;
  title: string;
};

export function ComingSoonPage({
  description,
  items,
  kicker,
  title,
}: ComingSoonPageProps) {
  return (
    <main className="allme-page min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="allme-card overflow-hidden p-5 sm:p-6">
          <p className="allme-kicker text-[var(--accent)]">{kicker}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            {description}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
          <div className="allme-card p-5">
            <p className="allme-kicker">Planned Scope</p>
            <div className="mt-4 grid gap-3">
              {items.map((item) => (
                <div
                  className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3 text-sm font-semibold"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="allme-card p-5">
            <p className="allme-kicker">Current Rule</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              This route is intentionally present before the feature is built so
              the product shell stays coherent while we add vertical slices.
            </p>
            <Link
              className="allme-control mt-5 inline-flex min-h-10 items-center justify-center px-4 text-sm font-semibold"
              href="/finance"
            >
              Return to Finance
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
