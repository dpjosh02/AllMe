import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function SettingsPage() {
  return (
    <ComingSoonPage
      description="Settings will centralize owner profile, timezone, currency, integration health, and sync controls."
      items={[
        "Owner profile and preferences",
        "Timezone and preferred currency",
        "Fintable integration health",
        "Future Google Calendar connection",
      ]}
      kicker="Settings"
      title="Control panel."
    />
  );
}
