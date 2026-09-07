/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE CONTRACT IS RENDERED, NOT READ.
 *
 * Every previous assertion about this drawer asked whether something rendered, and something
 * always did. The audit's own phrasing gives the fault away: Phase 5 "took the contract's mechanism
 * and not its anatomy" — the drawer slid, over a scrim, without reflowing the page, and every one
 * of those claims was true about a drawer that looked nothing like the design.
 *
 * So this opens `design-refs/todo-qc-style.html` in a real browser beside the deployed page and
 * compares COMPUTED values, element by element, property by property. Nothing in this file states
 * what a value should be: the property NAMES come from the contract's own declarations, and the
 * VALUES come from the contract's own render. A number typed here would be a third copy of the
 * design, free to drift from both.
 *
 * ⚠️ AND IT IS THE ONLY INSTRUMENT THAT CAN SEE A MISSING ELEMENT AS A FAULT. An app-side selector
 * that matches nothing reports `MISSING`, which is a row in the table and a red in the lock — not
 * an empty result quietly folded into a pass.
 */
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

/** the contract, addressed as a file URL so no server is involved */
export const CONTRACT_PATH = "design-refs/todo-qc-style.html";
export const CONTRACT_URL = `file://${process.cwd()}/${CONTRACT_PATH}`;

/**
 * One element of the drawer or the index card: what the contract calls it, what the app calls it
 * today, and any extra contract selectors whose declarations belong to the same element (a state
 * class such as `.dhero.now`, or a variant rule).
 *
 * `app: null` means the app has no such element — which the recon reports and Phase 3 fails on.
 */
export interface Part {
  /** the contract's selector, exactly as the stylesheet writes it */
  c: string;
  /**
   * ⚠️ WHERE TO FIND IT ON THE CONTRACT'S PAGE, when the bare selector is not unique.
   * `.facts`, `.fact`, `.who`, `.tl` and `.qbtn` all appear on the ref's task CARDS as well as
   * inside the index card, and `read` takes the first VISIBLE match — which was a card's, 332px
   * wide, inside a 292px card. A true reading of the wrong element, which is the failure shape
   * this whole file exists to refuse.
   */
  cq?: string;
  /** the app's selector for the same element, or null where the app has no equivalent */
  app: string | null;
  /** further contract selectors whose declarations describe this element in the state we measure */
  also?: string[];
  /** properties to skip in the strict diff, each with the reason it may legitimately differ */
  waive?: Record<string, string>;
  /** a note carried into the table */
  note?: string;
  /**
   * ⚠️ DELIBERATELY NOT BUILT, and the reason. The lock then asserts the element is ABSENT rather
   * than skipping it — so building it later goes RED and the decision has to be made again rather
   * than drifting in. A waiver excuses a difference; this one STATES it.
   */
  absent?: string;
}

/**
 * ⚠️ THE APP SELECTORS ARE SPLICED FROM THE SOURCE, NEVER RETYPED. Writing a census by hand
 * produced two wrong classes out of three in one sitting on this very page. Each of these was
 * grepped out of `TaskPane.tsx` / `taskPane.css` / `slideOver.css`.
 */
