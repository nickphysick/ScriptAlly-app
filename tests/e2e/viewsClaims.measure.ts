import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { gotoTodo, selectTodoView, assertCount } from "./todoOpen";
import { openContractView, readBox } from "./views";
import { writeFileSync, rmSync } from "node:fs";
test.setTimeout(900_000);

/**
 * THE THREE VIEWS' OWN CLAIMS — the things the diff cannot state.
 *
 * The diff says "this element's declared properties and its place match the contract". These are
 * the claims about DERIVATION and about ABSENCE: that a tint comes from the ladder rather than
 * from a literal, that two tinted regions come from two different functions, that an element the
 * design deleted is gone from the DOM rather than hidden. No property comparison can see any of
 * those.
 *
 * ⚠️ NO BACKTICKS AND NO REGEX INSIDE ANY page.evaluate TEMPLATE.
 */
type R = { id: string; ok: boolean; note: string };
/* ⚠️ THE LAST RECORDED COUNT, NOT A ROUND NUMBER BELOW IT — a floor set under the real figure is a
   guard that cannot fire, and the suite could measure half of itself and still clear it. */
const FLOOR = 10;

test("the three views' own claims", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT = "run-artifacts/views-claims.txt";
  rmSync(OUT, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoTodo(page, "grid");

  /* ── the grid ─────────────────────────────────────────────────────────────────────────────── */

  /* ⚠️ TWO TINTED REGIONS, FROM TWO DIFFERENT DERIVATIONS. The edge is the QUERY's status through
     the Query Centre's own ladder; the tag is the TASK's family. A card painting both from one
     source would say one thing twice and go on agreeing with itself while it drifted. */
  const tints = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".tkt-grid .tkt")]
      .find((e) => e.getBoundingClientRect().height > 0);
    if (!card) return null;
    /* ⚠️ THE STATUS MARK'S OWN INTERNALS ARE EXCLUDED, ON BOTH PAGES. This app draws the real
       `StatusDot`, which is a standing law, and that component paints an absolutely-positioned
       disc inside itself; the contract inlines an SVG, whose `fill` is not a `background-color`.
       So the app reported a fourth painted region and the ref three, over a difference in how one
       mark is drawn rather than in what the card paints. The claim is about the CARD's regions. */
    const painted = [...card.querySelectorAll("*")].filter((e) => {
      if (e.closest(".qs")) return false;
      const bg = getComputedStyle(e).backgroundColor;
      return bg !== "rgba(0, 0, 0, 0)" && bg !== "rgb(255, 255, 255)";
    }).map((e) => String((e as HTMLElement).className || "").split(" ")[0]);
    const edge = card.querySelector(".edge") as HTMLElement | null;
    const tag = card.querySelector(".tag") as HTMLElement | null;
    return {
      painted,
      edgeInline: edge ? edge.getAttribute("style") || "" : "",
      edgeBg: edge ? getComputedStyle(edge).backgroundColor : "",
      tagBg: tag ? getComputedStyle(tag).backgroundColor : "",
      tagClass: tag ? String(tag.className) : "",
    };
  });
  expect(tints, "no visible ticket in the grid").not.toBeNull();
  const t = tints!;
  /* ⚠️ THE BRIEF SAID "EXACTLY TWO TINTED REGIONS" AND THE CONTRACT PAINTS FOUR. Rendered, its own
     card fills `.edge`, `.tag`, the avatar disc `.av` and the status dot's own circle — the last
     two being MARKS rather than regions, and both painted identically in this app. So the claim
     that can be made is the one the design actually asserts: the app paints the same set of things
     the contract paints, no more. Compared against the ref rather than against a number, which is
     also what stops it going green the day the ref gains a fifth. */
  const cpaint = await (async () => {
    const cp = await page.context().newPage();
    await cp.setViewportSize({ width: 1440, height: 900 });
    await openContractView(cp, "grid");
    const v = await cp.evaluate(() => {
      const card = [...document.querySelectorAll(".card")].find((e) => e.getBoundingClientRect().height > 0);
      if (!card) return [];
      return [...card.querySelectorAll("*")].filter((e) => {
        if (e.closest(".qs")) return false;
        const bg = getComputedStyle(e).backgroundColor;
        return bg !== "rgba(0, 0, 0, 0)" && bg !== "rgb(255, 255, 255)";
      }).map((e) => String((e as HTMLElement).className || "").split(" ")[0]).sort();
    });
    await cp.close();
    return v;
  })();
  add("G1 · the ticket paints the same set of regions the contract paints — the edge and the tag by name",
    JSON.stringify([...t.painted].sort()) === JSON.stringify(cpaint)
      && t.painted.includes("edge") && t.painted.includes("tag"),
    "dev " + JSON.stringify([...t.painted].sort()) + " · contract " + JSON.stringify(cpaint));
  add("G2 · and they are different colours, from different derivations",
    !!t.edgeBg && !!t.tagBg && t.edgeBg !== t.tagBg,
    "edge " + t.edgeBg + " · tag " + t.tagBg + " (" + t.tagClass + ")");

  /* ⚠️ THE EDGE IS THE LADDER'S VALUE, DERIVED — asserted as an identity against the app's own
     `STATE_TOKEN`, never against a hex typed here. A literal on both sides is a test that agrees
     with itself and goes green the day someone edits the app and the check together. */
  const ladder = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".tkt-grid .tkt")]
      .find((e) => e.getBoundingClientRect().height > 0);
    const edge = card?.querySelector(".edge") as HTMLElement | null;
    if (!edge) return null;
    const inline = edge.getAttribute("style") || "";
    const i = inline.indexOf("var(");
    const tok = i < 0 ? "" : inline.slice(i + 4, inline.indexOf(")", i));
    return { tok, resolved: tok ? getComputedStyle(edge).getPropertyValue(tok).trim() : "",
      painted: getComputedStyle(edge).backgroundColor };
  });
  const rgbOf = (hex: string) => {
    const h = hex.replace("#", "").trim();
    if (h.length !== 6) return "";
    return "rgb(" + [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ") + ")";
  };
  /* ⚠️ `--state-`, NOT `--stage-`. The drawer's index-card header reads the Query Centre's STAGE
     ladder; the ticket's edge reads its STATE ladder (`STATE_TOKEN[stateFor(status)]`). Two ladders,
     two prefixes, and the first form of this check carried the drawer's — reporting "not derived"
     about an edge that was correctly resolving `--state-offer`. */
  add("G3 · the ticket's edge IS a ladder token, resolved — never a stored colour",
    !!ladder && ladder.tok.startsWith("--state-") && rgbOf(ladder.resolved) === ladder.painted,
    (ladder?.tok || "no var()") + " resolves " + (ladder?.resolved || "—") + " · painted " + (ladder?.painted || "—"));

  /* ⚠️ A STATUS IS NEVER A FILL ON A CARD. It is a dot and a word in ink; the fills belong to the
     family and to the query's stage edge. */
  const statusFill = await page.evaluate(() => {
    const qs = [...document.querySelectorAll(".tkt-grid .tkt .qs")]
      .find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    if (!qs) return null;
    const cs = getComputedStyle(qs);
    return { bg: cs.backgroundColor, text: (qs.textContent || "").trim(), dots: qs.querySelectorAll("svg").length };
  });
  add("G4 · the status is a dot and its WORD, in ink — never a fill",
    !!statusFill && statusFill.bg === "rgba(0, 0, 0, 0)" && statusFill.dots > 0 && statusFill.text.length > 2,
    "bg " + (statusFill?.bg || "—") + " · " + (statusFill?.dots || 0) + " dot · word " + JSON.stringify(statusFill?.text || ""));

  /* ⚠️ THE CARD'S HEIGHT IS COMPARED AGAINST THE CONTRACT AT THE SAME VIEWPORT, not pinned. A
     literal would go green the day the contract's own card changed. */
  const cpage = await page.context().newPage();
  await cpage.setViewportSize({ width: 1440, height: 900 });
  await openContractView(cpage, "grid");
  const cCard = await readBox(cpage, ".card", []);
  const aCard = await readBox(page, ".tkt-grid .tkt", []);
  add("G5 · the ticket's height is the contract's, within 1px",
    !!cCard.rel && !!aCard.rel && Math.abs(cCard.rel.h - aCard.rel.h) <= 1,
    "contract " + cCard.rel?.h + " · dev " + aCard.rel?.h);

  /* the two dashed rules the contract draws inside the card, and an unresolved token had silenced */
  const dashed = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".tkt-grid .tkt")]
      .find((e) => e.getBoundingClientRect().height > 0);
    if (!card) return null;
    return ["facts", "tfoot"].map((c) => {
      const el = card.querySelector("." + c);
      if (!el) return c + ":absent";
      const cs = getComputedStyle(el);
      return c + ":" + cs.borderTopWidth + " " + cs.borderTopStyle;
    });
  });
  add("G6 · the facts and the foot each sit on a dashed rule that actually paints",
    !!dashed && dashed.every((d) => d.includes("1px dashed")),
    JSON.stringify(dashed));

  /* ── the list ─────────────────────────────────────────────────────────────────────────────── */
  await selectTodoView(page, "list");
  await page.waitForTimeout(500);

  /* ⚠️ THE GROUP HEAD IS WHITE, WITH NO BAND AND NO DISC. The brief asked for exactly three
     children and this app's head has four: it is a DISCLOSURE — the tightened round made it
     collapse its section — and the contract's is not, so the ref has nothing to say about the
     chevron. Named here rather than dropped: removing a working control to satisfy a drawing that
     never had one would be a functional loss wearing a port's clothes. */
  const head = await page.evaluate(() => {
    const g = [...document.querySelectorAll(".tlc .grp")].find((e) => e.getBoundingClientRect().height > 0);
    if (!g) return null;
    const cs = getComputedStyle(g);
    return {
      bg: cs.backgroundColor,
      kids: [...g.children].map((e) => String((e as HTMLElement).className)),
      afterW: Number.parseFloat(getComputedStyle(g, "::after").width || "0"),
      lbl: getComputedStyle(g.querySelector(".g-lbl") as Element).fontFamily,
      n: getComputedStyle(g.querySelector(".g-n") as Element).borderTopWidth,
      dots: g.querySelectorAll(".g-dot").length,
    };
  });
  expect(head, "no visible group head").not.toBeNull();
  const h = head!;
  add("L1 · the group head is white, with no disc — the name, a bordered count, one hairline",
    h.bg === "rgb(255, 255, 255)" && h.dots === 0 && h.kids.length === 3
      && h.lbl.includes("Playfair") && h.n === "1px" && h.afterW > 100,
    "bg " + h.bg + " · children " + JSON.stringify(h.kids) + " · dots " + h.dots
    + " · name " + h.lbl + " · count border " + h.n + " · rule " + Math.round(h.afterW) + "px");

  /* ⚠️ THE VERB IS THE ONE THE CONTRACT GIVES FOR THAT TASK TYPE — asserted by reading the ref's
     own `act` expression and the app's rendered rows together, never against a list typed here. */
  const verbs = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".tlc .row")].slice(0, 40);
    return rows.map((r) => ({
      cat: (r.querySelector(".ltask .k")?.textContent || "").trim(),
      verb: (r.querySelector(".lact .go")?.textContent || "").trim(),
    })).filter((x) => x.verb);
  });
  const REF_VERBS = ["Mark sent", "Log a nudge", "Close it", "Decide", "Fill it in", "Tick it off"];
  /* ⚠️ THE VERB IS A FUNCTION OF THE BUCKET, NOT OF THE CATEGORY — and the first form of this
     asserted the second, which is false by design. `category` partitions by where the work came
     from (the tiles, the columns and the tag all speak it); `bucket` partitions by the shape of the
     act. An offer is a `decide` under one and an "Agent request" under the other, so that tag
     legitimately draws both `Decide` and `Mark sent`, and "Gone quiet" draws both `Log a nudge` and
     `Close it`. The app records that split in its own words and the check had walked straight into
     it. What is asserted here is that every verb is one the contract prints and that the column is
     genuinely contextual; that it is a pure function of the bucket is `listCells.test.ts`'s claim,
     where the bucket is in hand rather than inferred from a tag. */
  add("L2 · every row's verb is one the contract prints, and the column is genuinely contextual",
    verbs.length > 3 && verbs.every((v) => REF_VERBS.includes(v.verb))
      && new Set(verbs.map((v) => v.verb)).size >= 4,
    verbs.length + " rows · " + new Set(verbs.map((v) => v.verb)).size + " distinct verbs · "
    + JSON.stringify([...new Set(verbs.map((v) => v.cat + " → " + v.verb))]));

  /* the row's six tracks, and the status edge that is derived like the ticket's */
  const rowShape = await page.evaluate(() => {
    const r = [...document.querySelectorAll(".tlc .row")].find((e) => e.getBoundingClientRect().height > 0);
    if (!r) return null;
    const edge = r.querySelector(".ledge") as HTMLElement | null;
    const inline = edge ? edge.getAttribute("style") || "" : "";
    const i = inline.indexOf("var(");
    const tok = i < 0 ? "" : inline.slice(i + 4, inline.indexOf(")", i));
    return {
      cols: getComputedStyle(r).gridTemplateColumns.split(" ").length,
      cells: ["ltask", "lag", "lchip", "lstands", "lact"].filter((c) => r.querySelector("." + c)),
      tok, painted: edge ? getComputedStyle(edge).backgroundColor : "",
      resolved: tok && edge ? getComputedStyle(edge).getPropertyValue(tok).trim() : "",
      edgeW: edge ? Math.round(edge.getBoundingClientRect().width) : -1,
    };
  });
  expect(rowShape, "no visible row").not.toBeNull();
  const rs = rowShape!;
  add("L3 · six tracks, five named cells, and a 5px status edge",
    rs.cols === 6 && rs.cells.length === 5 && rs.edgeW === 5,
    rs.cols + " tracks · cells " + JSON.stringify(rs.cells) + " · edge " + rs.edgeW + "px");
  add("L4 · the row's edge IS a ladder token, resolved — the same derivation as the ticket's",
    rs.tok.startsWith("--state-") && rgbOf(rs.resolved) === rs.painted,
    (rs.tok || "no var()") + " resolves " + (rs.resolved || "—") + " · painted " + rs.painted);

  await cpage.close();

  const lines = out.map((r) => (r.ok ? "PASS " : "FAIL ") + r.id + "\n        " + r.note);
  const red = out.filter((r) => !r.ok);
  writeFileSync(OUT, lines.join("\n") + "\n\n" + (out.length - red.length) + "/" + out.length + "\n");
  assertCount(out.length, FLOOR, "viewsClaims");
  console.log("\nVIEW CLAIMS — " + (out.length - red.length) + "/" + out.length + "\n" + lines.join("\n") + "\n");
  expect(red.map((r) => r.id + " — " + r.note), "the views do not make the claims the contract does").toEqual([]);
});
