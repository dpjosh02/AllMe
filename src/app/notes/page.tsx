import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function NotesPage() {
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
