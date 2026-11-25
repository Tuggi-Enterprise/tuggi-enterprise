import { test, expect } from "@playwright/test";
import { descriptionAddsToName } from "../../src/lib/partner-description";

/**
 * "Sobre o lugar" on a partner's page shows what the partner wrote only when it
 * says more than the name (DS-COMPONENTE-110, a block without content does not
 * appear; #1254). The case that opened it: `@escritorio-do-chef-cabo-frio`,
 * whose description was "Escritório do Chef", a piece of its own name.
 */

const NAME = "Escritório do Chef Cabo Frio";

test.describe("DS-COMPONENTE-110: a description that only repeats the name adds nothing", () => {
  test("a piece of the name, folded, adds nothing", () => {
    expect(descriptionAddsToName("Escritório do Chef", NAME)).toBe(false);
    expect(descriptionAddsToName("escritorio do chef", NAME)).toBe(false);
    expect(descriptionAddsToName("  ESCRITÓRIO DO CHEF!  ", NAME)).toBe(false);
    expect(descriptionAddsToName("Cabo Frio.", NAME)).toBe(false);
  });

  test("the name itself, with other accents, case or punctuation, adds nothing", () => {
    expect(descriptionAddsToName("Escritorio do Chef - Cabo Frio", NAME)).toBe(false);
    expect(descriptionAddsToName("Cozi +", "Cozi +")).toBe(false);
  });

  test("an empty description, or one of punctuation only, adds nothing", () => {
    expect(descriptionAddsToName("", NAME)).toBe(false);
    expect(descriptionAddsToName(null, NAME)).toBe(false);
    expect(descriptionAddsToName(" -- !", NAME)).toBe(false);
  });

  test("a description that says more than the name is shown", () => {
    expect(descriptionAddsToName("Escritório do Chef, cozinha de autor no centro de Cabo Frio.", NAME)).toBe(true);
    expect(descriptionAddsToName("Frutos do mar", NAME)).toBe(true);
    // A word the name does not have, even a short one, is something to read.
    expect(descriptionAddsToName("Chef Ana", NAME)).toBe(true);
  });

  test("with no name, any text is shown", () => {
    expect(descriptionAddsToName("Pousada na praia", "")).toBe(true);
    expect(descriptionAddsToName("Pousada na praia", null)).toBe(true);
  });
});
