/**
 * Locks for the shared hub token sheet (ref design-refs/hub-token-sheet-v3.html; VALUES from
 * Nick's tuner spec, which WINS over v3 where they differ). Rule-text locks against the real
 * index.css artefact — both hubs consume only these `--hub-*` tokens for their named surfaces.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
const block = (sel: string) => {
  const start = css.indexOf(`\n${sel} {`);
  expect(start).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("\n}", start));
};
const has = (sel: string, pairs: Record<string, string>) => {
  const b = block(sel);
  for (const [k, v] of Object.entries(pairs)) expect(b).toContain(`${k}: ${v};`);
};

describe("hub tokens — Cappuccino (spec, espresso primaries/monograms/taupe toggle)", () => {
  it("surfaces + espresso (spec wins over v3's caramel/latte)", () => {
    has(".t-capp", {
      "--hub-desk": "#e8ddd0",
      "--hub-pane-process": "#fffefb",
      "--hub-radius": "6px",
      "--hub-band-process": "#eaf1e7",
      "--hub-band-reference": "#f6f1e6",
      "--hub-toggle-on": "#705e4c",   // NOT v3 #dcb588
      "--hub-primary": "#5d4037",     // mocha (theme editor 2026-07-07; was espresso #422701)
      "--hub-primary-tx": "#ffffff",
      "--hub-monogram": "#261603",    // near-espresso (theme editor 2026-07-08; was taupe #ad9f8a)
      "--hub-monogram-tx": "#fdfaf5",
      "--hub-cmd": "#fffefb",
      "--hub-head": "#000000",
    });
  });
});

describe("hub tokens — Bold Pastille (spec, BOTH panes white)", () => {
  it("white panes supersede the locked #ece2e0; spec reference band + ink monogram", () => {
    has(".t-bold", {
      "--hub-desk": "#c2cfda",
      "--hub-pane-process": "#ffffff",   // supersedes #ece2e0
      "--hub-pane-reference": "#ffffff",
      "--hub-radius": "14px",
      "--hub-band-process": "#f4c7c2",
      "--hub-band-reference": "#fbefef",  // NOT v3 #d9e3ec
      "--hub-monogram": "#000000",        // NOT v3 #f8dcd8
      "--hub-monogram-tx": "#ffffff",
      "--hub-cmd": "#ffffff",
    });
  });
});

describe("hub tokens — Editorial (spec)", () => {
  it("papers differ by typography; spec primary/row/reference win over v3", () => {
    has(".t-edn", {
      "--hub-desk": "#f4f4f3",
      "--hub-pane-process": "#ffffff",
      "--hub-radius": "10px",
      "--hub-band-process": "#eceae6",
      "--hub-band-reference": "#f5f5f5",  // NOT v3 white
      "--hub-primary": "#dedede",         // NOT v3 #e9eaeb
      "--hub-primary-tx": "#000000",
      "--hub-row-on": "#f5fbff",          // NOT v3 #f1f1f0
      "--hub-monogram": "#e9eaeb",
      "--hub-cmd": "#fbfbfa",
    });
  });
});

describe("hub token completeness — every theme defines the full set", () => {
  const KEYS = [
    "--hub-desk", "--hub-slab", "--hub-slab-rule", "--hub-list", "--hub-pane-process",
    "--hub-pane-reference", "--hub-col", "--hub-pane-bd", "--hub-radius", "--hub-pane-sh",
    "--hub-hair", "--hub-row-hair", "--hub-band-process", "--hub-band-process-bd",
    "--hub-band-process-tx", "--hub-band-reference", "--hub-band-reference-tx", "--hub-toggle-on",
    "--hub-toggle-on-tx", "--hub-pill-rail", "--hub-primary", "--hub-primary-bd", "--hub-primary-tx",
    "--hub-monogram", "--hub-monogram-tx", "--hub-row-on", "--hub-cell", "--hub-cell-bd",
    "--hub-cmd", "--hub-cmd-rule", "--hub-accent", "--hub-ink", "--hub-head", "--hub-label",
    "--hub-item", "--hub-body", "--hub-btn-bg", "--hub-btn-bd", "--hub-btn-sh", "--hub-btn-rad",
  ];
  for (const theme of [".t-capp", ".t-bold", ".t-edn"]) {
    it(`${theme} defines all ${KEYS.length} hub tokens`, () => {
      const b = block(theme);
      for (const k of KEYS) expect(b, `${theme} missing ${k}`).toContain(`${k}:`);
    });
  }
});

describe("Queries consumes the hub layer for its named surfaces", () => {
  const q = readFileSync(resolve(__dirname, "../components/Queries.tsx"), "utf8");
  it("pane, columns, command bar, monogram read --hub-*", () => {
    expect(q).toContain("var(--hub-pane-process)");
    expect(q).toContain("var(--hub-col");
    expect(q).toContain("var(--hub-cmd)");
    expect(q).toContain("var(--hub-primary)");
    expect(q).toContain("var(--hub-monogram)");
    expect(q).toContain("var(--hub-row-on)");
  });
});
