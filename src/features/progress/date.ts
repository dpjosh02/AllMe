import { getLocalDateKey, isDateKey } from "@/features/today/date";

export function resolveProgressDateKey({
  now = new Date(),
  requestedDateKey,
  timezone,
}: {
  now?: Date;
  requestedDateKey?: string | null;
  timezone: string;
}) {
  const localTodayKey = getLocalDateKey({ now, timezone });

  return {
    dateKey:
      requestedDateKey && isDateKey(requestedDateKey)
        ? requestedDateKey
        : localTodayKey,
    localTodayKey,
  };
}
