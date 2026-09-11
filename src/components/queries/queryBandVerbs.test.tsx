/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE BAND VERBS (Grid pass §5) — what a string render can prove, and only that.
 *
 * The geometry the brief asserts — the band is as tall hovered as at rest, the verb row never
 * covers the fact line, Tab reaches the row and Escape returns — is measured on the rendered page
 * (`tests/e2e/qcGridPass.measure.ts`); this suite runs in `node` with no layout. What it proves here
 * is the structure those measurements rest on: no button inside a button, the row inside the band
 * after the caption it replaces, the open control first, availability from `queryVerbs` and nowhere
 * else, and both views mounting the page's one handler.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryCard } from "./QueryCard";
import { QueryCentreGrid, type GridCard } from "./QueryCentreGrid";
import { QueryStatus, type Query } from "../../types";
import { cardFacts } from "../../lib/queryCardFacts";
import { queryVerbs } from "../../lib/queryRowFacts";
import { sliceBetween } from "../../test/sliceBetween";

const HERE = join(process.cwd(), "src/components/queries");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const css = strip(readFileSync(join(HERE, "queryCard.css"), "utf8"));
const tsx = strip(readFileSync(join(HERE, "QueryCard.tsx"), "utf8"));
const page = strip(readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8"));
const tokens = readFileSync(join(process.cwd(), "src/index.css"), "utf8");

const TODAY = new Date("2026-09-11T12:00:00Z");
const ago = (d: number) => new Date(TODAY.getTime() - d * 86_400_000).toISOString();
const q = (o: Partial<Query>): Query =>
  ({ id: "q1", userId: "u", manuscriptId: "m", agentId: "a", status: QueryStatus.QUERIED, dateSent: ago(20), ...o }) as Query;

/** every status the app has — so every turn, and so every row of `queryVerbs`' table */
const ALL = Object.values(QueryStatus).map((status) => ({ status, dateSent: ago(20), lastStatusChange: ago(5) }));

const card = (o: Partial<Query>, host = true, ghost = false) => {
  const query = q(o);
  const facts = cardFacts(query, TODAY, { agencyWeeks: 8 });
  return {
    facts,
    html: renderToStaticMarkup(
      <QueryCard
        id="q1" status={query.status} name="Harriet Vane-Coe" agency="Stillwater Reps" initials="HV"
        facts={facts} ghost={ghost}
        verbs={host ? queryVerbs(facts.turn) : null}
        onVerb={host ? () => {} : undefined}
        onMore={() => {}}
      />,
    ),
  };
};

const buttonDepth = (html: string) => {
  let d = 0;
  let max = 0;
  for (const t of html.match(/<\/?button\b/g) ?? []) {
    d += t.startsWith("</") ? -1 : 1;
    max = Math.max(max, d);
  }
  return max;
};

describe("⚠️ the structure the measurements rest on", () => {
  it("no button inside a button — the reason the card stopped being one", () => {
    for (const o of ALL) {
      const { html } = card(o);
      expect((html.match(/<button\b/g) ?? []).length, `${o.status}: nothing to nest`).toBeGreaterThan(2);
      expect(buttonDepth(html), `${o.status}: a button opened inside another`).toBe(1);
    }
  });

  it("the verb row sits in the band, after the caption it replaces", () => {
    const { html } = card({});
    const band = sliceBetween(html, 'class="qcc-band"', 'class="qcc-body"');
    expect(band).toContain('class="qcc-verbs"');
    expect(band.indexOf('class="qcc-turn"'), "the caption is missing from the band").toBeGreaterThan(-1);
    expect(band.indexOf('class="qcc-turn"')).toBeLessThan(band.indexOf('class="qcc-verbs"'));
  });

  it("the open control is the card's first button — so Tab from the card reaches its own verbs next", () => {
    const { html, facts } = card({});
    const firstBtn = html.slice(html.indexOf("<button"), html.indexOf(">", html.indexOf("<button")) + 1);
    expect(firstBtn).toContain('class="qcc-open"');
    expect(firstBtn).toContain("Harriet Vane-Coe, Stillwater Reps");
    expect(html.indexOf('class="qcc-open"')).toBeLessThan(html.indexOf('class="qcc-verbs"'));
    expect(facts.turn).toBeTruthy();
  });

  it("Escape in the row hands focus back to that control", () => {
    expect(tsx).toMatch(/e\.key !== "Escape"\) return;[\s\S]{0,160}openRef\.current\?\.focus\(\)/);
  });
});

