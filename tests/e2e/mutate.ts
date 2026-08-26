/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MUTATION CATALOGUE — how a suite proves its own assertions can still fail.
 *
 * ⚠️ WHY THIS EXISTS. `steerRound` and `finishRound` were fully green on 21 Aug and measured nothing
 * real for five days: two rebuilds moved the pane out from under them and every case went on
 * passing, because a probe that finds no element reports no offence. Two of their assertions would
 * have gone VACUOUSLY green rather than red. A green is worth exactly as much as the last time
 * somebody watched the thing go red.
 *
 * ⚠️ SO EACH ENTRY BREAKS ONE NAMED THING AND SAYS WHICH ASSERTIONS SHOULD NOTICE. Running the
 * suite with `SA_MUTATE=<name>` injects it before anything is measured; the assertions listed in
 * `targets` must go RED. One that stays green under a mutation aimed straight at it is either
 * asserting something else or asserting nothing — and that is the finding, not a nuisance.
 *
 * ⚠️ THE INJECTION IS CSS AND DOM, NOT A SOURCE EDIT, DELIBERATELY. A rebuild per mutation costs a
 * minute each and tempts you to run fewer; a stylesheet costs nothing and can break borders, fills,
 * sizes, gaps, animation, visibility and overflow — which is most of what these suites read. What
 * it CANNOT reach is behaviour: ordering, focus, what a click does. Those are marked `sourceOnly`
 * so the report can say plainly which assertions were proved by measurement and which were not.
 *
 *   SA_MUTATE=hairline-last npx playwright test tests/e2e/steerRound.measure.ts
 *   node tests/e2e/proveReds.mjs                        # the whole catalogue, both suites
 */
import type { Page } from "@playwright/test";

export interface Mutation {
  /** which assertions must go RED — SUITE-QUALIFIED, because both suites have a `P2.1` */
  targets: string[];
  /** a stylesheet injected into the page before anything is measured */
  css?: string;
  /** a script run on every navigation, before the app boots */
  script?: string;
  /** stated when no CSS or DOM change can reach the behaviour this guards */
  sourceOnly?: string;
}

