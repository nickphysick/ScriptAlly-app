/**
 * Smart Import from photos — the evaluation runner (smart-import-photos-v1, phase 4).
 *
 *   npx tsx functions/eval/photoEval.mts [--dry-run] [--runs N] [--only <glob>] [--label <name>]
 *                                        [--timing] [--confirm-spend] [--real-out <dir>]
 *
 * For each rendered fixture (photoRender.mts; sharp and blurred) and each of Nick's own photos in
 * functions/eval/fixtures/photos-real/ (gitignored; skipped with a note when empty): prepare every
 * page exactly as the browser does (Chromium: decode upright, 1568px on the long edge, JPEG 0.82,
 * metadata stripped), make the callable's own photo request through mapPages, and score the read
 * against the truth (photoScore.ts). --timing adds one 10-page read, timed against the callable's
 * 300 s. Results go to reports/smart-import-photos-v1/eval-<label>/.
 *
 * COST. The estimate is printed first; above SPEND_CEILING_USD the run refuses without
 * --confirm-spend. The key is ANTHROPIC_API_KEY or .env.local's; never printed or written.
 * --dry-run answers every call with the truth (photoScore.perfectReply) — it must score 100%.
 */
import { chromium, type Page } from "playwright";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { mapPages, type MapClient, type PageIn } from "../src/smartImportCore.ts";
import { MODEL } from "../src/emailImportCore.ts";
import { costUsd, SPEND_CEILING_USD } from "./pricing.ts";
import { scorePhotoRead, perfectReply, PHOTO_CODES, type PhotoTruth, type PhotoScore } from "./photoScore.ts";
import { LONG_EDGE, JPEG_QUALITY, stripJpegMetadata, jpegHasMetadata, MAX_PAGES_CHARS } from "../../src/lib/photoImport.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const FIX = join(here, "fixtures", "photos");
const REAL = join(here, "fixtures", "photos-real");
const TRUTH = join(here, "photo-truth");

