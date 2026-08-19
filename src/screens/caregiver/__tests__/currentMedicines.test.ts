import { groupBySlot, slotForHour, unscheduled } from "../currentMedicines";
import { MedicineDetail } from "../../../types";

const medicine = (
  id: number,
  name: string,
  reminder_times: string[]
): MedicineDetail =>
  ({
    id,
    name,
    reminder_times,
    dosage: null,
    quantity_remaining: null,
    instructions_hi: null,
    instructions_en: null,
  }) as unknown as MedicineDetail;

describe("which part of the day a reminder falls in", () => {
  it("matches the server's standard slots", () => {
    expect(slotForHour(8)).toBe("morning");
    expect(slotForHour(13)).toBe("afternoon");
    expect(slotForHour(17)).toBe("evening");
    expect(slotForHour(21)).toBe("night");
  });

  it("puts the small hours at night rather than in the morning" , () => {
    expect(slotForHour(2)).toBe("night");
    expect(slotForHour(23)).toBe("night");
  });
});

describe("grouping what a member takes by time of day", () => {
  it("places each medicine under the slot it reminds at", () => {
    const groups = groupBySlot([
      medicine(1, "SARTEL H 40", [ "08:00" ]),
      medicine(2, "ROSUVAS CV 10", [ "21:00" ]),
    ]);

    expect(groups.map((g) => g.slot)).toEqual([ "morning", "night" ]);
    expect(groups[0].medicines[0].name).toBe("SARTEL H 40");
  });

  // Deliberate: it tells the caregiver when to give it, rather than making them
  // read a frequency string.
  it("lists a twice-daily medicine under both of its slots", () => {
    const groups = groupBySlot([ medicine(1, "Metformin", [ "08:00", "21:00" ]) ]);

    expect(groups.map((g) => g.slot)).toEqual([ "morning", "night" ]);
    expect(groups[0].medicines[0].id).toBe(1);
    expect(groups[1].medicines[0].id).toBe(1);
  });

  it("drops a slot nothing is taken in, rather than showing an empty heading", () => {
    const groups = groupBySlot([ medicine(1, "SARTEL H 40", [ "08:00" ]) ]);

    expect(groups).toHaveLength(1);
  });

  it("does not repeat a medicine that reminds twice in the same slot", () => {
    const groups = groupBySlot([ medicine(1, "Drops", [ "08:00", "09:00" ]) ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].medicines).toHaveLength(1);
  });

  it("keeps the day in order", () => {
    const groups = groupBySlot([
      medicine(1, "Night", [ "21:00" ]),
      medicine(2, "Morning", [ "08:00" ]),
      medicine(3, "Noon", [ "13:00" ]),
    ]);

    expect(groups.map((g) => g.slot)).toEqual([ "morning", "afternoon", "night" ]);
  });
});

// A medicine nobody is reminded about is exactly the one worth surfacing:
// either as-needed, or waiting on a frequency the app could not read.
describe("medicines with no reminder at all", () => {
  it("collects them separately rather than dropping them", () => {
    const sos = medicine(9, "Pain relief", []);

    expect(groupBySlot([ sos ])).toEqual([]);
    expect(unscheduled([ sos ]).map((m) => m.id)).toEqual([ 9 ]);
  });

  it("leaves scheduled medicines out of that list", () => {
    expect(unscheduled([ medicine(1, "SARTEL H 40", [ "08:00" ]) ])).toEqual([]);
  });

  it("ignores a time it cannot read", () => {
    const broken = medicine(3, "Odd", [ "not-a-time" ]);

    expect(groupBySlot([ broken ])).toEqual([]);
    expect(unscheduled([ broken ])).toHaveLength(1);
  });
});
