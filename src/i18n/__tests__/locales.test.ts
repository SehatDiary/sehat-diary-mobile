import en from "../en";
import hi from "../hi";

// This is a Hindi-first app, and i18n is configured with enableFallback, so a
// string that exists only in English does not error — it renders in English on
// the screen of the one person least able to read it, and nothing reports it.
// Parity is cheap to assert and impossible to notice by hand across ~350 keys.

type Tree = { [key: string]: string | Tree };

const keyPaths = (tree: Tree, prefix = ""): string[] =>
  Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return typeof value === "object" && value !== null
      ? keyPaths(value, path)
      : [path];
  });

const enKeys = keyPaths(en as Tree);
const hiKeys = keyPaths(hi as Tree);

describe("locale parity", () => {
  it("translates every English string into Hindi", () => {
    expect(hiKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
    expect(enKeys.filter((k) => !hiKeys.includes(k))).toEqual([]);
  });

  it("leaves no translation blank", () => {
    const blank = keyPaths(hi as Tree).filter((path) => {
      const value = path
        .split(".")
        .reduce<unknown>((node, key) => (node as Tree)?.[key], hi);

      return typeof value === "string" && value.trim() === "";
    });

    expect(blank).toEqual([]);
  });

  it("carries the prescription upload label in both languages", () => {
    // The button this guards was previously an unlabelled icon, which is how
    // it came to be reported as missing.
    expect(en.session.addPrescription).toBe("Add Prescription");
    expect(hi.session.addPrescription).toBe("प्रिस्क्रिप्शन जोड़ें");
  });
});
