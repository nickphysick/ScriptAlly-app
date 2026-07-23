/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CARD CONTRACT (Command Deck v2 P4 — supersedes the Variant-A rim/frame/band structure):
 * flat cards on the sheet (1px #d8cfc4 + the sheet shadow, radius 12, content-sized, flex:0 0
 * 250); band = identity + status only; body = content only; click anywhere opens; hover grows
 * the verb row downward as an overlay. Rule-text locks over todo.css + ToDoPage.tsx.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const css = readFileSync(join(here, "todo.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("The card contract — structure law (todo-deck-v2.html THE LAWS)", () => {
  it("flat on the sheet: 1px #d8cfc4, radius 12, the sheet shadow, flex:0 0 250 — never stretch, no fixed height", () => {
    for (const sel of [".tdb-tile", ".tdb-gcard"]) {
      const r = rule(sel);
      expect(r).toContain("flex: 0 0 var(--tdb-cardw)");
      expect(r).toContain("border: 1px solid #d8cfc4");
      expect(r).toContain("border-radius: 12px");
      expect(r).toContain("box-shadow: 0 2px 6px rgba(58, 28, 20, 0.07)");
      expect(r).not.toContain("min-height");
      expect(r).not.toContain("--reelw");
    }
    expect(css).toContain("--tdb-cardw: 250px");
  });
  it("band = identity + status only: tag + the sage ✓ TODAY chip; the LATTE housekeeping band", () => {
    expect(rule(".tdb-band.hk")).toContain("linear-gradient(180deg, var(--lat-1), var(--lat-2))");
    expect(rule(".tdb-band.hk")).toContain("var(--lat-bd)");
    expect(rule(".tdb-chipon")).toContain("linear-gradient(180deg, var(--hk-sage), var(--hk-sage-2))");
    expect(page).toContain('{committed && <span className="tdb-chipon">✓ TODAY</span>}');
    expect(page).not.toContain("tdb-tacts"); // no body pill
    expect(page).not.toContain("tdb-tmeta"); // body = content only (title + manuscript)
  });
  it("hover (ONE-SURFACE hotfix): ~150ms intent, 180ms ease, lift; the cell never resizes; z raised", () => {
    expect(page).toContain("window.setTimeout(() => setVerbKey(key), 150);");
    expect(rule(".tdb-tile")).toContain("transition: box-shadow 0.18s ease, transform 0.18s ease");
    const hov = rule(".tdb-tile.hov, .tdb-gcard.hov");
    expect(hov).toContain("box-shadow: 0 10px 26px rgba(58, 28, 20, 0.18)");
    expect(hov).toContain("transform: translateY(-2px)");
    expect(hov).not.toContain("z-index"); // detail P1: the raise rides the CELL, not the surface
    // the CELL holds the slot at a fixed resting height; the SURFACE is absolute inside it
    expect(rule(".tdb-cell")).toContain("height: var(--tdb-cardh)");
    expect(rule(".tdb-cell")).toContain("height: var(--tdb-cardh)"); // v4 P4: ONE resting height — batch cells match units
    expect(rule(".tdb-cell > .tdb-tile, .tdb-cell > .tdb-gcard")).toContain("position: absolute; top: 0; left: 0; right: 0;");
    expect(rule(".tdb-cell > .tdb-tile, .tdb-cell > .tdb-gcard")).toContain("min-height: 100%");
  });
  it("detail P1 — THE STACKING LAW: cell-carried z above the sticky headings; the anchor stays bottom-free", () => {
    // the anchor rule: top/left/right only — never bottom, never inset
    const surf = rule(".tdb-cell > .tdb-tile, .tdb-cell > .tdb-gcard");
    expect(surf).toContain("position: absolute; top: 0; left: 0; right: 0;");
    expect(surf).toContain("min-height: 100%");
    expect(surf).not.toContain("bottom");
    expect(surf).not.toContain("inset");
    // the z-rule: the CELL raises on hover AND focus-within, above the headings' z 10
    expect(rule(".tdb-cell")).toContain("z-index: 1");
    expect(css).toContain(".tdb-cell:hover, .tdb-cell:focus-within { z-index: 30; }");
    expect(css).toContain(".tdb-lrow:hover, .tdb-lrow:focus-within { z-index: 30; }"); // the ledger's open menu clears them too
    expect(rule(".tdb-lh2")).toContain("z-index: 10"); // what the raise must beat
    expect(rule(".tdb-lsech")).toContain("z-index: 10");
    // the ancestor audit: no clipper, no stacking-context creator between cell and sheet body
    for (const sel of [".tdb-grid", ".tdb-lane", ".tdb-lanes", ".tdb-sheetbody", ".tdb-mainc"]) {
      let r = "";
      try { r = rule(sel); } catch { continue; } // .tdb-lanes has no own rule — nothing to audit
      expect(r).not.toContain("overflow: hidden");
      expect(r).not.toContain("overflow: clip");
      expect(r).not.toContain("transform");
      expect(r).not.toContain("filter");
      expect(r).not.toContain("will-change");
      expect(r).not.toMatch(/[^-]z-index/);
    }
    // the overlap itself is a paint-order fact jsdom cannot render — the browser walk confirms
  });
  it("the verb stack lives INSIDE the surface's border: grid 0fr⇄1fr 180ms; the wrapper brings NOTHING of its own", () => {
    expect(rule(".tdb-vwrap")).toContain("display: grid; grid-template-rows: 0fr; transition: grid-template-rows 180ms ease");
    expect(css).toContain(".tdb-tile.hov .tdb-vwrap, .tdb-gcard.hov .tdb-vwrap { grid-template-rows: 1fr; }");
    expect(rule(".tdb-vinner")).toContain("overflow: hidden");
    for (const banned of ["background", "border-radius", "box-shadow"]) {
      expect(rule(".tdb-vwrap")).not.toContain(banned);
      expect(rule(".tdb-vstack")).not.toContain(banned); // (the stack's border-TOP hairline is the ref's divider, not chrome)
    }
    expect(rule(".tdb-vstack")).not.toContain("position: absolute");
    // always mounted (the animation needs it); aria-hidden + visibility gate the tab order
    expect(page).toContain("{cardVerbs(c, hov)}");
    expect((page.match(/className="tdb-vwrap" aria-hidden=\{!hov\}/g) ?? []).length).toBe(2);
    expect(rule(".tdb-vinner")).toContain("visibility: hidden");
  });
  it("focus: the default ring dies; :focus-visible = 2px ink outline at 2px offset; reduced motion = no lift, instant", () => {
    expect(css).toContain(".tdb-tile:focus, .tdb-gcard:focus { outline: none; }");
    expect(css).toContain(".tdb-tile:focus-visible, .tdb-gcard:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }");
    expect(css).toContain(".tdb-tile.hov, .tdb-gcard.hov { transform: none; }");
  });
  it("toolbelt P2 — ONE grammar with the ledger: the stack reads VERB_LABELS (a single source; renames touch one place)", () => {
    expect(page).toContain('action: "Action now",');
    expect(page).toContain('todayAdd: "＋ Today’s list",');
    expect(page).toContain('todayRemove: "− Today’s list",');
    expect(page).toContain('later: "Snooze or dismiss",'); // detail P3: moon + chevron left the label — the clock carries the signal
    // the unit stack: Action now (emphasised) · Today's list · Snooze or dismiss — 30px rows
    expect(page).toContain('className="tdb-btnh em" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>');
    expect(page).toContain("{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}");
    expect(rule(".tdb-vstack")).toContain("gap: 6px");
    expect(css).toContain(".tdb-vstack .tdb-btnh { height: 30px; width: 100%; font-size: 10px; }");
    // the short verbs are extinct — the doc-pass divergence is formally retired
    expect(page).not.toContain("✓ DONE");
    expect(page).not.toContain("⚡ FIX");
    expect(page).not.toContain("LATER ▾");
  });
  it("the Later menu — identical everywhere: tomorrow · a week · the per-type hide (restorable)", () => {
    expect(page).toContain(">Remind me tomorrow</button>");
    expect(page).toContain(">Give it a week</button>");
    expect(page).toContain(">Don’t show these again</button>");
    expect(page).toContain("snoozeCard(c, 1,");
    expect(page).toContain("snoozeCard(c, 7,");
    expect(page).toContain("hideType(c, hideKey)");
    expect(page).toContain("const hideKey = laterHideKey(c.taskType);");
  });
  it("click anywhere opens: unit → the journey; batch → the Batch-fix sheet; no footer CTA, no NEVER, no roundel buttons", () => {
    expect(page).toContain('onClick={() => openFlowCards([c])}');
    expect(page).toContain('onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}');
    for (const stale of ["tdb-gfix", "tdb-gnever", "tdb-qrail", "tdb-qbtn", "Batch fix →", ">Never</button>"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale.startsWith("tdb") ? stale : "zz-never-match");
    }
    expect(page).toContain('<div className="tdb-avs">'); // roundels display-only
  });
  it("the batch progress: #ece5d8 track, ink fill, mono meta", () => {
    expect(rule(".tdb-pbar")).toContain("background: #ece5d8");
    expect(rule(".tdb-pbar i")).toContain("background: var(--ink)");
  });
});

