import { ComingSoonPage } from "@/components/layout/coming-soon-page";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  await requirePageUser("/notes");

  return (
    <ComingSoonPage
      description="The notes area will own daily notes, quick capture, lightweight pages, and weekly/monthly review references."
      items={[
        "Daily notes archive",
        "Quick capture inbox",
        "Weekly and monthly reviews",
        "Lightweight note links and tags",
      ]}
      kicker="Notes"
      title="Capture and review."
    />
  );
}
