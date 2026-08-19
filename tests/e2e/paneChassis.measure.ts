/**
 * THE TASK PANE CHASSIS — §4's fifteen assertions, measured on a real page.
 *
 * ⚠️ IT COLLECTS RATHER THAN THROWS. One run must give the whole red picture, not the first
 * failure; the suite asserts at the end so every assertion has a recorded verdict either way.
 *
 * ⚠️ EVERY PROBE IS SCOPED TO THE VISIBLE PANE. Seven other pages stay mounted, and a child of a
 * hidden ancestor still computes `display: block` — that produced six phantom failures earlier in
 * this project. `offsetParent === null` is the test that separates them.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const RIM_BORDER = "rgba(124, 58, 42, 0.28)";

/** Cards reachable on the harness account, by the deed their row states. */
const JOURNEYS: { key: string; row: RegExp; enters: boolean }[] = [
  { key: "close",  row: /^Log the close/,                          enters: true  },
  { key: "send",   row: /^Send your full/,                         enters: true  },
  { key: "decide", row: /^Answer the offer/,                       enters: true  },
  { key: "note",   row: /^Nudge /,                                 enters: true  },
  { key: "bulk",   row: /queries have no record of what you sent/, enters: false },
];

test("pane chassis", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);

  for (const j of JOURNEYS) {
    await page.goto("/todo");
    await page.waitForTimeout(7000);
    const picked = await page.evaluate((src) => {
      const rx = new RegExp(src);
      const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
      const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
        .find((r) => rx.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
      if (row) (row as HTMLElement).click();
      return !!row;
    }, j.row.source);
    if (!picked) { add(j.key + ":reachable", false, "no such card on this account"); continue; }
    const deed = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
      const sel = [...document.querySelectorAll(".tdg-row")].filter(vis)
        .find((r) => r.classList.contains("sel") || r.getAttribute("aria-current") === "true");
      return (sel?.querySelector(".tdg-t")?.textContent ?? "").trim();
    });
    await page.waitForTimeout(1500);

    if (j.enters) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll("[class*='tdk-'] button")]
          .find((x) => /^(Record|Action|Close|Send|Mark|Log)/.test((x.textContent ?? "").trim()));
        (b as HTMLElement | undefined)?.click();
      });
      await page.waitForTimeout(1400);
    }

    const m = await page.evaluate(() => {
      const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
      const pane = [...document.querySelectorAll(".tdk-w")].find(vis) as HTMLElement | undefined;
      if (!pane) return null;
      const cs = (e: Element) => getComputedStyle(e as HTMLElement);
      const band = pane.querySelector(".tdk-band") as HTMLElement | null;
      const txt = pane.innerText || "";

      const headingEl = band?.querySelector(".tdk-deed, .tdk-name") as HTMLElement | null;
      const heading = (headingEl?.textContent ?? "").trim();
      const agency = (band?.querySelector(".tdk-agency")?.textContent ?? "").trim();

      const rim = pane.querySelector(".tdk-rim, .rim") as HTMLElement | null;
      const card = (rim?.parentElement ?? pane.querySelector(".tdk-card")) as HTMLElement | null;

      let corners: string[] = [];
      let flush = "";
      if (rim && band) {
        const r = rim.getBoundingClientRect();
        const b = band.getBoundingClientRect();
        /* ⚠️ THE ANTI-SPILL CLAIM IS FLUSHNESS, and it is measured directly: the band's edges sit on
           the rim's 1px border on all three sides. A spill is a GAP, and a gap is a number. */
        flush = [Math.round(b.top - r.top), Math.round(b.left - r.left), Math.round(r.right - b.right)].join(",");
        /* ⚠️ INSET 4, NOT 2 — AND THAT IS GEOMETRY, NOT TOLERANCE. The rim's radius is 9px, so the
           rounded corner's diagonal boundary is 0.293 × 9 ≈ 2.6px in; a point 2px from the corner is
           OUTSIDE the shape and `elementFromPoint` correctly returns what is behind it. My first
           version sampled there and reported a spill on a pane that has none — measured: inset 2
           gives [rim, card, band, band] while 4, 6 and 12 all give four bands. */
        const INSET = 4;
        const bh = b.height;
        const pts: [number, number][] = [
          [r.left + INSET, r.top + INSET], [r.right - INSET, r.top + INSET],
          [r.left + INSET, r.top + Math.min(r.height, bh) - INSET],
          [r.right - INSET, r.top + Math.min(r.height, bh) - INSET],
        ];
        corners = pts.map(([x, y]) => {
          const el = document.elementFromPoint(x, y);
          if (!el) return "OFFSCREEN";
          return band.contains(el) || el === band ? "band" : (el.className || el.tagName).toString().slice(0, 24);
        });
      }

      const clipped = [...pane.querySelectorAll("*")].filter((e) => {
        const el = e as HTMLElement;
        if (!vis(el) || el.children.length) return false;
        return cs(el).textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1;
      }).map((e) => (e.textContent ?? "").trim().slice(0, 40));

      const tiles = [...pane.querySelectorAll(".tdk-tile, .tdk-tstat")].filter(vis);

      return {
        heading, agency,
        monograms: pane.querySelectorAll(".tdk-av").length,
        gendered: /\b(his|her|hers)\b/i.test(txt),
        rim: rim ? { overflow: cs(rim).overflow, borderTop: cs(rim).borderTopColor } : null,
        cardBg: card ? cs(card).backgroundColor : null,
        corners,
        flush,
        bandImage: band ? cs(band).backgroundImage : null,
        bandPill: !!band?.querySelector("[class*='bpill']"),
        tiles: tiles.length,
        tileLabels: tiles.map((t) => (t.querySelector("[class*='lab'], [class*='k']")?.textContent ?? "").trim()),
        statRow: pane.querySelectorAll(".tdk-tstats").length,
        story: pane.querySelectorAll(".tdk-story").length,
        storyInsideForm: !!pane.querySelector(".pj-body .tdk-story, .tdk-form .tdk-story"),
        clipped,
        summary: (pane.querySelector(".pj-sum, .tdk-sum")?.textContent ?? "").trim().slice(0, 90),
        hint: (pane.querySelector(".pj-hint, .tdk-hint")?.textContent ?? "").trim(),
        gridKids: (() => {
          const story = pane.querySelector(".tdk-story");
          /* the journey's own column — , a real box because PaneJourney returns a fragment */
          const form = pane.querySelector(".tdk-jform");
          if (!story || !form) return "story=" + !!story + " form=" + !!form;
          return story.parentElement === form.parentElement ? "same-parent" : "different-parents";
        })(),
      };
    });

    if (!m) { add(j.key + ":pane", false, "no visible pane"); continue; }

    const P = (n: number, id: string) => "A" + n + " " + j.key + " · " + id;
    /* ⚠️ IT MUST *BE* THE DEED. The first version only checked the heading was not the agency, and
       an agent's NAME satisfies that — it passed on the very build it was written to fail. */
    add(P(1, "heading IS the deed, and is not the agency"),
        !!m.heading && !!deed && m.heading === deed && (!m.agency || m.heading !== m.agency),
        "heading=" + JSON.stringify(m.heading) + " deed=" + JSON.stringify(deed) + " agency=" + JSON.stringify(m.agency));
    add(P(2, "no monogram in the pane"), m.monograms === 0, "count=" + m.monograms);
    add(P(3, "no gendered pronoun"), !m.gendered, m.gendered ? "found" : "clean");
    add(P(4, "rim: overflow hidden + burgundy top border"),
        !!m.rim && m.rim.overflow === "hidden" && m.rim.borderTop === RIM_BORDER,
        m.rim ? "overflow=" + m.rim.overflow + " borderTop=" + m.rim.borderTop : "no rim element");
    add(P(5, "card background is pure white"), m.cardBg === "rgb(255, 255, 255)", "bg=" + m.cardBg);
    add(P(6, "band fills the rim — flush on three edges, all four corners"),
        m.corners.length === 4 && m.corners.every((c) => c === "band") && m.flush === "1,1,1",
        "corners=" + JSON.stringify(m.corners) + " gaps(top,left,right)=" + m.flush);
    /* ⚠️ THE GROUP'S OWN TWO STOPS, not "a gradient" — the weak form passed on the pre-change build
       because the band already had one. §2's table, per group. */
    const STOPS: Record<string, [string, string]> = {
      urgent:       ["rgb(243, 224, 214)", "rgb(238, 215, 202)"],
      housekeeping: ["rgb(215, 221, 213)", "rgb(213, 219, 211)"],
      yours:        ["rgb(247, 240, 226)", "rgb(242, 233, 214)"],
    };
    const GROUP_OF: Record<string, string> = {
      close: "housekeeping", bulk: "housekeeping", note: "yours", send: "urgent", decide: "urgent",
    };
    const grp = GROUP_OF[j.key];
    const stops = STOPS[grp];
    /* ⚠️ THE OFFER KEEPS ITS OWN PAPER — a celebration, not a group — so `decide` is exempted from
       the stop check and asserted only to carry a gradient of its own. */
    if (j.key === "decide") {
      add(P(7, "the offer keeps its own paper"), !!m.bandImage && m.bandImage.includes("gradient"),
          (m.bandImage ?? "").slice(0, 80));
    } else {
      add(P(7, "band carries " + grp + "'s two stops"),
          !!m.bandImage && stops.every((c) => (m.bandImage ?? "").includes(c)),
          "want=" + JSON.stringify(stops) + " got=" + (m.bandImage ?? "").slice(0, 90));
    }
    add(P(8, "no bucket pill in the band"), !m.bandPill, m.bandPill ? "pill present" : "none");
    /* ⚠️ "not nested" is satisfied by "absent". Where a timeline is REQUIRED, it must exist and
       share the form's parent; where it is not, this assertion does not apply. */
    if (["close", "send", "decide"].includes(j.key)) {
      add(P(12, "timeline is a SIBLING of the form, both in one grid"),
          !m.storyInsideForm && m.gridKids === "same-parent", m.gridKids);
    }
    add(P(15, "nothing ellipsised"), m.clipped.length === 0, JSON.stringify(m.clipped));

    const wantsTiles = ["close", "send", "decide"].includes(j.key);
    add(P(9, "tiles " + (wantsTiles ? ">0" : "==0")),
        wantsTiles ? m.tiles > 0 : m.tiles === 0, "tiles=" + m.tiles + " statRow=" + m.statRow);
    if (wantsTiles) {
      /* ⚠️ THE POSITIVE HALF MATTERS. "no tile reads X" is satisfied by having no tiles at all —
         vacuous on today's build, which has none. Require "Sent previously" to be among them. */
      /* ⚠️ §4 SCOPES THE POSITIVE HALF TO A SEND — "a Send task's tile set includes 'Sent
         previously'". A close has nothing previously sent to state, so requiring it there was my
         over-application, not a gap. The NEGATIVE half applies everywhere. */
      const needsSentPreviously = j.key === "send";
      add(P(10, needsSentPreviously
            ? "tiles include 'Sent previously' and none reads 'what they want'"
            : "no tile reads 'what they want'"),
          (!needsSentPreviously || m.tileLabels.some((l) => /sent previously/i.test(l)))
            && !m.tileLabels.some((l) => /what they want/i.test(l)),
          JSON.stringify(m.tileLabels));
    }
    const wantsStory = ["close", "send", "decide"].includes(j.key);
    add(P(13, "timeline " + (wantsStory ? "present" : "absent")),
        wantsStory ? m.story > 0 : m.story === 0, "story=" + m.story);
    /* ⚠️ THIS WAS STUBBED `true` — not an assertion at all. The foot hint must be this journey's
       own or empty, never another journey's. The send's hint on a note is the fault being hunted. */
    const FOREIGN: Record<string, RegExp> = {
      note:   /Nothing is sent from here/i,
      bulk:   /Nothing is sent from here/i,
      close:  /Nothing is sent from here|Struck through on Today/i,
      decide: /Struck through on Today/i,
    };
    const foreign = FOREIGN[j.key];
    add(P(14, "foot hint is this journey's own, never another's"),
        !foreign || !foreign.test(m.hint), "hint=" + JSON.stringify(m.hint));
  }

  const red = out.filter((r) => !r.ok);
  const lines = ["── pane chassis · " + out.length + " assertions · " + red.length + " RED · " + (out.length - red.length) + " green"];
  for (const r of out) lines.push("  " + (r.ok ? "green" : "RED  ") + "  " + r.id + "\n           " + r.note);
  lines.push("  page errors: " + errs.length);
  const report = lines.join("\n");
  writeFileSync(process.env.SA_CHASSIS_OUT ?? "run-artifacts/pane-chassis.txt", report);
  console.log("\n" + report + "\n");
  expect(red, red.length + " assertions red").toHaveLength(0);
});
