import {
  dayTone,
  isToday,
  outstanding,
  sortedDoses,
  weekTotals,
} from "../adherenceWeek";
import { HistoryDay, HistoryDose } from "../../../types";

const dose = (
  status: HistoryDose["status"],
  scheduled_at = "2026-08-18T08:00:00+05:30"
): HistoryDose => ({
  id: Math.floor(Math.random() * 100000),
  prescribed_medicine_id: 12,
  medicine_name: "Amlodipine",
  dosage: "5mg",
  instructions_hi: null,
  instructions_en: null,
  scheduled_at,
  status,
  recorded_status: status,
  marked_late: false,
  acknowledged_at: null,
  reminder_count: 0,
  notes: null,
  correctable: status !== "taken",
});

const day = (overrides: Partial<HistoryDay> = {}): HistoryDay => ({
  date: "2026-08-18",
  scheduled: 0,
  taken: 0,
  missed: 0,
  doses: [],
  ...overrides,
});

describe("how a day reads at a glance", () => {
  it("shows a day with nothing missed as good", () => {
    expect(dayTone(day({ scheduled: 3, taken: 3 }))).toBe("good");
  });

  it("separates a partly missed day from a wholly missed one", () => {
    expect(dayTone(day({ scheduled: 3, taken: 2, missed: 1 }))).toBe("partial");
    expect(dayTone(day({ scheduled: 2, taken: 0, missed: 2 }))).toBe("bad");
  });

  it("never colours a day with no doses as a problem", () => {
    // Before a course starts, every day is empty. A week of red for that would
    // be alarming and wrong.
    expect(dayTone(day())).toBe("empty");
  });

  it("does not count a dose still due as missed", () => {
    // Checking at breakfast must not report the evening dose as a failure.
    expect(dayTone(day({ scheduled: 2, taken: 1 }))).toBe("good");
  });
});

describe("ordering doses for a caregiver", () => {
  it("puts what went wrong first", () => {
    const doses = [
      dose("taken", "2026-08-18T08:00:00+05:30"),
      dose("missed", "2026-08-18T21:00:00+05:30"),
      dose("pending", "2026-08-18T13:00:00+05:30"),
    ];

    expect(sortedDoses(doses).map((d) => d.status)).toEqual([
      "missed",
      "pending",
      "taken",
    ]);
  });

  it("keeps time order within the same status", () => {
    const doses = [
      dose("taken", "2026-08-18T21:00:00+05:30"),
      dose("taken", "2026-08-18T08:00:00+05:30"),
    ];

    expect(sortedDoses(doses).map((d) => d.scheduled_at)).toEqual([
      "2026-08-18T08:00:00+05:30",
      "2026-08-18T21:00:00+05:30",
    ]);
  });

  it("does not mutate what it is given", () => {
    const doses = [dose("taken"), dose("missed")];
    sortedDoses(doses);

    expect(doses.map((d) => d.status)).toEqual(["taken", "missed"]);
  });
});

describe("summarising the week", () => {
  it("adds up the days", () => {
    const totals = weekTotals([
      day({ scheduled: 3, taken: 3 }),
      day({ scheduled: 3, taken: 2, missed: 1 }),
    ]);

    expect(totals).toEqual({
      scheduled: 6,
      taken: 5,
      missed: 1,
      percentTaken: 83,
    });
  });

  it("reports no percentage when nothing was scheduled", () => {
    // 0% would read as total failure for a member with no medicines at all.
    expect(weekTotals([day(), day()]).percentTaken).toBeNull();
  });

  it("survives an empty week", () => {
    expect(weekTotals([]).percentTaken).toBeNull();
  });
});

describe("doses still outstanding", () => {
  it("counts pending and snoozed, not missed or taken", () => {
    const d = day({
      scheduled: 4,
      doses: [dose("pending"), dose("snoozed"), dose("missed"), dose("taken")],
    });

    expect(outstanding(d)).toBe(2);
  });
});

describe("identifying today", () => {
  it("matches on the calendar date, not a timestamp", () => {
    // The API sends a plain date; comparing it against a parsed Date would
    // reintroduce the timezone bug this app has already been bitten by.
    expect(isToday(day({ date: "2026-08-18" }), new Date(2026, 7, 18, 23, 59))).toBe(true);
    expect(isToday(day({ date: "2026-08-18" }), new Date(2026, 7, 19, 0, 1))).toBe(false);
  });
});
