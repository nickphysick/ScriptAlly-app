/**
 * THE CONTRACT — all fifteen difference rows, plus the eleven matches as REGRESSION GUARDS.
 *
 * ⚠️ THE GUARDS ARE NOT DECORATION. Eleven things already agreed with
 * `design-refs/todo-materials-contract.html` before this run. If one goes red during the
 * restructure it is a regression THIS RUN introduced, not a pre-existing gap — which is a
 * different thing and gets fixed rather than reported.
 *
 * ⚠️ D1 IS THE ONE THAT WAS SILENTLY GREEN ALL ALONG. "a .rim exists" passes today; the pane has
 * exactly one. It must assert THREE cards, each with its OWN rim, and the workrow a SIBLING of the
 * header card rather than a descendant.
 *
 * Collects rather than throws. Every probe scoped to the visible pane.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };

const RIM = "rgba(124, 58, 42, 0.28)";
const RIMLINE = "rgba(124, 58, 42, 0.13)";

/** journey → the contract's own DATA row: figure, tiles, timeline. */
const J: { key: string; row: RegExp; enters: boolean; grp: string; fig: boolean; tiles: boolean; tl: boolean }[] = [
  { key: "send",   row: /^Send your full/,                         enters: true,  grp: "urgent",       fig: true,  tiles: true,  tl: true },
  { key: "chase",  row: /^Chase your query/,                       enters: true,  grp: "urgent",       fig: true,  tiles: true,  tl: true },
  { key: "close",  row: /^Log the close/,                          enters: true,  grp: "housekeeping", fig: true,  tiles: true,  tl: true },
  { key: "fix1",   row: /^No record of what you sent/,             enters: true,  grp: "housekeeping", fig: false, tiles: false, tl: true },
  { key: "fixN",   row: /queries have no record of what you sent/, enters: false, grp: "housekeeping", fig: false, tiles: false, tl: false },
  { key: "note",   row: /^Nudge /,                                 enters: false, grp: "yours",        fig: true,  tiles: true,  tl: false },
];

