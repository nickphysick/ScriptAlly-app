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

describe("briefing-slot P2 — THE ASSISTANT BAND (supersedes the Pro strip)", () => {
  const band = promo.slice(promo.indexOf("export const AssistantBand"), promo.indexOf("export const AssistantModal"));
  it("the component IS the band: slate PRO pill, Playfair title, one derived line, slate button", () => {
    expect(band).toContain('<div className="tdb-asst">');
    expect(band).toContain('<span className="tdb-asstpill">');
    expect(band).toContain("SCRIPTALLY PRO");
    expect(band).toContain('<div className="tdb-asstt">Hand over the housekeeping</div>');
    expect(band).toContain('className="tdb-asstbtn" onClick={onPreview}>Meet the assistant</button>');
    // every earlier Pro surface on this page is extinct
    expect(promo).not.toContain("ProStrip");
    expect(promo).not.toContain("ProSticker");
    expect(promo).not.toContain("spine-pro");
    expect(promo).not.toContain("tdb-colo"); // the colophon
    expect(promo).not.toContain("ProBanner");
  });
  it("the sticker tokens: warm-white ground, 1.5px ink border, the 4px pastille-blue block", () => {
    const r = rule(".tdb-asst");
    expect(r).toContain("background: #fdf6f2");
    expect(r).toContain("border: 1.5px solid #3a1c14");
    expect(r).toContain("box-shadow: 4px 4px 0 #c2cfda");
    expect(r).toContain("border-radius: 13px");
    expect(r).toContain("margin-top: 56px"); // generous space above, at the content's foot
    expect(rule(".tdb-asstpill")).toContain("background: #6A89A7");
    expect(rule(".tdb-asstpill")).toContain("border: 1px solid #587991");
    expect(rule(".tdb-asstbtn")).toContain("background: #6A89A7");
    expect(rule(".tdb-asstbtn")).toContain("margin-left: auto"); // pinned to the band's end
  });
  it("THE BLUE SHADOW IS UNIQUE — one blue sticker in the app", () => {
    expect((css.match(/4px 4px 0 #c2cfda/g) ?? []).length).toBe(1);
    const shellCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
    expect(shellCss).not.toContain("#c2cfda");
  });
  it("the count is live-derived from props, never hardcoded; the copy is option 5's", () => {
    expect(band).toContain("{hkCount} of your {totalCount} tasks could run in the background whilst you write.");
    expect(band).not.toMatch(/\d+ of your \d+/);
    expect(band).not.toMatch(/hours?/i);
  });
  /**
   * ⚠️ THE BAND IS UNMOUNTED FROM THE TO-DO LIST (fix pack, 10 Aug) — a PLACEMENT decision, not a
   * deletion. It sat as the last child of `.tdb-centre`, taking its own height plus the column's
   * row-gap out of the scroll zone, on a page whose complaint was that the window was too short.
   *
   * ⚠️ AND IT MUST NOT SIMPLY BE MOVED BACK: it was fed `tiles.housekeeping` and `shownY`, which
   * are MEMBER-unit counts (every sweep uncollapsed), while "Outstanding" beside it counts CARDS
   * — the "38 of your 44 tasks" against an Outstanding of 16 seen in production. Units first.
   * The COMPONENT is untouched and everything below still covers it.
   */
  it("the band is not mounted on the To-do list, and its gate went with it", () => {
    expect(page).not.toContain("<AssistantBand");
    expect(page).not.toContain("{!isProUser(currentUser) && (");
    expect(page).not.toContain("tdb-stickerseat");
    /* the MODAL is still reachable — only the band's seat was given up */
    expect(page).toContain("<AssistantModal");
  });
  it("NO other Pro surface crept onto the page in its place", () => {
    for (const gone of ["ProStrip", "ProSticker", "ProBanner", "tdb-prostrip", "spine-pro", "tdb-colo"]) {
      expect(page).not.toContain(gone);
      expect(css).not.toContain(gone);
    }
    expect(band).not.toMatch(/dismiss|onClose|onDismiss/i);
    expect(band).not.toContain("✕");
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
