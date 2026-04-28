import { ComingSoonPage } from "@/components/layout/coming-soon-page";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  await requirePageUser("/today");

  return (
    <ComingSoonPage
      description="The future daily command view: note capture, agenda, tasks, finance snapshot, and progress check-in in one place."
      items={[
        "Daily note auto-created by date",
        "Quick capture inbox",
        "Agenda pulled from synced calendar events",
        "Small finance and progress modules",
      ]}
      kicker="Today"
      title="Daily operating view."
    />
  );
}
