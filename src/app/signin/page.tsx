import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { serverEnv } from "@/lib/env";
import { signIn } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = normalizeCallbackUrl(callbackUrl);
  const googleReady = Boolean(
    serverEnv.AUTH_GOOGLE_ID && serverEnv.AUTH_GOOGLE_SECRET,
  );

  return (
    <main className="allme-page flex min-h-screen items-center justify-center px-5 py-8">
      <section className="allme-card w-full max-w-xl p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--empty)] text-[var(--accent)]">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="allme-kicker text-[var(--accent)]">AllMe Access</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
              Sign in to continue.
            </h1>
          </div>
        </div>

        <p className="text-sm leading-6 text-[var(--muted)]">
          This dashboard contains private finance, notes, calendar, and progress
          data. Hosted mode only allows the configured owner Google account to
          access product routes.
        </p>

        {googleReady ? (
          <form action={signInWithGoogle} className="mt-6">
            <input name="callbackUrl" type="hidden" value={safeCallbackUrl} />
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent-strong)]"
              type="submit"
            >
              Continue with Google
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl border border-[var(--warn)] bg-[var(--empty)] p-4 text-sm leading-6 text-[var(--muted)]">
            Google OAuth is not configured yet. Use local-owner mode during
            development, or configure Google OAuth before using hosted mode.
          </div>
        )}

        <Link
          className="mt-5 inline-flex text-sm font-semibold text-[var(--accent)]"
          href="/settings"
        >
          View auth status
        </Link>
      </section>
    </main>
  );
}

async function signInWithGoogle(formData: FormData) {
  "use server";

  const callbackUrl = normalizeCallbackUrl(
    String(formData.get("callbackUrl") ?? "/"),
  );

  await signIn("google", { redirectTo: callbackUrl });
}

function normalizeCallbackUrl(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
