import { HistoryDay, HistoryDose } from "../../types";

// Display logic for the 7-day strip, kept out of the component so it can be
// tested. The repo has no component-rendering library, so anything left inside
// JSX is untested by construction.

export type DayTone = "good" | "partial" | "bad" | "empty";

/**
 * How a day should read at a glance. A good week has to look calm, so a day
 * with nothing missed is never coloured as a problem — including a day with no
 * doses at all, which is normal for a course that had not started yet.
 */
export function dayTone(day: HistoryDay): DayTone {
  if (day.scheduled === 0) return "empty";
  if (day.missed === 0) return "good";

  return day.taken === 0 ? "bad" : "partial";
}

/**
 * Doses in the order a caregiver reads them: what went wrong first, then the
 * rest of the day in time order. Scanning a list for the one red row is the
 * work this screen exists to save.
 */
export function sortedDoses(doses: HistoryDose[]): HistoryDose[] {
  const rank: Record<HistoryDose["status"], number> = {
    missed: 0,
    snoozed: 1,
    pending: 2,
    taken: 3,
  };

  return [...doses].sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      a.scheduled_at.localeCompare(b.scheduled_at)
  );
}

export interface WeekTotals {
  scheduled: number;
  taken: number;
  missed: number;
  /** null when nothing was scheduled all week — 0% would imply failure. */
  percentTaken: number | null;
}

export function weekTotals(days: HistoryDay[]): WeekTotals {
  const scheduled = days.reduce((sum, day) => sum + day.scheduled, 0);
  const taken = days.reduce((sum, day) => sum + day.taken, 0);
  const missed = days.reduce((sum, day) => sum + day.missed, 0);

  return {
    scheduled,
    taken,
    missed,
    percentTaken: scheduled === 0 ? null : Math.round((taken / scheduled) * 100),
  };
}

/**
 * Doses still due later today are not yet a success or a failure, and counting
 * them against the day would show a caregiver checking at breakfast a week that
 * looks half missed.
 */
export function outstanding(day: HistoryDay): number {
  return day.doses.filter(
    (dose) => dose.status === "pending" || dose.status === "snoozed"
  ).length;
}

export function isToday(day: HistoryDay, today: Date): boolean {
  const [year, month, date] = day.date.split("-").map(Number);

  return (
    today.getFullYear() === year &&
    today.getMonth() + 1 === month &&
    today.getDate() === date
  );
}
