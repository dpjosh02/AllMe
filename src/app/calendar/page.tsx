import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function CalendarPage() {
  return (
    <ComingSoonPage
      description="Calendar will sync Google Calendar into AllMe-owned tables, then power agenda, week views, and event-linked notes."
      items={[
        "Google Calendar connection",
        "Idempotent event sync",
        "Agenda and week views",
        "Event-linked notes",
      ]}
      kicker="Calendar"
      title="Schedule context."
    />
  );
}