const argv = process.argv.slice(2);
const flag = (k: string) => argv.includes(k);
const val = (k: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const DRY = flag("--dry-run"), RUNS = Number(val("--runs") ?? 1), ONLY = val("--only"), LABEL = val("--label") ?? (DRY ? "dry" : "live");
const only = ONLY ? new RegExp("^" + ONLY.replace(/\*/g, ".*") + "$") : null;

function key(): string | null {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const p = join(root, ".env.local");
  if (!existsSync(p)) return null;
  const line = readFileSync(p, "utf8").split("\n").find((l) => /^\s*ANTHROPIC_API_KEY\s*=/.test(l));
  return line ? line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : null;
}

/** One page, prepared as photoPrepare.ts does it in the browser. */
async function prepare(page: Page, file: string): Promise<{ data: string; width: number; height: number }> {
  const b64in = readFileSync(file).toString("base64");
  const out = await page.evaluate(async ({ b64in, edge, q }) => {
    const blob = await (await fetch(`data:image/jpeg;base64,${b64in}`)).blob();
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
    const s = Math.min(1, edge / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
    const c = new OffscreenCanvas(w, h); const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
    const bytes = new Uint8Array(await (await c.convertToBlob({ type: "image/jpeg", quality: q })).arrayBuffer());
    return { bytes: Array.from(bytes), w, h };
  }, { b64in, edge: LONG_EDGE, q: JPEG_QUALITY });
  const clean = stripJpegMetadata(Uint8Array.from(out.bytes));
  if (jpegHasMetadata(clean)) throw new Error("metadata survived");
  return { data: Buffer.from(clean).toString("base64"), width: out.w, height: out.h };
}

interface Fixture { id: string; truth: PhotoTruth; pages: string[]; real: boolean }
function fixtures(): Fixture[] {
  const out: Fixture[] = [];
  for (const f of readdirSync(TRUTH).filter((x) => x.endsWith(".json")).sort()) {
    const truth = JSON.parse(readFileSync(join(TRUTH, f), "utf8")) as PhotoTruth;
    for (const v of ["sharp", "blur"]) {
      const id = `${truth.id}-${v}`;
      if (only && !only.test(id)) continue;
      const dir = join(FIX, id);
      if (!existsSync(dir)) throw new Error(`${dir} is missing — run photoRender.mts first.`);
      out.push({ id, truth: { ...truth, id }, pages: Array.from({ length: truth.pages }, (_, i) => join(dir, `page-${i + 1}.jpg`)), real: false });
    }
  }
  const real = existsSync(REAL) ? readdirSync(REAL).filter((d) => existsSync(join(REAL, d, "truth.json"))) : [];
  if (real.length === 0) console.log(`Note: no photos of your own in functions/eval/fixtures/photos-real/ — skipped (see functions/eval/photos-real.example.json).`);
  for (const d of real) {
    const truth = JSON.parse(readFileSync(join(REAL, d, "truth.json"), "utf8")) as PhotoTruth;
    const pages = readdirSync(join(REAL, d)).filter((x) => /\.(jpe?g|png)$/i.test(x)).sort().map((x) => join(REAL, d, x));
    out.push({ id: `real-${d}`, truth: { ...truth, id: `real-${d}`, pages: pages.length }, pages, real: true });
  }
  return out;
}

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : "—");

async function main() {
  const list = fixtures();
  const k = DRY ? null : key();
  if (!DRY && !k) { console.error("ANTHROPIC_API_KEY is not set (environment or .env.local). Nothing was run."); process.exit(2); }
  const pageCount = list.reduce((s, f) => s + f.pages.length, 0) * RUNS + (flag("--timing") ? 10 : 0);
  // ~1568×2091 at 750 px a token, the system prompt cached after the first call, ~60 output tokens a row.
  const estimate = (pageCount * 4400 * 3 + list.reduce((s, f) => s + f.truth.entries.length, 0) * RUNS * 70 * 15) / 1e6;
  console.log(`${list.length} fixtures × ${RUNS} run(s), ${pageCount} pages${DRY ? " (dry run: no spend)" : ""}. Estimated cost $${estimate.toFixed(2)}.`);
  if (!DRY && estimate > SPEND_CEILING_USD && !flag("--confirm-spend")) { console.error(`Above the $${SPEND_CEILING_USD} ceiling: pass --confirm-spend.`); process.exit(2); }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  const client: MapClient = DRY ? null as any : (new Anthropic({ apiKey: k! }) as unknown as MapClient);
  const results: any[] = [];
  const realReads: any[] = [];
  const outDir = join(root, "reports", "smart-import-photos-v1", `eval-${LABEL}`);
  mkdirSync(outDir, { recursive: true });

  const prepared = new Map<string, { data: string; width: number; height: number }[]>();
  for (const f of list) prepared.set(f.id, await Promise.all(f.pages.map((p) => prepare(page, p))));

  for (let run = 1; run <= RUNS; run++) {
    await Promise.all(chunk(list, 3).map(async (group) => {
      for (const f of group) {
        const pages: PageIn[] = prepared.get(f.id)!.map((p) => ({ mediaType: "image/jpeg", data: p.data }));
        const c: MapClient = DRY ? stub(perfectReply(f.truth)) : client;
        const o = await mapPages(c, pages);
        const score: PhotoScore | null = o.result ? scorePhotoRead(f.truth, o.result) : null;
        const payload = pages.reduce((s, p) => s + p.data.length, 0);
        results.push({ id: f.id, run, real: f.real, style: f.truth.style, blurred: f.id.endsWith("-blur"), pages: pages.length, payloadChars: payload,
          ms: o.ms, attempts: o.attempts, failure: o.failure, stopReason: o.stopReason ?? null, usage: o.usage, costUsd: DRY ? 0 : costUsd(MODEL, o.usage), score,
          ...(f.real ? {} : { result: o.result }) });
        if (f.real) realReads.push({ id: f.id, run, result: o.result, wrong: score?.wrong ?? [] });
        console.log(`run ${run} ${f.id}: ${o.failure ?? "ok"} ${(o.ms / 1000).toFixed(1)}s ${score ? `names ${score.correct.name}/${score.entries} src ${score.src.hit}/${score.src.of}` : ""}`);
      }
    }));
  }

  let timing: any = null;
  if (flag("--timing")) {
    const ten = list.filter((f) => !f.real && f.id.endsWith("-sharp")).flatMap((f) => prepared.get(f.id)!).slice(0, 10);
    const pages: PageIn[] = ten.map((p) => ({ mediaType: "image/jpeg", data: p.data }));
    const payload = pages.reduce((s, p) => s + p.data.length, 0);
    const o = await mapPages(DRY ? stub('{"agents":[],"queries":[]}') : client, pages);
    timing = { pages: pages.length, payloadChars: payload, underCap: payload <= MAX_PAGES_CHARS, ms: o.ms, failure: o.failure, stopReason: o.stopReason ?? null, usage: o.usage,
      rows: o.result?.queries?.length ?? 0, costUsd: DRY ? 0 : costUsd(MODEL, o.usage), firstTokenMs: o.firstTokenMs ?? null };
    console.log(`10-page read: ${o.failure ?? "ok"} ${(o.ms / 1000).toFixed(1)}s, ${timing.rows} rows, payload ${payload} chars`);
  }
  await browser.close();
  /* A writer's own list is never written into the repo; --real-out names a folder outside it. */
  const realOut = val("--real-out");
  if (realOut) { mkdirSync(realOut, { recursive: true }); writeFileSync(join(realOut, `real-${LABEL}.json`), JSON.stringify(realReads, null, 2) + "\n"); }
  writeFileSync(join(outDir, "results.json"), JSON.stringify({ model: MODEL, label: LABEL, dry: DRY, runs: RUNS, timing, results }, null, 2) + "\n");
  writeFileSync(join(outDir, "summary.md"), summary(results, timing));
  console.log(`\nWritten to ${outDir}`);
}

function chunk<T>(xs: T[], n: number): T[][] { const out: T[][] = Array.from({ length: n }, () => []); xs.forEach((x, i) => out[i % n].push(x)); return out.filter((g) => g.length); }
function stub(reply: string): MapClient {
  return { messages: { stream: () => ({ finalMessage: async () => ({ content: [{ type: "text", text: reply }], stop_reason: "end_turn", usage: {} }) }) } };
}

function summary(results: any[], timing: any): string {
  const rows: string[] = [];
  const group = (name: string, rs: any[]) => {
    const sc = rs.map((r) => r.score).filter(Boolean) as PhotoScore[];
    const n = sc.reduce((s, x) => s + x.entries, 0);
    const sum = (f: (x: PhotoScore) => number) => sc.reduce((s, x) => s + f(x), 0);
    const srcOf = sum((x) => x.src.of);
    rows.push(`| ${name} | ${rs.length} | ${rs.filter((r) => r.failure).length} | ${pct(sum((x) => x.correct.name), n)} | ${pct(sum((x) => x.correct.agency), n)} | ${pct(sum((x) => x.correct.status), n)} | ${pct(sum((x) => x.correct.date), n)} | ${pct(sum((x) => x.src.hit), srcOf)} | ${sum((x) => x.spurious)} |`);
  };
  const pick = (f: (r: any) => boolean) => results.filter(f);
  group("all", results);
  group("handwritten, sharp", pick((r) => r.style === "hand" && !r.blurred && !r.real));
  group("handwritten, blurred", pick((r) => r.style === "hand" && r.blurred));
  group("printed", pick((r) => r.style === "print"));
  group("screenshots", pick((r) => r.style === "shot"));
  group("sharp", pick((r) => !r.blurred && !r.real));
  group("blurred", pick((r) => r.blurred));
  if (results.some((r) => r.real)) group("your own photos", pick((r) => r.real));
  const codes = PHOTO_CODES.map((c) => {
    const t = results.map((r) => r.score?.codes[c]).filter(Boolean);
    const tp = t.reduce((s, x) => s + x.tp, 0), fp = t.reduce((s, x) => s + x.fp, 0), fn = t.reduce((s, x) => s + x.fn, 0);
    return `| ${c} | ${tp} | ${fp} | ${fn} | ${pct(tp, tp + fp)} | ${pct(tp, tp + fn)} |`;
  });
  const pages = results.reduce((s, r) => s + r.pages, 0);
  const cost = results.reduce((s, r) => s + r.costUsd, 0), ms = results.reduce((s, r) => s + r.ms, 0);
  return [
    `# Smart Import photo evaluation`, ``,
    `| | reads | failed | name | agency | status | date | src hit | spurious |`, `|---|---|---|---|---|---|---|---|---|`, ...rows, ``,
    `| code | tp | fp | fn | precision | recall |`, `|---|---|---|---|---|---|`, ...codes, ``,
    `Pages read: ${pages}. Time per page: ${(ms / 1000 / Math.max(1, pages)).toFixed(1)} s. Cost per page: $${(cost / Math.max(1, pages)).toFixed(4)}. Total cost: $${cost.toFixed(2)}.`,
    timing ? `\n10-page read: ${timing.failure ?? "ok"}, ${(timing.ms / 1000).toFixed(1)} s, ${timing.rows} rows, payload ${timing.payloadChars} chars (cap ${MAX_PAGES_CHARS}).` : "",
    ``,
  ].join("\n");
}

await main();
