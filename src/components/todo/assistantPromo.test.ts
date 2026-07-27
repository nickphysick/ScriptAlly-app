/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE COLOPHON (detail P4, todo-detail-a/b — superseding the colleague banner) + the
 * "Meet the assistant" preview modal (unchanged). Source/rule-text locks (jsdom mounts
 * nothing): gating, derived numbers, CTA wiring, the press-law exemption, the canned theatre's
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

describe("todo rebuild P5 — THE PRO STRIP (supersedes the blue sticker)", () => {
  const strip = promo.slice(promo.indexOf("export const ProStrip"), promo.indexOf("export const AssistantModal"));
  it("the component IS the foot strip: a slate PRO pill, a Playfair title, one line of body, a slate link", () => {
    expect(strip).toContain('<div className="tdb-prostrip">');
    expect(strip).toContain('<span className="tdb-prostrip-pill">PRO</span>');
    expect(strip).toContain('<div className="tdb-prostrip-t">Hand over the housekeeping</div>');
    expect(strip).toContain('<button type="button" className="tdb-prostrip-lk" onClick={onPreview}>Meet the assistant →</button>');
    // the blue sticker and the colophon before it are both extinct (markup + name)
    expect(promo).not.toContain("ProSticker");
    expect(promo).not.toContain("spine-pro");
    expect(promo).not.toContain("tdb-colo");
    expect(promo).not.toContain("ProBanner");
  });
  it("NO BLUE FILL and no heavy shadow — card surface, hairline, radius 14, at the page foot", () => {
    const r = rule(".tdb-prostrip");
    expect(r).toContain("background: var(--card, #fdfaf5)");
    expect(r).toContain("border: 1px solid var(--line)");
    expect(r).toContain("border-radius: 14px");
    expect(r).toContain("margin-top: 50px"); // 50px below the last section
    expect(r).not.toContain("box-shadow");
    expect(r).not.toContain("#c2cfda"); // the pastille-blue offset block does not follow it here
    // slate survives only as the pill fill and the link ink (Pro's colour, not a card fill)
    expect(rule(".tdb-prostrip-pill")).toContain("background: #6A89A7");
    expect(rule(".tdb-prostrip-lk")).toContain("color: #6A89A7");
  });
  it("the count is live-derived from props, never hardcoded; the copy is option 5's", () => {
    expect(strip).toContain("{hkCount} of your {totalCount} tasks could run in the background whilst you write.");
    expect(strip).not.toMatch(/\d+ of your \d+/); // no literal numbers baked in
    expect(strip).not.toMatch(/hours?/i); // the hours clause stays omitted (never fabricated)
  });
  it("gating + wiring: mounted only for non-Pro, at the page FOOT, opening the preview modal", () => {
    expect(page).toContain("{!isProUser(currentUser) && (");
    expect(page).toContain("<ProStrip hkCount={tiles.housekeeping} totalCount={shownY} onPreview={() => setAssistantOpen(true)} />");
    // it sits AFTER the board, not in a top-right band
    expect(page.indexOf("<ProStrip")).toBeGreaterThan(page.indexOf('<div className="tdb-board">'));
    expect(page).not.toContain("tdb-stickerseat");
    expect(page).not.toContain("<ProBanner");
    expect(page).not.toContain('onWhatsInPro={() => onNavigate("plans")}');
  });
  it("NO dismiss control — the strip cannot be closed (the sticker and colophon had none either)", () => {
    expect(strip).not.toMatch(/dismiss|onClose|onDismiss/i);
    expect(strip).not.toContain("✕");
    expect(strip).not.toMatch(/aria-label="Close"/i);
  });
  it("the colleague banner stays EXTINCT (bounded: FocusFlow's .tdb-propill and the new .tdb-prostrip are live namesakes)", () => {
    for (const f of [promo, page, css]) {
      expect(f).not.toMatch(/tdb-pro(?!pill|strip)/);
    }
    expect(promo).not.toContain("Leave the admin to me");
    expect(page).toContain('// TODO(pro-assistant): replace canned theatre with real single-task free run ("Try one free")');
  });
});

describe("v4 P5 — the Meet-the-assistant preview modal (stands unchanged)", () => {
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
    expect(page).toContain("const assistantRows: AssistantTaskRow[] = hkGroups.flatMap((g) =>");
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