export const PARTS: Part[] = [
  { c: ".drawer", app: ".slo", also: [".drawer.on"],
    waive: { boxShadow: "the app's drawer is a shared primitive with its own lift; the contract draws a single-use panel" } },
  { c: ".dtop", app: ".tpn .dhead" },
  { c: ".dhero", app: ".tpn .dhero", also: [".dhero.now"],
    waive: { backgroundImage: "the family gradient is the APP's own `--u-now-*` pair, not the ref's `--now1/2` — those tokens have never existed here and copying them would have dropped the declaration entirely" } },
  { c: ".dhero .title", app: ".tpn .dhero .title" },
  { c: ".dhero .line", app: ".tpn .dhero .line" },
  { c: ".dhero .chips", app: ".tpn .dhero .chips" },
  { c: ".chip", cq: ".dhero .chip", app: ".tpn .dhero .chip" },
  { c: ".dbody", app: ".tpn .workscroll" },
  { c: ".ql", app: ".tpn .forklbl",
    note: "NAME COLLISION: the app's `.ql` is the question LABEL (the contract's `.q .lb`); the contract's `.ql` is the fork's lead line, which the app calls `.forklbl`" },
  { c: ".fk", app: ".tpn .fk",
    waive: {
      marginBottom: "the app spaces the options with `.fork { gap: 9px }` — the contract's own figure, as a gap rather than a margin, which cannot leave a trailing margin under the last option",
      gridTemplateColumns: "the third track is the contract's keycap; see `.fk kbd` below, which this app deliberately does not draw",
    } },
  { c: ".fk .g", app: ".tpn .fk .g",
    waive: { backgroundColor: "`var(--paper)` is the app's own paper — #faf6f0 against the ref's #fdfaf5, four points apart. The INTENT is the same (the well is one step back from the white option) and the token is the one the rest of this pane reads; a literal here would be a second paper three inches from the first" } },
  { c: ".fk .t", app: ".tpn .fk .t" },
  { c: ".fk .s", app: ".tpn .fk .s" },
  { c: ".fk kbd", app: null,
    absent: "the contract prints a keycap 1/2/3 on each fork option. This app has NO SHORTCUT REGISTRY, so those keys do nothing — and the standing rule here is that a hint advertising a key that does nothing is worse than no hint (the same call that kept the panel foot's ⌘L/⌘N unrendered). It ships when the keys do." },
  { c: ".ledger", app: ".tpn .ledger" },
  { c: ".q .head", app: ".tpn .q .head" },
  { c: ".dfoot", app: ".tpn .foot" },
  { c: ".pop", app: ".slo .rail", also: [".pop.on"],
    note: "the app merges `.pop` and `.pc` into one element — the card IS the reference column" },
  { c: ".pc", app: ".slo .rail" },
  { c: ".qhead", cq: ".pc .qhead", app: ".tpn .qhead",
    waive: { backgroundColor: "the tint is DERIVED from the Query Centre's stage ladder rather than the ref's private TINT table, so the two palettes are deliberately different values for the same idea" } },
  { c: ".qhead .lbl", cq: ".pc .qhead .lbl", app: ".tpn .qhead .lbl" },
  { c: ".qhead .st", cq: ".pc .qhead .st", app: ".tpn .qhead .st" },
  { c: ".qhead .since", cq: ".pc .qhead .since", app: ".tpn .qhead .since" },
  { c: ".who", cq: ".pc .who", app: ".tpn .who" },
  { c: ".facts", cq: ".pc .facts", app: ".tpn .rail .facts" },
  { c: ".fact", cq: ".pc .fact", app: ".tpn .rail .fact" },
  { c: ".subh", cq: ".pc .subh", app: ".tpn .rail .sub" },
  { c: ".tl", cq: ".pc .tl", app: ".tpn .rail .tl" },
  { c: ".te", cq: ".pc .te", app: ".tpn .rail .tl-e",
    note: "the app calls a rung `.tl-e` — `taskPane.css` records the rename deliberately, so this is a name difference and not a missing element" },
  { c: ".gapl", cq: ".pc .gapl", app: null,
    absent: "the contract prints a silence label BETWEEN rungs (\"7 weeks of nothing\"). This app's story column has no silence line at all — its nearest neighbour is the lesser rung `.tl-e.minor`, which is a different claim and must not be equated with it. Unbuilt, and named so that building it is a decision." },
  { c: ".qbtn", cq: ".pc .qbtn", app: ".tpn .qbtn",
    waive: { display: "a FLEX ITEM's display is blockified, and the app's `.rail` is a flex column because its body has to scroll. `align-self: flex-start` gives the identical shrink-to-fit box, so the dotted underline spans the text and nothing else — the same ink from a different mechanism" } },
];

/**
 * The property names the contract DECLARES for a selector, joined across every base rule that
 * names it.
 *
 * ⚠️ ANCHORED, AND EVERY RULE JOINED. A bare `indexOf('.chip {')` also matches the tail of
 * `.qhead .chip {`, and where a selector is declared twice the cascade takes the LAST while a
 * reader takes the FIRST. Both faults are already recorded in this repo; this splits the selector
 * list on commas and compares whole strings.
 */
export function declaredProps(css: string, selector: string): string[] {
  const props: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const sels = m[1].split(",").map((s) => s.replace(/\s+/g, " ").trim());
    if (!sels.includes(selector)) continue;
    for (const decl of m[2].split(";")) {
      const p = decl.split(":")[0]?.trim();
      if (p) props.push(p);
    }
  }
  return props;
}