describe("⚠️ availability is queryVerbs' — for every status, and nowhere else", () => {
  it("each verb is drawn exactly when the table offers it", () => {
    const branches = { nudge: new Set<boolean>(), closed: new Set<boolean>(), enabled: new Set<boolean>() };
    for (const o of ALL) {
      const { html, facts } = card(o);
      const v = queryVerbs(facts.turn);
      const at = `${o.status} (${facts.turn})`;
      expect(html, at).toContain(`>${v.primary.label}</button>`);
      expect(html.includes('aria-label="Snooze the nudge"'), `${at} snooze`).toBe(v.nudge);
      expect(html.includes('aria-label="Mark closed"'), `${at} close`).toBe(v.markClosed);
      expect(html, `${at} ⋯`).toContain('aria-label="More actions for Harriet Vane-Coe"');
      expect(html.includes("qcc-vb--off"), `${at} greyed`).toBe(!v.primary.enabled);
      branches.nudge.add(v.nudge);
      branches.closed.add(v.markClosed);
      branches.enabled.add(v.primary.enabled);
    }
    /* every branch of the table was entered, or this is a census of one state */
    for (const [k, s] of Object.entries(branches)) expect(s.size, `only one side of "${k}" was seen`).toBe(2);
  });

  it("no host, no row — and the ghost has neither a row nor an open control", () => {
    expect(card({}, false).html).not.toContain("qcc-verbs");
    const ghost = card({}, true, true).html;
    expect(ghost).not.toContain("qcc-verbs");
    expect(ghost).not.toContain("qcc-open");
  });

  it("the grid gives its cards verbs only when the page hands it a handler", () => {
    const facts = cardFacts(q({}), TODAY, { agencyWeeks: 8 });
    const row: GridCard = {
      id: "q1", status: QueryStatus.QUERIED, turn: facts.turn, name: "Vane-Coe", agency: "Stillwater",
      initials: "VC", lastMs: null, sentMs: null, expectedMs: null, facts,
    };
    expect(renderToStaticMarkup(<QueryCentreGrid rows={[row]} group="none" />)).not.toContain("qcc-verbs");
    expect(renderToStaticMarkup(<QueryCentreGrid rows={[row]} group="none" onVerb={() => {}} />)).toContain("qcc-verbs");
  });
});

describe("⚠️ both views mount the page's ONE handler — the card opens what the row opens", () => {
  it("the list and the grid each pass handleRowVerb and handleRowMore", () => {
    for (const mount of ["<QueryListView", "<QueryCentreGrid"]) {
      const props = sliceBetween(page, mount, "/>");
      expect(props, `${mount} lost the shared verb handler`).toContain("onVerb={handleRowVerb}");
      expect(props, `${mount} lost the shared ⋯ handler`).toContain("onMore={handleRowMore}");
    }
  });
});

describe("the brief's values, as the stylesheet asks for them (the page measures what it gets)", () => {
  it("the row is placed against the band, hidden at rest, revealed by hover and by focus", () => {
    expect(css).toMatch(/\.qcc-band \{[^}]*position: relative;/);
    const row = css.match(/(?:^|\n)\.qcc-verbs \{([^}]*)\}/)?.[1] ?? "";
    expect(row, "the verb row's rule is missing").not.toBe("");
    for (const d of ["position: absolute;", "top: 50%;", "right: 10px;", "transform: translateY(-50%);", "opacity: 0;", "pointer-events: none;"])
      expect(row).toContain(d);
    expect(css).toMatch(/\.qcc:hover \.qcc-verbs,\s*\.qcc:focus-within \.qcc-verbs \{ opacity: 1; pointer-events: auto; \}/);
  });

  it("the caption fades in 120ms as the row arrives", () => {
    expect(css).toMatch(/(?:^|\n)\.qcc-turn \{[^}]*transition: opacity 0\.12s;/);
    expect(css).toMatch(/\.qcc:hover \.qcc-turn,\s*\.qcc:focus-within \.qcc-turn \{ opacity: 0; \}/);
  });

  it("the primary is an ink pill carrying its name; the rest are 26px squares", () => {
    const sq = css.match(/(?:^|\n)\.qcc-vb \{([^}]*)\}/)?.[1] ?? "";
    expect(sq).toContain("width: 26px;");
    expect(sq).toContain("height: 26px;");
    const pill = css.match(/\.qcc-vb--p,\s*\.qcc-vb--p:hover \{([^}]*)\}/)?.[1] ?? "";
    for (const d of ["padding: 0 11px;", "background: var(--btn-ink, #1c130f);", "color: #fdfaf5;", "font-size: 8px;", "letter-spacing: 0.08em;", "text-transform: uppercase;"])
      expect(pill, d).toContain(d);
    /* the token the pill reads is the app's one near-black fill, and it is #1c130f */
    expect(tokens).toMatch(/--btn-ink: #1c130f;/);
  });
});
