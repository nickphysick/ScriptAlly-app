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

describe("panel-final P3 — THE BLUE STICKER (supersedes the colophon)", () => {
  const sticker = promo.slice(promo.indexOf("export const ProSticker"), promo.indexOf("export const AssistantModal"));
  it("the component IS the blue sticker: the slate pill, the Playfair title, the slate link", () => {
    expect(sticker).toContain('<div className="spine-pro">');
    expect(sticker).toContain('<span className="spine-pro-pill"><span aria-hidden>✦</span>SCRIPTALLY PRO</span>');
    expect(sticker).toContain('<div className="spine-pro-title">Hand over the housekeeping</div>');
    expect(sticker).toContain('<button type="button" className="spine-pro-link" onClick={onPreview}>Meet the assistant →</button>');
    // the colophon component is extinct (markup + name)
    expect(promo).not.toContain("tdb-colo");
    expect(promo).not.toContain("ProBanner");
  });
  it("the count is live-derived from props, never hardcoded; the copy is option 5's", () => {
    expect(sticker).toContain("{hkCount} of your {totalCount} tasks could run in the background whilst you write.");
    expect(sticker).not.toMatch(/\d+ of your \d+/); // no literal numbers baked in
    expect(sticker).not.toMatch(/hours?/i); // the hours clause stays omitted (never fabricated)
  });
  it("gating + wiring: mounted only for non-Pro, at the panel foot, opening the preview modal", () => {
    expect(page).toContain("panelPromo={!isProUser(currentUser) ? (");
    expect(page).toContain("<ProSticker hkCount={tiles.housekeeping} totalCount={shownY} onPreview={() => setAssistantOpen(true)} />");
    // the content-panel colophon mount is gone
    expect(page).not.toContain("<ProBanner");
    expect(page).not.toContain('onWhatsInPro={() => onNavigate("plans")}');
  });
  it("NO dismiss control — the sticker cannot be closed (the colophon had none either)", () => {
    expect(sticker).not.toMatch(/dismiss|onClose|onDismiss/i);
    expect(sticker).not.toContain("✕");
    expect(sticker).not.toMatch(/aria-label="Close"/i);
  });
  it("the colleague banner stays EXTINCT (bounded: FocusFlow's .tdb-propill is a live namesake)", () => {
    for (const f of [promo, page, css]) {
      expect(f).not.toMatch(/tdb-pro(?!pill)/);
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
