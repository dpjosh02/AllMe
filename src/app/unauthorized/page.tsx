import { CircleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="allme-page flex min-h-screen items-center justify-center px-5 py-8">
      <section className="allme-card w-full max-w-xl p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--empty)] text-[var(--warn)]">
            <CircleAlert aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="allme-kicker text-[var(--warn)]">Unauthorized</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
              This account cannot access AllMe.
            </h1>
          </div>
        </div>

        <p className="text-sm leading-6 text-[var(--muted)]">
          AllMe is currently locked to the configured owner account. If you
          signed in with a different Google account, sign out and use the owner
          account instead.
        </p>

        <Link
          className="allme-control mt-6 inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold"
          href={"/signin" as Route}
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
