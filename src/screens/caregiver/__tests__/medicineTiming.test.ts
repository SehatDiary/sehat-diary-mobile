import {
  composeTiming,
  parseTiming,
  toggleFood,
  toggleSlot,
} from "../medicineTiming";

describe("parseTiming", () => {
  it("reads a single slot", () => {
    expect(parseTiming("night")).toEqual({ slots: ["night"], food: null });
  });

  it("reads several slots and a food relation from one string", () => {
    expect(parseTiming("morning, night, after food")).toEqual({
      slots: ["morning", "night"],
      food: "after food",
    });
  });

  it("maps extraction synonyms onto the canonical slots", () => {
    expect(parseTiming("after breakfast and at bedtime").slots).toEqual([
      "morning",
      "night",
    ]);
    expect(parseTiming("with lunch").slots).toEqual(["afternoon"]);
  });

  it("reads 'After Meal', the grid shorthand extraction writes", () => {
    expect(parseTiming("0-0-1 After Meal")).toEqual({
      slots: [],
      food: "after food",
    });
  });

  it("reads 'before food' without inventing a slot", () => {
    expect(parseTiming("before food")).toEqual({
      slots: [],
      food: "before food",
    });
  });

  it("is empty for null, undefined and unrecognised text", () => {
    expect(parseTiming(null)).toEqual({ slots: [], food: null });
    expect(parseTiming(undefined)).toEqual({ slots: [], food: null });
    expect(parseTiming("with plenty of water")).toEqual({ slots: [], food: null });
  });

  // Extraction records timing as "the Hindi as written" whenever the
  // prescription does, and the server reads both languages. Reading only
  // English left every chip dark on a Hindi timing, so the caregiver saw "not
  // set" and a tap to fill the blank replaced what the doctor wrote.
  it("reads the Hindi extraction writes", () => {
    expect(parseTiming("खाने के बाद")).toEqual({
      slots: [],
      food: "after food",
    });
    expect(parseTiming("सुबह")).toEqual({ slots: ["morning"], food: null });
    expect(parseTiming("दोपहर")).toEqual({ slots: ["afternoon"], food: null });
    expect(parseTiming("शाम")).toEqual({ slots: ["evening"], food: null });
    expect(parseTiming("सोने से पहले")).toEqual({ slots: ["night"], food: null });
  });

  it("reads a Hindi meal instruction as both the slot and the relation", () => {
    // "after the night meal" — रात names the slot, and the relation is its own
    // answer. The whole line is one string on the wire.
    expect(parseTiming("रात का खाना के बाद")).toEqual({
      slots: ["night"],
      food: "after food",
    });
  });

  it("reads नाश्ते के बाद as a morning dose", () => {
    expect(parseTiming("नाश्ते के बाद")).toEqual({
      slots: ["morning"],
      food: null,
    });
  });

  // The regression this guards: the night dose survives the caregiver adding
  // a morning one, instead of being replaced by it.
  it("keeps a Hindi night dose when a morning one is added", () => {
    expect(toggleSlot("रात का खाना के बाद", "morning")).toBe(
      "morning, night, after food"
    );
  });
});

describe("composeTiming", () => {
  it("orders slots chronologically regardless of selection order", () => {
    expect(composeTiming(["night", "morning"], null)).toBe("morning, night");
  });

  it("appends the food relation last", () => {
    expect(composeTiming(["morning"], "after food")).toBe(
      "morning, after food"
    );
  });

  it("is null — not empty string — when nothing is selected", () => {
    expect(composeTiming([], null)).toBeNull();
  });

  it("keeps a food relation with no slots", () => {
    expect(composeTiming([], "before food")).toBe("before food");
  });
});

describe("toggleSlot", () => {
  it("adds a slot to an existing selection", () => {
    expect(toggleSlot("morning", "night")).toBe("morning, night");
  });

  it("removes an already-selected slot", () => {
    expect(toggleSlot("morning, night", "morning")).toBe("night");
  });

  it("keeps the food relation across slot changes", () => {
    expect(toggleSlot("morning, after food", "night")).toBe(
      "morning, night, after food"
    );
  });

  it("starts a selection from nothing", () => {
    expect(toggleSlot(null, "evening")).toBe("evening");
  });
});

describe("toggleFood", () => {
  it("sets the food relation", () => {
    expect(toggleFood("morning", "after food")).toBe("morning, after food");
  });

  it("replaces the other relation rather than stacking both", () => {
    expect(toggleFood("morning, before food", "after food")).toBe(
      "morning, after food"
    );
  });

  it("clears the relation when the selected one is tapped again", () => {
    expect(toggleFood("morning, after food", "after food")).toBe("morning");
  });

  it("clears to null when nothing else was selected", () => {
    expect(toggleFood("after food", "after food")).toBeNull();
  });
});

describe("round trip", () => {
  it("normalises what extraction wrote into what the chips show", () => {
    // "0-0-1 After Meal" style timing plus the caregiver adding morning:
    // the composed string keeps everything the server needs.
    const afterToggle = toggleSlot("at bedtime after meal", "morning");
    expect(afterToggle).toBe("morning, night, after food");
    expect(parseTiming(afterToggle)).toEqual({
      slots: ["morning", "night"],
      food: "after food",
    });
  });
});
