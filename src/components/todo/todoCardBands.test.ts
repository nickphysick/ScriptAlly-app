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
  it("flat on the sheet: 1px #d8cfc4, radius 12, the sheet shadow, the SHARED min-height (the tightening P3)", () => {
    for (const sel of [".tdb-tile", ".tdb-gcard"]) {
      const r = rule(sel);
      expect(r).toContain("border: 1px solid #d8cfc4");
      expect(r).toContain("border-radius: 12px");
      expect(r).toContain("box-shadow: 0 2px 6px rgba(58, 28, 20, 0.07)");
      // feet align across a row because EVERY card shares one min-height and pins its foot
      expect(r).toContain("min-height: var(--card-minh)");
      expect(r).not.toContain("--reelw");
    }
    expect(rule(".tdb-wrap")).toContain("--card-minh: 150px");
  });
  it("band = KIND left + the tabular WHEN right (the tightening P3), on the family fills", () => {
    expect(rule(".tdb-band.hk")).toContain("linear-gradient(180deg, var(--lat-1), var(--lat-2))");
    expect(rule(".tdb-band.hk")).toContain("var(--lat-bd)");
    // the band is a two-track GRID (never an auto margin): the kind group, then the figures
    const band = rule(".tdb-band");
    expect(band).toContain("display: grid");
    expect(band).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(page).toContain('{committed && <span className="tdb-ktag on">✓ TODAY</span>}');
    expect(page).toContain('<span className="tdb-when">{c.due}</span>'); // the ledger status figures, upright
    expect(rule(".tdb-when")).toContain("font-variant-numeric: tabular-nums");
    expect(page).not.toContain("tdb-tacts"); // no body pill
    expect(page).not.toContain("tdb-tmeta"); // body = content only (title + manuscript)
  });
  it("hover: ~150ms intent, 180ms ease, lift — and the CELL is a PLAIN grid item now (the tightening P3)", () => {
    expect(page).toContain("window.setTimeout(() => setVerbKey(key), 150);");
    expect(rule(".tdb-tile")).toContain("transition: box-shadow 0.18s ease, transform 0.18s ease");
    const hov = rule(".tdb-tile.hov, .tdb-gcard.hov");
    expect(hov).toContain("box-shadow: 0 10px 26px rgba(58, 28, 20, 0.18)");
    expect(hov).toContain("transform: translateY(-2px)");
    expect(hov).not.toContain("z-index"); // detail P1: the raise rides the CELL, not the surface
    // the fixed-height cell + absolute surface machinery is superseded: the foot is always
    // present, so nothing grows on hover and nothing needs a reserved resting height.
    expect(rule(".tdb-cell")).not.toContain("height: var(--tdb-cardh)");
    expect(css).not.toContain("position: absolute; top: 0; left: 0; right: 0;");
    expect(rule(".tdb-cell > .tdb-tile, .tdb-cell > .tdb-gcard")).toContain("height: 100%");
  });
  it("detail P1 — THE STACKING LAW: cell-carried z (the absolute anchor died with the hover surface)", () => {
    // the z-rule: the CELL raises on hover AND focus-within, above the headings' z 10
    expect(rule(".tdb-cell")).toContain("z-index: 1");
    expect(css).toContain(".tdb-cell:hover, .tdb-cell:focus-within { z-index: 30; }");
    expect(css).toContain(".tdb-lrow:hover, .tdb-lrow:focus-within { z-index: 30; }"); // the ledger's open menu clears them too
    // (todo rebuild P1) There is nothing left to beat: the STICKY headings — the lane header bar
    // .tdb-lh2 and the ledger's .tdb-lsech — went with the containers. Sections are typographic
    // and static, so the cell's raise clears them by default.
    expect(css).not.toContain(".tdb-lh2 {");
    expect(css).not.toContain(".tdb-lsech {");
    // the ancestor audit: no clipper, no stacking-context creator between cell and the board
    for (const sel of [".tdb-grid", ".tdb-lane", ".tdb-lanes", ".tdb-board"]) {
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
  it("the hover VERB STACK is SUPERSEDED (the tightening P3): the foot is the action lane, always present", () => {
    // the 0fr⇄1fr reveal machinery is extinct — feet cannot align if actions appear on hover
    expect(css).not.toContain(".tdb-vwrap");
    expect(css).not.toContain(".tdb-vstack");
    expect(page).not.toContain("cardVerbs(");
    // the foot: pinned with margin-top:auto (the ONE sanctioned auto margin — a vertical pin,
    // never a horizontal position), the chevron on the last 1fr track
    const foot = rule(".tdb-cfoot");
    expect(foot).toContain("margin-top: auto");
    expect(foot).toContain("display: grid");
    expect(foot).toContain("grid-template-columns: auto auto auto 1fr");
    expect(rule(".tdb-cfoot .tdb-crest")).toContain("justify-self: end");
  });
  it("focus: the default ring dies; :focus-visible = 2px ink outline at 2px offset; reduced motion = no lift, instant", () => {
    expect(css).toContain(".tdb-tile:focus, .tdb-gcard:focus { outline: none; }");
    expect(css).toContain(".tdb-tile:focus-visible, .tdb-gcard:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }");
    expect(css).toContain(".tdb-tile.hov, .tdb-gcard.hov { transform: none; }");
  });
  it("one-primary: the card foot reads rowPrimaryLabel; VERB_LABELS keeps only the cohort verb", () => {
    /* ⚠️ THE CARD'S VERB AND THE COHORT'S VERB ARE NOW DIFFERENT SOURCES, DELIBERATELY. A card had
       "Action now" from this constant while the command bar had "Action" from `rowPrimaryLabel` —
       one label on a control that opened the journey, another on a control that wrote immediately.
       `rowPrimaryLabel` won because it NAMES THE DEED (Close · Complete · Return · Undo · Start);
       a batch is a cohort of agents rather than one card, so it keeps a verb of its own. */
    expect(page).toContain('action: "Action now",');
    expect(page).toContain('todayAdd: "＋ Today’s list",');
    expect(page).toContain('todayRemove: "− Today’s list",');
    expect(page).toContain('later: "Snooze or dismiss",');
    // the card foot IS the ledger's lane: .tdb-lprime + .tdb-lib, one constant for the labels
    expect(page).toContain('className="tdb-lprime" onClick={() => openFlowCards([c])}>{rowPrimaryLabel(c, "todo")}</button>');
    expect(page).toContain("aria-label={committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}");
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
  it("the batch card shares the ONE min-height (the tightening P3); the body = headline + roundels + slot + Expand", () => {
    // the batch's own height token is superseded — every card shares --card-minh and the
    // fixed progress slot means nothing re-heights for the affordance
    expect(css).not.toContain("--tdb-cardh-g");
    expect(css).not.toContain(".tdb-cell.b {");
    const body = page.slice(page.indexOf("the tightening P3 — the batch body"), page.indexOf('className="tdb-cfoot"', page.indexOf("the tightening P3 — the batch body")));
    expect(body).toContain("tdb-gtt");
    expect(body).toContain("tdb-avs");
    expect(body).toContain("tdb-cprog"); // the fixed slot
    expect(body).toContain("tdb-gxp"); // grouping P1 — the one rest affordance
    // it toggles only — it replaces neither the foot nor Action now
    expect(page).toContain('className="tdb-gxp" onClick={(e) => { e.stopPropagation(); toggleGroup(g.rule); }}>Expand {g.members.length} ▾</button>');
  });
  it("grouping P1 — THE GROUP BAR: full-span family bar owning Collapse; members = the batch's OWN derivation", () => {
    const b = rule(".tdb-gbar");
    expect(b).toContain("grid-column: 1 / -1");
    expect(b).toContain("background: linear-gradient(180deg, var(--lat-1), var(--lat-2))");
    expect(b).toContain("border: 1px solid var(--lat-bd)");
    expect(rule(".tdb-gbart")).toContain("font-family: var(--f12-serif)");
    expect(rule(".tdb-gbarn")).toContain("color: var(--lat-ink)");
    expect(page).toContain("{groupShowing(g, members.length)}</span>"); // SHOWING ALL {n} ⇄ SHOWING {matched} OF {n}
    expect(page).toContain('className="tdb-btnh em tdb-gcol" onClick={() => toggleGroup(g.rule)}>Collapse ▴</button>');
    expect(rule(".tdb-gcol")).toContain("margin-left: auto");
    // members render from g.members via the ONE card contract — never a second query path
    const gx = page.slice(page.indexOf("function renderGroupExpanded"), page.indexOf("function renderGroupCard"));
    expect(gx).toContain("const members = groupMembers(g);"); // P3: the search-narrowed view of g.members — still the ONE derivation
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
    expect(rule(".tdb-gpage")).toContain("min-height: var(--card-minh)"); // the tightening P3: the shared height
    expect(css).toContain("@keyframes tdbGroupIn { from { opacity: 0; transform: translateY(4px); } }");
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-gbar, .tdb-gpage, .tdb-cell.gin, .tdb-lsub, .tdb-lpage { animation: none; } .tdb-lchev { transition: none; } }"); // P2 joined the branch
    // collapse restores the batch card in place, its return animated via the scoped recentG
    expect(page).toContain('window.setTimeout(() => setRecentG((r) => (r === rule ? null : r)), 260);');
  });
  it("the progress lives in the FIXED SLOT (the tightening P3) — present or absent, the foot never moves", () => {
    // the hover-expansion home (gdetail/gsub) is extinct; the slot renders on the resting body
    expect(page).not.toContain("tdb-gdetail");
    expect(page).not.toContain("tdb-gsub");
    const slot = page.slice(page.indexOf('<div className="tdb-cprog">'), page.indexOf("tdb-gxp"));
    expect(slot).toContain("tdb-minibar");
    expect(slot).toContain("tdb-pcap");
    expect(rule(".tdb-cprog")).toContain("margin-top: 10px");
    expect(page).toContain('className="tdb-lprime" onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>{VERB_LABELS.action}</button>');
  });
});
