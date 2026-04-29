import { CheckCircle2, CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type StatusTone = "attention" | "neutral" | "ready";

type AppPageShellProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: "standard" | "wide";
};

type PageHeroProps = {
  eyebrow: ReactNode;
  right?: ReactNode;
  subtitle: string;
  title: string;
};

type PageSectionProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  title?: string;
};

type PageGridProps = {
  children: ReactNode;
  className?: string;
};

type GridSpan =
  | "full"
  | "primary"
  | "support"
  | "half"
  | "third"
  | "twoThirds"
  | "five"
  | "seven";

type PageGridItemProps = {
  children: ReactNode;
  className?: string;
  span?: GridSpan;
};

type AllMeCardProps = {
  children: ReactNode;
  className?: string;
  variant?: "base" | "form" | "status" | "metrics" | "activity";
};

type StatusPillProps = {
  className?: string;
  label: string;
  tone: StatusTone;
};

type KeyValueRowProps = {
  label: string;
  value: string;
};

export function AppPageShell({
  children,
  className,
  maxWidth = "wide",
}: AppPageShellProps) {
  return (
    <main className="allme-page min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div
        className={cn(
          "flex w-full flex-col gap-5",
          maxWidth === "wide" ? "max-w-[104rem]" : "max-w-[88rem]",
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}

export function PageHero({ eyebrow, right, subtitle, title }: PageHeroProps) {
  return (
    <AllMeCard className="overflow-hidden p-5 sm:p-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
        <div>
          <div className="allme-kicker text-[var(--accent)]">{eyebrow}</div>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            {subtitle}
          </p>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
    </AllMeCard>
  );
}

export function PageGrid({ children, className }: PageGridProps) {
  return (
    <section
      className={cn("grid items-stretch gap-5 xl:grid-cols-12", className)}
    >
      {children}
    </section>
  );
}

export function PageGridItem({
  children,
  className,
  span = "full",
}: PageGridItemProps) {
  return (
    <section className={cn("h-full", getGridSpanClassName(span), className)}>
      {children}
    </section>
  );
}

export function PageSection({
  children,
  className,
  description,
  eyebrow,
  icon,
  title,
}: PageSectionProps) {
  const hasHeader = eyebrow || title || description || icon;

  return (
    <section className={cn("grid gap-4", className)}>
      {hasHeader ? (
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            {eyebrow ? <p className="allme-kicker">{eyebrow}</p> : null}
            {title ? (
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {icon ? (
            <div className="shrink-0 text-[var(--accent)]">{icon}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AllMeCard({
  children,
  className,
  variant = "base",
}: AllMeCardProps) {
  return (
    <article
      className={cn(
        "allme-card h-full",
        getCardVariantClassName(variant),
        className,
      )}
    >
      {children}
    </article>
  );
}

export function StatusPill({ className, label, tone }: StatusPillProps) {
  const statusStyle = getStatusStyle(tone);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--empty)] px-3 py-1 text-xs font-semibold",
        className,
      )}
    >
      {tone === "attention" ? (
        <CircleAlert
          aria-hidden="true"
          className={cn("h-4 w-4", statusStyle.iconClassName)}
        />
      ) : (
        <CheckCircle2
          aria-hidden="true"
          className={cn("h-4 w-4", statusStyle.iconClassName)}
        />
      )}
      {label}
    </div>
  );
}

export function KeyValueRow({ label, value }: KeyValueRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl bg-[var(--empty)] px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="truncate text-right text-sm font-semibold">{value}</dd>
    </div>
  );
}

export function MetricGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn("grid gap-2 md:grid-cols-2", className)}>{children}</dl>;
}

function getGridSpanClassName(span: GridSpan) {
  const spanClassNames: Record<GridSpan, string> = {
    full: "xl:col-span-12",
    primary: "xl:col-span-7",
    support: "xl:col-span-5",
    half: "xl:col-span-6",
    third: "xl:col-span-4",
    twoThirds: "xl:col-span-8",
    five: "xl:col-span-5",
    seven: "xl:col-span-7",
  };

  return spanClassNames[span];
}

function getCardVariantClassName(variant: AllMeCardProps["variant"]) {
  const variantClassNames: Record<NonNullable<AllMeCardProps["variant"]>, string> = {
    activity: "p-5",
    base: "",
    form: "p-5",
    metrics: "p-5",
    status: "p-5",
  };

  return variantClassNames[variant ?? "base"];
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