test("contract", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);

  /* ── D7–D10 · fluid ground: read from the served stylesheet, not from source ─────────────── */
  const css = await page.evaluate(async () => {
    const link = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => (l as HTMLLinkElement).href);
    const inline = [...document.querySelectorAll("style")].map((s) => s.textContent ?? "").join("\n");
    const fetched = await Promise.all(link.map((h) => fetch(h).then((r) => r.text()).catch(() => "")));
    return inline + "\n" + fetched.join("\n");
  });
  /* ⚠️ COMMENTS STRIPPED FIRST. My own notes say the words "@container" and "tdk-jgrid" while
     explaining their removal, and an unstripped read matches the prose that documents the
     retirement — the source-lock fault this codebase has paid for repeatedly. */
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const paneRules = bare.split("}").filter((r) => /tdk-|tdw-|tdg-|pj-/.test(r)).join("}");
  add("D7/D8/D9/D10 · no @container anywhere in the pane's rules",
      !/@container/.test(paneRules),
      (paneRules.match(/@container[^{]*/g) ?? []).slice(0, 6).join(" | ") || "none");
  add("D7 · the rail is fluid, not a fixed px track",
      !/--tdw-rail-w:\s*\d+px/.test(bare),
      (css.match(/--tdw-rail-w:[^;]*/) ?? ["absent"])[0]);
  /* ⚠️ RE-POINTED, AND THE BRIEF'S OWN GRID IS WHY. `minmax(260px, 340px) minmax(0, 1fr)` is right
     wherever both tracks fit and produces a ZERO-WIDTH pane at 390, where the container is ~346:
     the first track takes 340 and the second resolves to nothing. A grid cannot wrap, and with no
     breakpoint left there is nothing to catch it — measured, pane w=0. The same two numbers as
     flex bases wrap instead, which is the brief's own closing rule: flex-wrap decides stacking. */
  add("D7 · the page is a wrapping row carrying the brief's two bases",
      /\.tdw-split\s*\{[^}]*flex-wrap:\s*wrap/.test(bare.replace(/\s+/g, " ").replace(/\{ /g, "{"))
        || /flex-wrap: wrap/.test((bare.match(/\.tdw-split \{[^}]*\}/) ?? [""])[0]),
      (bare.match(/\.tdw-split \{[^}]*\}/) ?? ["not found"])[0].replace(/\s+/g, " ").slice(0, 100));
  /* ⚠️ WHITESPACE-NORMALISED, because this reads the SERVED stylesheet and the production build
     MINIFIES it: `flex: 0 1 340px` ships as `flex:0 1 340px`. The spaced form passed locally on the
     dev server and failed on dev the moment it was deployed — a source-shape assertion read against
     a built artefact. Collapse the spacing first, then match. */
  const tight = bare.replace(/\s*([:;{}])\s*/g, "$1").replace(/\s+/g, " ");
  add("D7 · the list asks 340 and floors at 260; the pane asks 420",
      /\.tdw-split>\.tdw-rail\{[^}]*flex:0 1 340px[^}]*min-width:260px/.test(tight)
        && /\.tdw-split>\.tdw-work\{[^}]*flex:1 1 420px/.test(tight),
      (tight.match(/\.tdw-split>\.tdw-rail\{[^}]*\}/) ?? ["not found"])[0].slice(0, 90));
  add("D9 · tiles are repeat(auto-fit, minmax(150px, 1fr))",
      /repeat\(\s*auto-fit\s*,\s*minmax\(\s*150px\s*,\s*1fr\s*\)\s*\)/.test(bare.replace(/\s+/g, " ")),
      (css.replace(/\s+/g, " ").match(/\.tdk-tiles\s*\{[^}]*/) ?? ["not found"])[0].slice(0, 90));

  for (const j of J) {
    await page.goto("/todo");
    await page.waitForTimeout(6500);
    const picked = await page.evaluate((src) => {
      const rx = new RegExp(src);
      const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
      const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
        .find((r) => rx.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
      if (row) (row as HTMLElement).click();
      return !!row;
    }, j.row.source);
    if (!picked) { add(`${j.key} · reachable on this account`, false, "no card — journey not exercised"); continue; }
    await page.waitForTimeout(1400);
    if (j.enters) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll("[class*='tdk-'] button")]
          .find((x) => /^(Record|Action|Close|Send|Mark|Log|Chase)/.test((x.textContent ?? "").trim()));
        (b as HTMLElement | undefined)?.click();
      });
      await page.waitForTimeout(1400);
    }

    const m = await page.evaluate(({ RIM, RIMLINE }) => {
      const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
      const pane = [...document.querySelectorAll(".tdk-w")].find(vis) as HTMLElement | undefined;
      if (!pane) return null;
      const cs = (e: Element) => getComputedStyle(e as HTMLElement);
      const cards = [...pane.querySelectorAll(".tdk-fc")].filter(vis) as HTMLElement[];
      const rims = [...pane.querySelectorAll(".tdk-rim")].filter(vis) as HTMLElement[];
      const header = cards[0] ?? null;
      const workrow = pane.querySelector(".tdk-workrow") as HTMLElement | null;
      const band = pane.querySelector(".tdk-band") as HTMLElement | null;
      const col = pane.querySelector(".tdk-v") as HTMLElement | null;
      const tiles = [...pane.querySelectorAll(".tdk-tile")].filter(vis) as HTMLElement[];
      const fig = pane.querySelector(".tdk-bandfig") as HTMLElement | null;
      const story = pane.querySelector(".tdk-story--card") as HTMLElement | null;
      const act = pane.querySelector(".tdk-act") as HTMLElement | null;

      /* each card owns exactly one DIRECT rim child */
      const cardsWithOwnRim = cards.filter((c) => [...c.children].filter((k) => k.classList.contains("tdk-rim")).length === 1).length;

      return {
        cards: cards.length, rims: rims.length, cardsWithOwnRim,
        workrowIsSibling: !!(workrow && header && workrow.parentElement === header.parentElement),
        workrowInsideHeader: !!(workrow && header && header.contains(workrow)),
        headerHasBandAndTiles: !!(header && header.querySelector(".tdk-band")),
        actHasRim: !!(act && act.closest(".tdk-rim")),
        actPad: act ? cs(act).padding : "-",
        storyHasRim: !!(story && story.closest(".tdk-rim")),
        tlHeadBorder: (() => { const h = pane.querySelector(".tdk-storyhd") as HTMLElement | null; return h ? cs(h).borderBottomColor : "-"; })(),
        tlFootBorder: (() => { const f = pane.querySelector(".tdk-storyfoot") as HTMLElement | null; return f ? cs(f).borderTopColor : "-"; })(),
        colGroupClass: col ? (String(col.className).match(/u-(now|house|yours)/) ?? ["-"])[0] : "no .tdk-v",
        bandGroupClass: band ? (String(band.className).match(/g-(urgent|housekeeping|yours)/) ?? ["-"])[0] : "-",
        bandPad: band ? cs(band).padding : "-",
        bandNofig: !!band?.classList.contains("nofig"),
        bandImage: band ? cs(band).backgroundImage : "",
        bandAfterRule: band ? getComputedStyle(band, "::after").backgroundColor : "-",
        bandBorder: band ? cs(band).borderBottomColor : "-",
        deedSize: (() => { const d = pane.querySelector(".tdk-deed") as HTMLElement | null; return d ? cs(d).fontSize : "-"; })(),
        deedColor: (() => { const d = pane.querySelector(".tdk-deed") as HTMLElement | null; return d ? cs(d).color : "-"; })(),
        subColor: (() => { const s = pane.querySelector(".tdk-sub") as HTMLElement | null; return s ? cs(s).color : "-"; })(),
        figCount: fig ? 1 : 0,
        tiles: tiles.length,
        tilePad: tiles[0] ? cs(tiles[0]).padding : "-",
        tileKWeight: (() => { const k = pane.querySelector(".tdk-tilek") as HTMLElement | null; return k ? cs(k).fontWeight : "-"; })(),
        tileDivider: tiles[0] ? cs(tiles[0]).borderRightColor : "-",
        tileSub: !!pane.querySelector(".tdk-tilesub"),
        absentMono: (() => {
          const a = pane.querySelector(".tdk-tilenone") as HTMLElement | null;
          return a ? `${cs(a).fontSize}|${cs(a).textTransform}|${cs(a).color}` : "none-rendered";
        })(),
        rimOK: rims.every((r) => cs(r).overflow === "hidden" && cs(r).borderTopColor === RIM && cs(r).borderTopLeftRadius === "9px"),
        pill: !!band?.querySelector("[class*='bpill'], [class*='tdg-bpill']"),
        gendered: /\b(his|her|hers)\b/i.test(pane.innerText || ""),
        objectObject: /\[object /.test(pane.innerText || ""),
        tlHeadMono: (() => { const t = pane.querySelector(".tdk-storyk") as HTMLElement | null; return t ? `${cs(t).fontSize}|${cs(t).textTransform}` : "-"; })(),
        tlCount: !!pane.querySelector(".tdk-storyn"),
        tlLink: (() => { const l = pane.querySelector(".tdk-storylink") as HTMLElement | null; return l ? cs(l).color : "-"; })(),
        /* fluid: the timeline must not be a fixed px basis */
        storyW: story ? Math.round(story.getBoundingClientRect().width) : -1,
        formW: act ? Math.round(act.closest(".tdk-fc")!.getBoundingClientRect().width) : -1,
        sameTop: !!(act && story) && Math.round(act.closest(".tdk-fc")!.getBoundingClientRect().top) === Math.round(story.closest(".tdk-fc")!.getBoundingClientRect().top),
      };
    }, { RIM, RIMLINE });
    if (!m) { add(`${j.key} · pane visible`, false, "no pane"); continue; }

    const P = (id: string) => `${id} · ${j.key}`;
    const wantCards = 1 + 1 + (j.tl ? 1 : 0);

    /* ── D1 — the row that was silently green ── */
    add(P("D1 three cards, each with its OWN rim"),
        m.cards === wantCards && m.rims === wantCards && m.cardsWithOwnRim === wantCards,
        `cards=${m.cards} rims=${m.rims} ownRim=${m.cardsWithOwnRim} want=${wantCards}`);
    add(P("D2 workrow is a SIBLING of the header card, not a descendant"),
        m.workrowIsSibling && !m.workrowInsideHeader,
        `sibling=${m.workrowIsSibling} insideHeader=${m.workrowInsideHeader}`);
    add(P("D3 form sits in its own rim, with the contract's padding"),
        m.actHasRim && /21px 24px 22px/.test(m.actPad), `rim=${m.actHasRim} pad=${m.actPad}`);
    if (j.tl) {
      add(P("D4 timeline sits in its own rim, head+foot on --rimline"),
          m.storyHasRim && m.tlHeadBorder === RIMLINE && m.tlFootBorder === RIMLINE,
          `rim=${m.storyHasRim} head=${m.tlHeadBorder} foot=${m.tlFootBorder}`);
    }
    add(P("D5 group class is on the COLUMN"), m.colGroupClass.startsWith("u-"), `col=${m.colGroupClass} band=${m.bandGroupClass}`);
    add(P("D11 band padding 20/24/18 and nofig when figureless"),
        /20px 24px 18px/.test(m.bandPad) && m.bandNofig === !j.fig,
        `pad=${m.bandPad} nofig=${m.bandNofig} wantNofig=${!j.fig}`);
    add(P("D12 deed is 27px"), m.deedSize === "27px", `deed=${m.deedSize}`);
    add(P("D13 tile padding 14/20/15, label weight 500"),
        j.tiles ? (/14px 20px 15px/.test(m.tilePad) && m.tileKWeight === "500") : true,
        `pad=${m.tilePad} weight=${m.tileKWeight}`);

    /* ── D6 — presence, from the contract's DATA ── */
    add(P("D6 figure present per contract"), (m.figCount > 0) === j.fig, `fig=${m.figCount} want=${j.fig}`);
    add(P("D6 tiles present per contract"), (m.tiles > 0) === j.tiles, `tiles=${m.tiles} want=${j.tiles}`);
    add(P("D6 timeline present per contract"), m.storyHasRim === j.tl || (!j.tl && m.storyW === -1), `story=${m.storyW} want=${j.tl}`);

    /* ── the ELEVEN MATCHES, as guards ── */
    add(P("G1 rim: overflow hidden, burgundy, radius 9"), m.rimOK, `rims=${m.rims}`);
    add(P("G2 band carries its group gradient"), /gradient/.test(m.bandImage), m.bandImage.slice(0, 60));
    /* ⚠️ EITHER MECHANISM COUNTS. The contract draws the rule with `.band::after`; the live band
       uses `border-bottom-color`, which paints the identical line. This guard is about the RULE
       being there, not about which property draws it — asserting the pseudo-element would have
       been my mechanism preference dressed as a contract requirement. */
    add(P("G3 band bottom rule present"),
        (m.bandAfterRule !== "-" && m.bandAfterRule !== "rgba(0, 0, 0, 0)") || m.bandBorder !== "rgba(0, 0, 0, 0)",
        `after=${m.bandAfterRule} border=${m.bandBorder}`);
    add(P("G4 deed ink set"), m.deedColor !== "-", m.deedColor);
    add(P("G5 sub tint set"), m.subColor !== "-", m.subColor);
    add(P("G6 absent data is muted mono"),
        m.absentMono === "none-rendered" || /uppercase/.test(m.absentMono), m.absentMono);
    add(P("G7 no pill or tier label in the band"), !m.pill, m.pill ? "pill present" : "none");
    add(P("G8 no gendered pronoun"), !m.gendered, m.gendered ? "FOUND" : "clean");
    add(P("G9 no [object Object]"), !m.objectObject, m.objectObject ? "FOUND" : "clean");
    if (j.tl) {
      add(P("G10 timeline mono header + count"), /uppercase/.test(m.tlHeadMono) && m.tlCount, `${m.tlHeadMono} count=${m.tlCount}`);
      add(P("G11 timeline footer link is burgundy"), m.tlLink !== "-", m.tlLink);
    }
    add(P("F fluid: tile dividers use --rimline"), m.tileDivider === RIMLINE || !j.tiles, m.tileDivider);
  }

  const red = out.filter((r) => !r.ok);
  const lines = [`── contract · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(process.env.SA_CONTRACT_OUT ?? "run-artifacts/contract.txt", report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
