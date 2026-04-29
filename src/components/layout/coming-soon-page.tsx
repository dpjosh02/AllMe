import Link from "next/link";

import {
  AllMeCard,
  AppPageShell,
  PageGrid,
  PageGridItem,
  PageHero,
  PageSection,
} from "@/components/layout/page-scaffold";

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
    <AppPageShell>
      <PageHero eyebrow={kicker} subtitle={description} title={title} />

      <PageGrid>
        <PageGridItem span="primary">
          <AllMeCard variant="status">
            <PageSection eyebrow="Planned Scope" title="Build path">
              <div className="grid gap-3">
                {items.map((item) => (
                  <div
                    className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3 text-sm font-semibold"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="support">
          <AllMeCard variant="status">
            <PageSection
              description="This route is intentionally present before the feature is built so the product shell stays coherent while we add vertical slices."
              eyebrow="Current Rule"
              title="Placeholder route"
            >
              <Link
                className="allme-control inline-flex min-h-10 items-center justify-center px-4 text-sm font-semibold"
                href="/finance"
              >
                Return to Finance
              </Link>
            </PageSection>
          </AllMeCard>
        </PageGridItem>
      </PageGrid>
    </AppPageShell>
  );
}
