/**
 * Token smoke locks for the rail rebuild — asserts the real index.css artefact carries the
 * ref-verbatim rail token values inside each theme block (the repo's rule-text-lock pattern,
 * as used for firestore.rules). Values from design-refs/sidenav-three-themes-v2.html.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");

/** The css text of one top-level theme block. */
function themeBlock(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  expect(start).toBeGreaterThan(-1);
  const end = css.indexOf("\n}", start);
  return css.slice(start, end);
}

const expectTokens = (block: string, pairs: Record<string, string>) => {
  for (const [token, value] of Object.entries(pairs)) {
    expect(block).toContain(`${token}: ${value}`);
  }
};

describe("rail tokens — Cappuccino (.t-capp)", () => {
  it("carries the ref values", () => {
    expectTokens(themeBlock(".t-capp"), {
      "--rail-card": "#faf9f6",   /* strip-back neutral side-nav (Cappuccino-only; Nick's call) */
      "--rail-bd": "#e7ddd2",
      "--rail-bdw": "1px",
      "--rail-pill": "#e9ece4",
      "--rail-accent": "#422701",
      "--rail-btn-bg": "#ddc0b6",
      "--rail-btn-bd": "#ded3c2",
      "--rail-btn-tx": "#000000",
      "--rail-btn-hov": "#f4f2ef",
    });
  });
});

describe("rail tokens — Bold Pastille (.t-bold)", () => {
  it("carries the ink frame, offset shadows and pink pill", () => {
    expectTokens(themeBlock(".t-bold"), {
      "--rail-bd": "#1d1712",
      "--rail-bdw": "1.5px",
      "--rail-shadow": "5px 5px 0 rgba(29, 23, 18, 0.92)",
      "--rail-pill": "#c1d3e1",
      "--rail-accent": "#1d1712",
      "--rail-btn-bd": "#1d1712",
      "--rail-btn-bdw": "1.5px",
      "--rail-btn-hov": "#f8dcd8",
      "--rail-btn-shadow": "2px 2px 0 rgba(29, 23, 18, 0.85)",
    });
  });
});

describe("rail peek tokens — shadow + scrim per theme (ref rail-hover-peek-v2.html)", () => {
  it("Cappuccino", () => {
    expectTokens(themeBlock(".t-capp"), {
      "--rail-peek-shadow": "0 10px 30px rgba(58, 28, 20, 0.16)",
      "--rail-scrim": "rgba(58, 28, 20, 0.12)",
    });
  });

  it("Bold Pastille keeps the hard-offset language", () => {
    expectTokens(themeBlock(".t-bold"), {
      "--rail-peek-shadow": "7px 7px 0 rgba(29, 23, 18, 0.92)",
      "--rail-scrim": "rgba(29, 23, 18, 0.14)",
    });
  });

  it("Editorial deepens its layered shadow", () => {
    expectTokens(themeBlock(".t-edn"), {
      "--rail-peek-shadow": "0 2px 4px rgba(20, 20, 20, 0.06), 0 18px 44px rgba(20, 20, 20, 0.14)",
      "--rail-scrim": "rgba(20, 20, 20, 0.10)",
    });
  });
});

describe("rail tokens — Editorial (.t-edn)", () => {
  it("is borderless on layered shadows with the graphite set", () => {
    expectTokens(themeBlock(".t-edn"), {
      "--rail-bd": "transparent",
      "--rail-bdw": "0px",
      "--rail-shadow": "0 1px 2px rgba(20, 20, 20, 0.05), 0 14px 36px rgba(20, 20, 20, 0.09)",
      "--rail-pill": "#e9eaeb",
      "--rail-accent": "#44484d",
    });
  });

  it("keeps the WHITE capture buttons (the locked exception to the tinted-button rule)", () => {
    const edn = themeBlock(".t-edn");
    expectTokens(edn, {
      "--rail-btn-bg": "#ffffff",
      "--rail-btn-bd": "#dcdcdb",
    });
    // The theme's own tinted button surface stays untouched for everything else.
    expectTokens(edn, { "--abtn-bg": "#eeeff0" });
  });
});
