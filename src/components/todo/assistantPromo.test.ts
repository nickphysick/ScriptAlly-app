/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * v4 P5 — the Pro letterhead banner + the "Meet the assistant" preview modal. Source/rule-text
 * locks (jsdom mounts nothing): gating, derived numbers, CTA wiring, the canned theatre's
 * honesty guarantees (no writes, no price), the docked TODO for the real free-run mechanic.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const promo = readFileSync(join(here, "AssistantPromo.tsx"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("v4 P5 — the letterhead banner (upsell candidate A)", () => {
  it("renders below the board inside the sheet, non-Pro only, with live-derived numbers", () => {
    expect(page).toContain("{!isProUser(currentUser) && (");
    expect(page).toContain("hkCount={tiles.housekeeping}");
    expect(page).toContain("totalCount={shownY}");
    const mainc = page.indexOf('className="tdb-mainc"');
    const banner = page.indexOf("<ProBanner");
    expect(banner).toBeGreaterThan(mainc);
    expect(banner).toBeGreaterThan(page.indexOf("renderLedger()")); // below the views
    expect(promo).toContain("<b>{hkCount} of your {totalCount} tasks</b>");
  });
  it("the letterhead frame: white card, #c8d4de outer + inset inner rule; kicker + Playfair title", () => {
    expect(rule(".tdb-letter")).toContain("border: 1px solid #c8d4de");
    expect(css).toContain('.tdb-letter::before { content: ""; position: absolute; inset: 7px; border: 1px solid rgba(106, 137, 167, 0.35);');
    expect(promo).toContain(">YOU’VE FOUND A SCRIPTALLY PRO FEATURE</div>");
    expect(promo).toContain("<h3>Hand over the housekeeping</h3>");
  });
  it("the demo column: the user's REAL task names, BY-THE-ASSISTANT chips, ONE pending row", () => {
    expect(promo).toContain(">THE ASSISTANT, ON YOUR TASKS</div>");
    expect(promo).toContain("BY THE ASSISTANT");
    expect(promo).toContain('i === demo.length - 1 ? " pending" : ""');
    expect(page).toContain("const assistantRows: AssistantTaskRow[] = hkGroups.flatMap((g) =>");
  });
  it("CTAs: primary opens the modal; ghost What's-in-Pro routes to the upgrade surface", () => {
    expect(promo).toContain(">See what it does →</button>");
    expect(promo).toContain(">What’s in Pro</button>");
    expect(page).toContain("onPreview={() => setAssistantOpen(true)}");
    expect(page).toContain('onWhatsInPro={() => onNavigate("plans")}');
  });
  it("the hours clause is OMITTED (no cheap derivation — never fabricated)", () => {
    expect(promo).not.toMatch(/hours?/i);
  });
});

describe("v4 P5 — the Meet-the-assistant preview modal", () => {
  it("letterhead-framed dialog over the scrim; kicker + honesty sub-line; Esc + Not now + ✕ close", () => {
    expect(promo).toContain('role="dialog" aria-modal="true" aria-label="Meet the assistant"');
    expect(promo).toContain(">SCRIPTALLY PRO · A PREVIEW USING YOUR ACTUAL TASKS</div>");
    expect(promo).toContain("Nothing is saved");
    expect(promo).toContain('if (e.key === "Escape") { e.stopPropagation(); onClose(); }');
    expect(promo).toContain(">Not now</button>");
    expect(css).toContain('.tdb-amodal::before { content: ""; position: absolute; inset: 8px; border: 1px solid rgba(106, 137, 167, 0.35);');
  });
  it("the theatre: scripted sequence over real names, a spinning slate ring, timing chips, the found card (animation = in-browser check)", () => {
    expect(promo).toContain("const [doneN, setDoneN] = useState(1);");
    expect(promo).toContain("window.setTimeout(() => setDoneN((n) => n + 1), 1700);");
    expect(promo).toContain('const CANNED_TIMES = ["41S", "28S", "36S", "52S"];');
    expect(promo).toContain(">WATCHING THE ASSISTANT WORK — ");
    expect(promo).toContain("READING AGENCY SITE…");
    expect(promo).toContain(">WHAT IT JUST FOUND</b>");
    expect(css).toContain(".tdb-dtick.spin");
    expect(css).toContain("@keyframes tdbSpin");
  });
  it("reduced motion jumps to the held frame; the run holds one short so a working row stays on stage", () => {
    expect(promo).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;');
    expect(promo).toContain("const cap = Math.max(1, theatre.length - 1);");
  });
  it("the upgrade routes to /plans; NO price string anywhere; the footer reads Part of ScriptAlly Pro", () => {
    expect(page).toContain('onUpgrade={() => { setAssistantOpen(false); onNavigate("plans"); }}');
    expect(promo).toContain(">Part of ScriptAlly Pro</span>");
    expect(promo).toContain(">Upgrade &amp; set it working →</button>");
    expect(promo).not.toMatch(/£|\$\d|per month|\/mo|a month|annually/i); // no price FIGURE (the word 'price' appears only in the honesty comment)
  });
  it("a PREVIEW only: no write primitives reachable from this path; the free-run TODO is docked at the data source", () => {
    for (const w of ["upsertTaskFlag", "updateAgent", "updateUserTask", "updateUserProfile", "dismissTask", "resolveTaskFlag"]) {
      expect(promo).not.toContain(w);
    }
    expect(page).toContain('// TODO(pro-assistant): replace canned theatre with real single-task free run ("Try one free")');
  });
});
