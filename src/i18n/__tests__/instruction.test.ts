import i18n from "../index";
import { doseInstruction } from "../instruction";

// The instruction is server data, not a UI string, and a medicine may carry only
// one language: anything scanned before the English half existed has Hindi
// alone, and extraction returns null for a field it could not produce.

const both = {
  instructions_hi: "रात को खाने के बाद 1 गोली लें",
  instructions_en: "1 tablet after dinner",
};

describe("choosing the language of a dose instruction", () => {
  const original = i18n.locale;

  afterEach(() => {
    i18n.locale = original;
  });

  it("shows Hindi to a Hindi reader", () => {
    i18n.locale = "hi";

    expect(doseInstruction(both)).toBe("रात को खाने के बाद 1 गोली लें");
  });

  it("shows English to an English reader", () => {
    i18n.locale = "en";

    expect(doseInstruction(both)).toBe("1 tablet after dinner");
  });

  // The reported bug: English selected, Hindi shown. After this the English is
  // shown when it exists — and when it does not, the Hindi is better than a
  // blank line.
  it("falls back to Hindi when there is no English", () => {
    i18n.locale = "en";

    expect(
      doseInstruction({ instructions_hi: "रात को 1 गोली", instructions_en: null })
    ).toBe("रात को 1 गोली");
  });

  it("falls back to English when there is no Hindi", () => {
    i18n.locale = "hi";

    expect(
      doseInstruction({ instructions_hi: null, instructions_en: "1 tablet at night" })
    ).toBe("1 tablet at night");
  });

  it("returns nothing when the medicine has neither", () => {
    i18n.locale = "en";

    expect(doseInstruction({ instructions_hi: null, instructions_en: null })).toBeNull();
    expect(doseInstruction({})).toBeNull();
  });

  it("treats whitespace as absent rather than rendering a blank line", () => {
    i18n.locale = "en";

    expect(
      doseInstruction({ instructions_hi: "रात को 1 गोली", instructions_en: "   " })
    ).toBe("रात को 1 गोली");
  });
});
