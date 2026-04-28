import { ComingSoonPage } from "@/components/layout/coming-soon-page";

export default function ProgressPage() {
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
