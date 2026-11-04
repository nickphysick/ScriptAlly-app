/**
 * Smart Import from photos — render the evaluation's lists as photos (smart-import-photos-v1, phase 4).
 *
 *   npx tsx functions/eval/photoRender.mts [--only <id>]
 *
 * Each list in photoLists.ts is drawn in Chromium and screenshotted, page by page, twice: sharp, and
 * blurred (a camera that missed focus). Handwritten lists are a notebook page on a desk: ruled paper,
 * a margin rule, a handwriting webfont, a slight rotation and uneven light. Printed lists are a
 * printout on the same desk. Screenshots are a spreadsheet's window.
 *
 * Beside the images, truth.json: every entry's expected values and the band its line occupies on
 * its page, measured from the rendered element (fractions of the image's height) — what a correct
 * `src.y` must contain. The images are written to functions/eval/fixtures/photos/ (gitignored, made
 * again by this script); the truth files are committed.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PHOTO_LISTS, entryLine, type PhotoList, type PhotoEntry } from "./photoLists.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const PHOTO_FIXTURE_DIR = join(here, "fixtures", "photos");
export const PHOTO_TRUTH_DIR = join(here, "photo-truth");

const FONTS = "https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Indie+Flower&family=Shadows+Into+Light&display=block";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function agencyHtml(e: PhotoEntry): string {
  if (!e.agency) return "";
  if (!e.illegibleAgency) return esc(e.agency);
  const n = e.illegibleAgency.legible;
  return `${esc(e.agency.slice(0, n))}<span class="fz">${esc(e.agency.slice(n))}</span>`;
}
function lineHtml(e: PhotoEntry, i: number): string {
  const parts = [esc(e.name), agencyHtml(e), esc(e.date), esc(e.said)].filter(Boolean).join(" – ");
  const body = e.crossed ? `<s>${parts}</s>` : parts;
  return `<p data-e="${i}">${body}${e.mark ? ` <b class="mk">${e.mark}</b>` : ""}</p>`;
}

function pageHtml(list: PhotoList, entries: PhotoEntry[], pageNo: number, blur: boolean): string {
  const rot = [-1.4, 1.1, -0.7][pageNo % 3];
  if (list.style === "shot") {
    const rows = entries.map((e, i) => {
      const c = (s: string) => `<td>${e.crossed ? `<s>${s}</s>` : s}</td>`;
      return `<tr data-e="${i}"><th>${i + 2 + pageNo * 12}</th>${c(esc(e.name))}${c(agencyHtml(e))}${c(esc(e.date))}${c(esc(e.said))}</tr>`;
    }).join("");
    return `<!doctype html><html><head><style>
      body{margin:0;width:1600px;height:1000px;background:#e9ecef;font-family:${list.font},sans-serif;overflow:hidden}
      .bar{height:64px;background:#2f3a48}.tools{height:44px;background:#f6f7f8;border-bottom:1px solid #d6d6d6}
      table{border-collapse:collapse;margin:0;background:#fff;font-size:22px;color:#202124}
      td,th{border:1px solid #d6d6d6;padding:10px 14px;white-space:nowrap;height:30px}
      th{background:#eef1f4;color:#5f6368;font-weight:400;width:46px}
      td{min-width:250px} thead td{background:#eef1f4;font-weight:700}
      .fz{filter:blur(4px)} ${blur ? "body{filter:blur(2.2px)}" : ""}
      </style></head><body><div class="bar"></div><div class="tools"></div>
      <table><thead><tr><th>1</th><td>Agent</td><td>Agency</td><td>Sent</td><td>Status</td></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  }
  const hand = list.style === "hand";
  const title = pageNo === 0 && list.title ? `<p class="h">${esc(list.title)}</p>` : "";
  return `<!doctype html><html><head><link rel="stylesheet" href="${FONTS}"><style>
    body{margin:0;width:1200px;height:1600px;background:radial-gradient(120% 90% at 30% 20%,#9b8a77,#5f5245);overflow:hidden;position:relative}
    .pg{position:absolute;left:90px;top:90px;width:1020px;height:1420px;box-sizing:border-box;transform:rotate(${rot}deg);
      background:${hand ? "#fbf8ef" : "#ffffff"};box-shadow:0 18px 40px -16px rgba(0,0,0,.6);
      ${hand ? "background-image:repeating-linear-gradient(180deg,transparent 0 62px,rgba(70,110,160,.32) 62px 64px);" : ""}
      padding:${hand ? "116px 30px 40px 110px" : "110px 70px 40px 80px"};overflow:hidden}
    ${hand ? ".pg::before{content:'';position:absolute;left:84px;top:0;bottom:0;width:2px;background:rgba(190,80,70,.45)}" : ""}
    p{margin:0;white-space:nowrap;${hand ? `font-family:'${list.font}',cursive;font-size:42px;height:64px;line-height:64px;color:#22305c` : `font-family:${list.font},serif;font-size:27px;height:58px;line-height:58px;color:#1b1b1b`}}
    p.h{${hand ? "font-size:52px;color:#1b2448" : "font-size:34px;font-weight:700"}}
    s{text-decoration-thickness:${hand ? 4 : 3}px;text-decoration-color:currentColor}
    .mk{font-weight:400}
    .fz{filter:blur(${hand ? 4.5 : 4}px)}
    .light{position:absolute;inset:0;pointer-events:none;background:radial-gradient(70% 60% at 78% 12%,rgba(255,250,235,.28),transparent 62%),linear-gradient(200deg,transparent 38%,rgba(0,0,0,.30))}
    ${blur ? ".pg,.light{filter:blur(2.6px)}" : ""}
    </style></head><body><div class="pg">${title}${entries.map((e, i) => lineHtml(e, i)).join("")}</div><div class="light"></div></body></html>`;
}

export interface TruthEntry extends PhotoEntry { page: number; band: [number, number]; line: string }
export interface PhotoTruth { id: string; style: string; font: string; pages: number; entries: TruthEntry[] }

async function main() {
  const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
  const browser = await chromium.launch();
  mkdirSync(PHOTO_TRUTH_DIR, { recursive: true });
  for (const list of PHOTO_LISTS) {
    if (only && list.id !== only) continue;
    const shot = list.style === "shot";
    const vp = shot ? { width: 1600, height: 1000 } : { width: 1200, height: 1600 };
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const truth: PhotoTruth = { id: list.id, style: list.style, font: list.font, pages: list.pages.length, entries: [] };
    for (const blur of [false, true]) {
      const dir = join(PHOTO_FIXTURE_DIR, `${list.id}-${blur ? "blur" : "sharp"}`);
      mkdirSync(dir, { recursive: true });
      for (let p = 0; p < list.pages.length; p++) {
        await page.setContent(pageHtml(list, list.pages[p], p, blur), { waitUntil: "networkidle" });
        await page.evaluate(async () => { await (document as any).fonts.ready; });
        if (!shot) {
          const ok = await page.evaluate((f) => (document as any).fonts.check(`42px "${f}"`), list.font);
          if (list.style === "hand" && !ok) throw new Error(`The handwriting font ${list.font} did not load; refusing to render a fallback face.`);
        }
        await page.screenshot({ path: join(dir, `page-${p + 1}.jpg`), type: "jpeg", quality: 90 });
        if (!blur) {
          const bands = await page.evaluate((h) => [...document.querySelectorAll<HTMLElement>("[data-e]")].map((el) => {
            const r = el.getBoundingClientRect();
            return [Math.max(0, r.top / h), Math.min(1, r.bottom / h)] as [number, number];
          }), vp.height);
          list.pages[p].forEach((e, i) => truth.entries.push({ ...e, page: p + 1, band: bands[i], line: entryLine(e, list.style).join(" ") }));
        }
      }
    }
    writeFileSync(join(PHOTO_TRUTH_DIR, `${list.id}.json`), JSON.stringify(truth, null, 2) + "\n");
    console.log(`${list.id}: ${list.pages.length} page(s), ${truth.entries.length} entries`);
    await ctx.close();
  }
  await browser.close();
}
await main();