/** the contract's stylesheet text, comments stripped (a prose mention is not a declaration) */
export function contractCss(): string {
  const html = readFileSync(CONTRACT_PATH, "utf8");
  const style = html.slice(html.indexOf("<style>") + 7, html.indexOf("</style>"));
  return style.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Properties that cannot be compared across two different pages, and why. These are excluded
 * everywhere — not waived per part, because the reason is structural rather than a decision
 * anyone made about this design.
 */
const UNCOMPARABLE = new Set([
  /* the app's own motion law owns these; the contract draws one page's timings */
  "transition", "animation", "animation-name",
  /* set per instance, not by the design */
  "content", "cursor", "text-align",
  /* vendor prefixes and resets that say nothing about anatomy */
  "-webkit-appearance", "-moz-appearance", "box-sizing", "outline",
]);

/** longhands to read for a declared shorthand, so a computed value is never "" */
const EXPAND: Record<string, string[]> = {
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  border: ["border-top-width", "border-top-style", "border-top-color"],
  "border-bottom": ["border-bottom-width", "border-bottom-style", "border-bottom-color"],
  "border-top": ["border-top-width", "border-top-style", "border-top-color"],
  "border-left": ["border-left-width", "border-left-style", "border-left-color"],
  background: ["background-color", "background-image"],
  font: ["font-family", "font-size", "font-weight"],
  flex: ["flex-grow", "flex-shrink", "flex-basis"],
  inset: ["top", "right", "bottom", "left"],
  overflow: ["overflow-x", "overflow-y"],
  "grid-row": ["grid-row-start", "grid-row-end"],
};

/** the comparable, resolvable property list for one part */
export function propsFor(css: string, part: Part): string[] {
  const raw = [part.c, ...(part.also ?? [])].flatMap((s) => declaredProps(css, s));
  const out: string[] = [];
  for (const p of raw) {
    if (UNCOMPARABLE.has(p)) continue;
    for (const q of EXPAND[p] ?? [p]) if (!out.includes(q)) out.push(q);
  }
  return out;
}

/** camelCase for the waive keys, which read better as JS property names */
export const camel = (p: string): string => p.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

export interface Reading { found: boolean; count: number; values: Record<string, string>; rect?: { x: number; y: number; w: number; h: number } }

/**
 * Computed values for the FIRST VISIBLE match of `sel`, plus how many matched at all.
 *
 * ⚠️ VISIBLE, because the workspace keeps every page mounted and `.first()` routinely resolves to
 * a hidden page's zero-sized copy. And the count is returned rather than swallowed: "0 matched"
 * and "3 matched and I took the wrong one" are different faults with different fixes.
 */
export async function read(page: Page, sel: string, props: string[]): Promise<Reading> {
  return page.evaluate(
    ([s, ps]: [string, string[]]) => {
      const all = [...document.querySelectorAll(s)];
      const el = all.find((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
      });
      if (!el) return { found: false, count: all.length, values: {} };
      const cs = getComputedStyle(el);
      const values: Record<string, string> = {};
      for (const p of ps) values[p] = cs.getPropertyValue(p).trim();
      const b = el.getBoundingClientRect();
      return {
        found: true, count: all.length, values,
        rect: { x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 },
      };
    },
    [sel, props] as [string, string[]],
  );
}

/**
 * Open the contract's drawer on a task of the given family, and return the family the hero
 * actually took.
 *
 * ⚠️ IT CLICKS A CARD RATHER THAN CALLING THE REF'S OWN DATA. `const T = [...]` at the top level of
 * a classic script is block-scoped to the script: it never becomes a property of `window`, so
 * `window.T` is `undefined` and a probe reaching for it dies with "cannot read findIndex" — which
 * reads like the fixture is missing rather than like the binding is unreachable. The cards are on
 * the page and carry the click; the family is READ BACK off the hero, so a mis-click is a thrown
 * error rather than a silent comparison against the wrong task.
 */
export async function openContract(page: Page, fam: "now" | "house" | "yours", label?: string): Promise<number> {
  await page.goto(CONTRACT_URL);
  await page.waitForTimeout(400);
  const i = await page.evaluate(
    ([f, l]: [string, string | undefined]) => {
      const cards = [...document.querySelectorAll(".card")] as HTMLElement[];
      const idx = cards.findIndex((c) => {
        const tag = c.querySelector(".tag");
        if (!tag || !tag.classList.contains(f)) return false;
        return !l || (tag.textContent || "").trim() === l;
      });
      if (idx < 0) throw new Error(`the contract draws no ${f} card` + (l ? ` labelled ${l}` : ""));
      cards[idx].click();
      return idx;
    },
    [fam, label] as [string, string | undefined],
  );
  await page.waitForTimeout(500);
  const got = await page.evaluate(() => document.getElementById("dhero")?.className ?? "");
  if (!got.includes(fam)) throw new Error(`opened the contract's drawer and its hero is "${got}", not ${fam}`);
  return i;
}

/**
 * A value comparison that tolerates sub-pixel resolution and two spellings of "no transform" —
 * and nothing else.
 *
 * ⚠️ `none` AND THE IDENTITY MATRIX ARE THE SAME TRANSFORM. The contract's open drawer says
 * `transform: none`; this app's says `translateX(0)`, which computes to `matrix(1, 0, 0, 1, 0, 0)`.
 * They paint identically, and treating them as a difference would have made the first property in
 * the table a permanent red that trains the next reader to skim past it — which is how a real
 * difference eventually walks through. It is a NORMALISATION, not a waiver: nothing is being
 * excused, the two strings denote one value.
 */
const IDENTITY = /^(none|matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\))$/;
export function same(a: string, b: string): boolean {
  if (a === b) return true;
  if (IDENTITY.test(a) && IDENTITY.test(b)) return true;
  const na = Number.parseFloat(a), nb = Number.parseFloat(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && /^-?[\d.]+px$/.test(a) && /^-?[\d.]+px$/.test(b)) {
    return Math.abs(na - nb) <= 1;
  }
  return false;
}