describe("v4 P4 → grouping P1 — the batch card at rest (the Expand affordance re-heights the cell)", () => {
  it("the batch cell carries its own height token (the affordance needs the room); the body = headline + roundels + Expand", () => {
    expect(css).toContain("--tdb-cardh-g: 150px");
    expect(css).toContain(".tdb-cell.b { height: var(--tdb-cardh-g); }");
    expect(page).toContain("className={`tdb-cell b${recentG === g.rule ? \" gin\" : \"\"}`}".replace(/\\/g, ""));
    expect(css).not.toContain("--tdb-cardh-b"); // the v4 name stays dead
    const body = page.slice(page.indexOf("the RESTING batch body"), page.indexOf('className="tdb-vwrap" aria-hidden={!hov}>', page.indexOf("the RESTING batch body")));
    expect(body).toContain("tdb-gtt");
    expect(body).toContain("tdb-avs");
    expect(body).toContain("tdb-gxp"); // grouping P1 — the one rest affordance
    expect(body).not.toContain("tdb-gsub");
    expect(body).not.toContain("tdb-gprog");
    // it toggles only — it replaces neither the hover expansion nor Action now
    expect(page).toContain('className="tdb-gxp" onClick={(e) => { e.stopPropagation(); toggleGroup(g.rule); }}>Expand {g.members.length} ▾</button>');
  });
  it("grouping P1 — THE GROUP BAR: full-span family bar owning Collapse; members = the batch's OWN derivation", () => {
    const b = rule(".tdb-gbar");
    expect(b).toContain("grid-column: 1 / -1");
    expect(b).toContain("background: linear-gradient(180deg, var(--lat-1), var(--lat-2))");
    expect(b).toContain("border: 1px solid var(--lat-bd)");
    expect(rule(".tdb-gbart")).toContain("font-family: var(--f12-serif)");
    expect(rule(".tdb-gbarn")).toContain("color: var(--lat-ink)");
    expect(page).toContain(">SHOWING ALL {g.members.length}</span>");
    expect(page).toContain('className="tdb-btnh em tdb-gcol" onClick={() => toggleGroup(g.rule)}>Collapse ▴</button>');
    expect(rule(".tdb-gcol")).toContain("margin-left: auto");
    // members render from g.members via the ONE card contract — never a second query path
    const gx = page.slice(page.indexOf("function renderGroupExpanded"), page.indexOf("function renderGroupCard"));
    expect(gx).toContain("const members = g.members;");
    expect(gx).toContain("{paged.map((m) => renderCard(m.card, true))}");
    expect(gx).not.toContain("queries.");
    expect(gx).not.toContain("agents.");
    // the fragment sits at the batch's map position (ordering) and the open branch returns it
    expect(gx).toContain("<React.Fragment key={g.rule}>");
    expect(page).toContain("if (openGroups[g.rule]) return renderGroupExpanded(g);");
  });
  it("grouping P1 — pagination + the animation branches: 5 render, the dashed cell pages in the rest; 200ms in; reduced-motion instant", () => {
    expect(page).toContain("const GROUP_PAGE = 5;");
    expect(page).toContain("const paged = pagedGroups[g.rule] ? members : members.slice(0, GROUP_PAGE);");
    expect(page).toContain('className="tdb-gpage" onClick={() => setPagedGroups((p) => ({ ...p, [g.rule]: true }))}>+ {remaining} more…</button>');
    expect(rule(".tdb-gpage")).toContain("border: 1.5px dashed var(--lat-bd)");
    expect(rule(".tdb-gpage")).toContain("height: var(--tdb-cardh)");
    expect(css).toContain("@keyframes tdbGroupIn { from { opacity: 0; transform: translateY(4px); } }");
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-gbar, .tdb-gpage, .tdb-cell.gin { animation: none; } }");
    // collapse restores the batch card in place, its return animated via the scoped recentG
    expect(page).toContain('window.setTimeout(() => setRecentG((r) => (r === rule ? null : r)), 260);');
  });
  it("the description + progress reveal INSIDE the expansion, above the stack; Action now stays primary", () => {
    const start = page.indexOf('className="tdb-gdetail"');
    const wrap = page.slice(start, page.indexOf('className="tdb-vstack"', start));
    expect(wrap).toContain("tdb-gsub");
    expect(wrap).toContain("tdb-pbar");
    expect(wrap).toContain("tdb-pcap");
    expect(rule(".tdb-gdetail")).toContain("padding: 0 12px 6px");
    expect(page).toContain('className="tdb-btnh em" onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>{VERB_LABELS.action}</button>');
  });
});
