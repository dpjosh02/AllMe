import { ComingSoonPage } from "@/components/layout/coming-soon-page";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  await requirePageUser("/progress");

  return (
    <ComingSoonPage
      description="Progress will track habits, workouts, tasks, custom metrics, and reviewable trends without turning the app into a game."
      items={[
        "Habit and task logging",
        "Workout/activity records",
        "Daily scorecard",
        "Weekly review summary",
      ]}
      kicker="Progress"
      title="Habits and activity."
    />
  );
}
