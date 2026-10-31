/**
 * The founding offer, as visitors can read it, in every file that carries visitor copy.
 *
 * The offer changed on 26 Oct (fifty places; Pro free for a whole querying campaign; Smart Import;
 * a direct line to the founder; an Early Bird discount for the writers you invite). By 31 Oct the
 * old one ("a hundred places", "six months free", "half price", "for life") was still in the
 * confirmation email, the /welcome page and the pricing tier, because each file was edited on its
 * own. This sweep reads them together, with comments stripped (the files explain the change in
 * prose that quotes the old wording).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const COPY_FILES = [
  "src/marketing/landingCopy.ts",
  "src/marketing/foundersCopy.ts",
  "src/marketing/welcomeCopy.ts",
  "src/marketing/pricingCopy.ts",
  "src/marketing/aboutCopy.ts",
  "functions/src/emailCopy.ts",
  "index.html",
];

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

const RETIRED = [
  /\bhundred\b/i,
  /\b100 (places|writers|founding)/i,
  /six months'? (of pro|free|pro)/i,
  /half price/i,
  /for life\b/i,
];

describe("the founding offer reads the same everywhere a visitor can see it", () => {
  for (const file of COPY_FILES) {
    it(`${file} carries none of the retired offer`, () => {
      const code = stripComments(readFileSync(resolve(process.cwd(), file), "utf8"));
      expect(code.length, `${file} read as empty`).toBeGreaterThan(200);
      for (const re of RETIRED) {
        expect(code, `${file} still says ${re}`).not.toMatch(re);
      }
    });
  }
});