export const MUTATIONS: Record<string, Mutation> = {
  /* ── steer round ──────────────────────────────────────────────────────────────────────── */
  "square-gone": {
    targets: ["steer:P2.1", "steer:P2.2", "steer:P2.5"],
    css: ".tpn .q.open .sqm { visibility: hidden !important; }",
  },
  "square-everywhere": {
    targets: ["steer:P2.1", "steer:P2.3", "steer:P2.4"],
    css: ".tpn .q .sqm { visibility: visible !important; }",
  },
  "square-still": {
    targets: ["steer:P2.2"],
    css: ".tpn .q .sqm { animation: none !important; }",
  },
  "hairline-last": {
    targets: ["steer:P4.4"],
    css: ".tpn .q:not(:has(~ .q)) { border-bottom: 1px solid #000 !important; }",
  },
  "hairline-none": {
    targets: ["steer:P4.4"],
    css: ".tpn .form .q { border-bottom: 0 !important; }",
  },
  "paper-tinted": {
    targets: ["steer:P4.2"],
    css: ".tpn .fc.work .q .head { background: rgb(0, 128, 0) !important; }",
  },
  "expectations-box": {
    targets: ["steer:P4.3"],
    css: ".tpn #s-expect, .tpn #s-remind { border: 2px solid #333 !important; border-radius: 9px !important; background: rgb(200, 200, 200) !important; }",
  },
  "hint-gone": {
    targets: ["steer:P4.5"],
    css: ".tpn .q .hint { display: none !important; }",
  },
  "count-gone": {
    targets: ["steer:P5.1", "steer:P5.5"],
    css: ".tpn .actbar .count { display: none !important; }",
  },
  "bulk-disabled": {
    targets: ["steer:P5.3"],
    script: `(() => {
      const fix = () => document.querySelectorAll(".tpn .actbar .ab.go").forEach((b) => {
        if (/Log 0 queries/.test(b.textContent || "")) b.disabled = true;
      });
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
  "bar-truncates": {
    targets: ["steer:P5.6"],
    css: ".tpn .actbar .miss, .tpn .actbar .willrec { max-width: 40px !important; overflow: hidden !important; white-space: nowrap !important; }",
  },
  "pill-collapses": {
    targets: ["steer:P3.1"],
    css: ".tpn .upill.on { height: 90px !important; }",
  },

  /* ── finishing round ──────────────────────────────────────────────────────────────────── */
  "rim-shows": {
    targets: ["finish:P1.3"],
    css: ".tpn .rim { overflow: visible !important; }",
  },
  "pane-opaque": {
    targets: ["finish:P1.2"],
    css: ".tpn .pane { background: rgb(10, 20, 30) !important; gap: 30px !important; }",
  },
  "second-scroller": {
    targets: ["finish:P1.4"],
    css: ".tpn .fc.rec .recscroll { overflow-y: scroll !important; max-height: 40px !important; }",
  },
  "card-min-height": {
    targets: ["finish:P2.2"],
    css: ".tpn .fc.work, .tpn .fc.rec { min-height: 500px !important; }",
  },
  "bar-floats-up": {
    targets: ["finish:P2.4"],
    css: ".tpn .actbar { margin-bottom: 80px !important; }",
  },
  "option-preselected": {
    targets: ["finish:P3.1"],
    script: `(() => {
      const fix = () => {
        const b = document.querySelector(".tpn .form .seg button");
        if (b && !b.classList.contains("on")) b.classList.add("on");
      };
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
  "asterisk-required": {
    targets: ["finish:P4.2"],
    script: `(() => {
      const fix = () => document.querySelectorAll(".tpn .form .ql").forEach((l) => {
        if (!/\\*/.test(l.textContent || "")) l.textContent = (l.textContent || "") + " *";
      });
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
  "addlinks-gone": {
    targets: ["finish:P4.3"],
    css: ".tpn .addrow .addlink { display: none !important; }",
  },
  "notebody-small": {
    targets: ["finish:P5.3"],
    css: ".tpn .notebody { font-size: 12px !important; font-family: Arial !important; }",
    sourceOnly: "the note journey has no card on the account, so this cannot be exercised either way",
  },
  "bulk-rows-gone": {
    targets: ["finish:P6.1", "finish:P6.3"],
    css: ".tpn .bulkrow:nth-child(n+2) { display: none !important; }",
  },
  "bulk-dismiss-gone": {
    targets: ["finish:P6.6"],
    css: ".tpn .actbar .ab.quiet { display: none !important; }",
  },
  /* ── added after the first walk, to cover cases nothing was aimed at ─────────────────────── */
  "steer-pinned": {
    targets: ["steer:P2.5"],
    script: `(() => {
      const fix = () => {
        const rows = [...document.querySelectorAll(".tpn .form .q")];
        if (!rows.length) return;
        rows.forEach((r, i) => { if (i === 0) r.classList.add("open"); else r.classList.remove("open"); });
      };
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
  "unit-unseeded": {
    targets: ["steer:P3.2"],
    script: `(() => {
      const fix = () => document.querySelectorAll(".tpn .upill.on .qty input").forEach((i) => {
        if (i.value !== "") { i.value = ""; }
      });
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
  "form-emptied": {
    targets: ["steer:P4.1"],
    css: ".tpn .fc.work .form > * { display: none !important; }",
  },
  "rec-card-gone": {
    targets: ["finish:P1.1"],
    css: ".tpn .fc.rec { display: none !important; }",
  },
  "scroller-overflows-card": {
    targets: ["finish:P2.1"],
    css: ".tpn .workscroll { min-height: 900px !important; }",
  },
  "strip-prefilled": {
    targets: ["finish:P3.2"],
    script: `(() => {
      const fix = () => document.querySelectorAll(".tpn .willrec").forEach((w) => {
        if (!/PREFILLED/.test(w.textContent || "")) {
          const s = document.createElement("span");
          s.textContent = "PREFILLED today 3 chapters";
          w.appendChild(s);
        }
      });
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
  "primary-renamed": {
    targets: ["finish:P4.1"],
    script: `(() => {
      const fix = () => document.querySelectorAll(".tpn .actbar .ab.go .t").forEach((t) => {
        if (t.textContent !== "Submit") t.textContent = "Submit";
      });
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
  "primaries-disabled": {
    targets: ["finish:P4.4", "finish:P4.5"],
    script: `(() => {
      const fix = () => document.querySelectorAll(".tpn .actbar .ab.go").forEach((b) => { b.disabled = true; });
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
  "bulk-columns-renamed": {
    targets: ["finish:P6.2"],
    script: `(() => {
      const fix = () => document.querySelectorAll(".tpn .bulk th").forEach((h) => {
        if (h.textContent !== "Col") h.textContent = "Col";
      });
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
  "bulk-deed-generic": {
    targets: ["finish:P6.5"],
    script: `(() => {
      const fix = () => document.querySelectorAll(".tpn .deed").forEach((d) => {
        if (/imported quer/.test(d.textContent || "")) d.textContent = "A gap on the record for this query";
      });
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
  "bulk-actions-reworded": {
    targets: ["finish:P6.4"],
    script: `(() => {
      const fix = () => document.querySelectorAll(".tpn .fillrow button, .tpn .fb").forEach((b) => {
        if (b.textContent !== "Fill") b.textContent = "Fill";
      });
      new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
    })()`,
  },
};

/** apply a named mutation to the page, before anything is measured */
export async function applyMutation(page: Page, name: string): Promise<void> {
  const m = MUTATIONS[name];
  if (!m) throw new Error(`unknown mutation "${name}" — see MUTATIONS in tests/e2e/mutate.ts`);
  if (m.script) await page.addInitScript(m.script);
  if (m.css) {
    /* ⚠️ ON EVERY NAVIGATION, not once. These suites reload `/todo` several times, and a stylesheet
       added to one document is gone from the next — a mutation that quietly stopped applying would
       report every targeted assertion as unbreakable, which is the opposite of the truth. */
    await page.addInitScript(`(() => {
      const add = () => {
        if (document.getElementById("sa-mutate")) return;
        const s = document.createElement("style");
        s.id = "sa-mutate";
        s.textContent = ${JSON.stringify(m.css)};
        (document.head || document.documentElement).appendChild(s);
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
      else add();
      new MutationObserver(add).observe(document.documentElement, { childList: true, subtree: true });
    })()`);
  }
}

/** the hook every mutable suite calls right after signing in */
export async function maybeMutate(page: Page): Promise<string> {
  const name = process.env.SA_MUTATE ?? "";
  if (name) await applyMutation(page, name);
  return name;
}
