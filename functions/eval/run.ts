/**
 * Smart Import evaluation — the runner.
 *
 *   npx tsx functions/eval/run.ts [--split dev|holdout|all] [--only <glob>] [--runs N]
 *                                 [--concurrency N] [--dry-run] [--confirm-spend] [--label <name>]
 *
 * For each fixture: convert it through the app's REAL conversion (src/lib/sheetText.bufferToCsv),
 * refuse it exactly where the callable would (over 600 lines or 200,000 characters), make exactly
 * the callable's request through mapSheet, and score the assembled result against the expected
 * answer. Writes reports/smart-import-eval/<timestamp>[-label]/summary.md and results.json.
 *
 * COST. Before any paid run the estimate is printed; above SPEND_CEILING_USD the run refuses unless
 * --confirm-spend is passed. The key is read from ANTHROPIC_API_KEY, or from .env.local at the repo
 * root; it is never printed, logged or written anywhere.
 *
 * --dry-run drives conversion, mapSheet's parse-and-assemble, scoring and the report against a stub
 * client that answers with what a perfect model would say for each fixture — so the whole pipeline
 * is proven without spending, and a dry run that does not score 100% means the harness is wrong.
 *
 * REAL FILES. Anything in tests/fixtures/smart-eval/real/ with a sibling <name>.expected.json is
 * included (it is gitignored). Reports count them and redact every value — names, dates, statuses —
 * that would otherwise print a writer's data.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { bufferToCsv } from "../../src/lib/sheetText";
import { mapSheet, MAX_OUTPUT_TOKENS, type MapClient, type MapOutcome, type MapUsage } from "../src/smartImportCore";
import { SYSTEM_PROMPT } from "../src/smartImportPrompt";
import { MODEL } from "../src/emailImportCore";
import { scoreFixture, disagreements, FIELDS, type FixtureScore } from "./score";
import { costUsd, priceFor, SPEND_CEILING_USD } from "./pricing";
import { FIXTURE_DIR, REAL_DIR, repoRoot, type ExpectedFile, type Manifest, type ManifestEntry } from "./types";

// The callable's own limits (functions/src/smartImport.ts), mirrored so a fixture the app would
// refuse is refused here too rather than scored as though it had been sent.
const MAX_CHARS = 200_000;
const MAX_LINES = 600;
const MODEL_REASONS = new Set(["status-direction", "status-wording", "check-name", "needs-identifying"]);

export interface Args {
  split: "dev" | "holdout" | "all";
  only: string | null;
  runs: number;
  concurrency: number;
  dryRun: boolean;
  confirmSpend: boolean;
  label: string | null;
  real: boolean;
}

export function parseArgs(argv: string[]): Args {
  const a: Args = { split: "dev", only: null, runs: 1, concurrency: 4, dryRun: false, confirmSpend: false, label: null, real: true };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => { const x = argv[++i]; if (x === undefined) throw new Error(`${k} needs a value`); return x; };
    if (k === "--split") { const s = v(); if (!["dev", "holdout", "all"].includes(s)) throw new Error(`--split must be dev, holdout or all`); a.split = s as Args["split"]; }
    else if (k === "--only") a.only = v();
    else if (k === "--runs") a.runs = Math.max(1, Number(v()) | 0);
    else if (k === "--concurrency") a.concurrency = Math.max(1, Number(v()) | 0);
    else if (k === "--dry-run") a.dryRun = true;
    else if (k === "--confirm-spend") a.confirmSpend = true;
    else if (k === "--label") a.label = v().replace(/[^a-z0-9-]+/gi, "-");
    else if (k === "--no-real") a.real = false;
    else throw new Error(`Unknown flag ${k}`);
  }
  return a;
}

/** "kitchen-*" → /^kitchen-.*$/ ; a comma separates alternatives. */
export function globMatcher(glob: string | null): (id: string) => boolean {
  if (!glob) return () => true;
  const res = glob.split(",").map((g) => new RegExp("^" + g.trim().replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"));
  return (id) => res.some((r) => r.test(id));
}

interface Fixture { entry: ManifestEntry; expected: ExpectedFile; real: boolean }

function loadFixtures(root: string, args: Args): Fixture[] {
  const manifest: Manifest = JSON.parse(readFileSync(join(root, FIXTURE_DIR, "manifest.json"), "utf8"));
  const match = globMatcher(args.only);
  const out: Fixture[] = manifest.fixtures
    .filter((f) => (args.split === "all" || f.split === args.split) && match(f.id))
    .map((entry) => ({ entry, expected: JSON.parse(readFileSync(join(root, entry.expected), "utf8")), real: false }));
  const realDir = join(root, REAL_DIR);
  if (args.real && existsSync(realDir)) {
    const files = readdirSync(realDir).filter((f) => !f.endsWith(".expected.json") && /\.(csv|xlsx|xls)$/i.test(f)).sort();
    let n = 0;
    for (const f of files) {
      const exp = join(realDir, basename(f, extname(f)) + ".expected.json");
      if (!existsSync(exp)) continue;
      const id = `real-${++n}`;
      if (!match(id)) continue;
      out.push({
        entry: { id, file: join(REAL_DIR, f), expected: join(REAL_DIR, basename(exp)), format: /\.csv$/i.test(f) ? "csv" : "xlsx",
          seed: 0, layout: "real", knobs: ["real"], rows: 0, expectedToFail: false, split: "dev" },
        expected: JSON.parse(readFileSync(exp, "utf8")), real: true,
      });
    }
  }
  return out;
}

/** The key, from the environment or .env.local. Returned, never printed. */
function loadKey(root: string): string | null {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const p = join(root, ".env.local");
  if (!existsSync(p)) return null;
  const line = readFileSync(p, "utf8").split("\n").find((l) => /^\s*ANTHROPIC_API_KEY\s*=/.test(l));
  if (!line) return null;
  const v = line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  return v || null;
}

/** What a perfect model says for a fixture, in the model's own output shape (pre-assembly). */
export function oracleReply(expected: ExpectedFile): string {
  const agents = expected.queries.map((q, i) => ({ ref: `a${i + 1}`, name: q.agentName, agency: q.agency, ...(q.website ? { website: q.website } : {}) }));
  const queries = expected.queries.map((q, i) => {
    const raw = q.sentDate ?? (q.reasons.includes("missing-day") ? "March 2024" : null);
    const semantic = q.reasons.filter((r) => MODEL_REASONS.has(r));
    return {
      agentRef: `a${i + 1}`, status: q.status,
      ...(raw ? { sentDateRaw: raw } : {}),
      ...(q.timeline.length ? { timeline: q.timeline.map((t) => ({ type: t.type, ...(t.date ? { rawDate: t.date } : {}) })) } : {}),
      ...(semantic.length ? { reasons: semantic } : {}),
    };
  });
  return JSON.stringify({ agents, queries });
}

function stubClient(reply: string): MapClient {
  return { messages: { create: async () => ({ content: [{ type: "text", text: reply }], stop_reason: "end_turn", usage: { input_tokens: 0, output_tokens: 0 } }) } };
}

/** Whether what the import needs to know survived the conversion at all — free to measure. */
export function coverage(text: string, expected: ExpectedFile) {
  const t = text.normalize("NFKC").toLowerCase();
  let facts = 0, visible = 0;
  const has = (s: string) => { facts++; if (t.includes(s.normalize("NFKC").toLowerCase())) visible++; };
  for (const q of expected.queries) {
    if (q.agentName) has(q.agentName);
    if (q.agency) has(q.agency);
    if (q.website) has(q.website.replace(/^https?:\/\//, ""));
  }
  return { facts, visible, ratio: facts ? visible / facts : 1 };
}

function estimate(text: string, queries: number) {
  // Conservative: ~3.5 characters per token on input; ~60 output tokens per query plus overhead.
  const input = Math.ceil((SYSTEM_PROMPT.length + text.length) / 3.5);
  const output = Math.min(MAX_OUTPUT_TOKENS, 60 * queries + 60);
  return { input, output };
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

interface RunRecord {
  run: number;
  failure: MapOutcome["failure"] | "refused" | null;
  attempts: number;
  stopReason?: string | null;
  ms: number;
  usage: MapUsage;
  costUsd: number;
  score: FixtureScore;
}

interface FixtureResult {
  id: string;
  real: boolean;
  split: string;
  layout: string;
  knobs: string[];
  format: string;
  rows: number;
  expectedToFail: boolean;
  failReason?: string;
  conversion: { chars: number; lines: number; refused: string | null; coverage: ReturnType<typeof coverage> };
  runs: RunRecord[];
  disagreements: ReturnType<typeof disagreements>;
}

const zeroUsage = (): MapUsage => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : "—");
const usd = (n: number) => `$${n.toFixed(4)}`;

/** Strip every value a real file's result would print; keep the counts. */
function redact(r: FixtureResult): FixtureResult {
  return {
    ...r,
    runs: r.runs.map((x) => ({
      ...x,
      score: {
        ...x.score,
        dropped: x.score.dropped.map((_, i) => `real query ${i + 1}`),
        invented: x.score.invented.map((_, i) => `invented ${i + 1}`),
        ambiguous: x.score.ambiguous.map((_, i) => `ambiguous ${i + 1}`),
        wrong: x.score.wrong.map((w, i) => ({ query: `real query (${i + 1})`, field: w.field, expected: "[redacted]", actual: "[redacted]" })),
        values: {},
      },
    })),
    disagreements: r.disagreements.map((d) => ({ field: d.field, query: "[redacted]", values: [`${d.values.length} distinct`] })),
  };
}

/** The rows a fixture contributes to in the by-knob table: its layout (when not the standard one),
 *  then each knob; a standard fixture with no knobs is the clean reference. */
export function knobKeys(r: { layout: string; knobs: string[] }): string[] {
  const keys = r.layout !== "standard" ? [`layout:${r.layout}`] : [];
  keys.push(...r.knobs);
  return keys.length ? keys : ["(no knobs)"];
}

function summary(results: FixtureResult[], args: Args, stamp: string): string {
  const first = (r: FixtureResult) => r.runs[0];
  const sum = (rs: FixtureResult[], f: (x: RunRecord) => number) => rs.reduce((n, r) => n + r.runs.reduce((m, x) => m + f(x), 0), 0);
  const acc = (rs: FixtureResult[]) => {
    const c = rs.reduce((n, r) => n + first(r).score.fieldsCorrect, 0), t = rs.reduce((n, r) => n + first(r).score.fieldsCompared, 0);
    return { c, t, s: pct(c, t) };
  };
  const scored = results.filter((r) => !r.expectedToFail);
  const etf = results.filter((r) => r.expectedToFail);
  const passed = (rs: FixtureResult[]) => rs.filter((r) => first(r).score.pass).length;
  const totalCost = sum(results, (x) => x.costUsd);
  const ms = results.flatMap((r) => r.runs.filter((x) => x.failure !== "refused").map((x) => x.ms)).sort((a, b) => a - b);
  const L: string[] = [];

  L.push(`# Smart Import evaluation — ${stamp}${args.label ? ` (${args.label})` : ""}`, "");
  L.push(`Model \`${MODEL}\` · split **${args.split}** · runs per fixture **${args.runs}** · ${args.dryRun ? "**DRY RUN — oracle stub, no model called, nothing spent**" : "live model calls"}`);
  L.push(`Fixtures: ${results.filter((r) => !r.real).length} synthetic + ${results.filter((r) => r.real).length} real (real files are counted, never printed).`, "");
  L.push("## Headline", "");
  L.push(`| | Field accuracy | Fixtures passed |`, `|---|---|---|`);
  L.push(`| Expected to pass (${scored.length}) | **${acc(scored).s}** (${acc(scored).c}/${acc(scored).t}) | **${passed(scored)}/${scored.length}** |`);
  L.push(`| Expected to fail (${etf.length}) | ${acc(etf).s} (${acc(etf).c}/${acc(etf).t}) | ${passed(etf)}/${etf.length} |`);
  L.push(`| All (${results.length}) | ${acc(results).s} | ${passed(results)}/${results.length} |`, "");
  L.push(`Total spend: **${usd(totalCost)}** · tokens in ${sum(results, (x) => x.usage.inputTokens)} · out ${sum(results, (x) => x.usage.outputTokens)} · cache read ${sum(results, (x) => x.usage.cacheReadTokens)} · cache write ${sum(results, (x) => x.usage.cacheWriteTokens)}`);
  if (ms.length) L.push(`Time per call: median ${ms[Math.floor(ms.length / 2)]} ms · max ${ms[ms.length - 1]} ms`);
  L.push("");

  L.push("## By field (expected-to-pass fixtures, first run)", "", "| Field | Accuracy | Correct / compared |", "|---|---|---|");
  for (const f of FIELDS) {
    const c = scored.reduce((n, r) => n + first(r).score.byField[f].correct, 0), t = scored.reduce((n, r) => n + first(r).score.byField[f].compared, 0);
    if (t) L.push(`| ${f} | ${pct(c, t)} | ${c}/${t} |`);
  }
  L.push("");

  L.push("## By knob — which messiness costs most", "", "Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.", "",
    "| Knob | Fixtures | Field accuracy | Passed | Expected to fail |", "|---|---|---|---|---|");
  const knobs = new Map<string, FixtureResult[]>();
  for (const r of results) for (const k of knobKeys(r)) (knobs.get(k) ?? knobs.set(k, []).get(k)!).push(r);
  const rows = [...knobs.entries()].map(([k, rs]) => ({ k, rs, a: acc(rs) })).sort((x, y) => x.a.c / (x.a.t || 1) - y.a.c / (y.a.t || 1));
  for (const { k, rs, a } of rows) L.push(`| ${k} | ${rs.length} | ${a.s} | ${passed(rs)}/${rs.length} | ${rs.filter((r) => r.expectedToFail).length} |`);
  L.push("");

  L.push("## By size (data rows)", "", "| Rows | Fixtures | Field accuracy | Passed |", "|---|---|---|---|");
  for (const n of [...new Set(results.map((r) => r.rows))].sort((a, b) => a - b)) {
    const rs = results.filter((r) => r.rows === n);
    L.push(`| ${n} | ${rs.length} | ${acc(rs).s} | ${passed(rs)}/${rs.length} |`);
  }
  L.push("");

  L.push("## Expected-to-fail fixtures — what actually happened", "", "| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |", "|---|---|---|---|---|---|");
  for (const r of etf) {
    const x = first(r);
    L.push(`| ${r.id} | ${r.failReason ?? ""} | ${x.failure ?? (x.score.pass ? "**passed**" : "mapped")} | ${pct(x.score.fieldsCorrect, x.score.fieldsCompared)} | ${x.score.dropped.length} | ${x.score.invented.length} |`);
  }
  L.push("");

  L.push("## Every fixture (first run)", "", "| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | ms | Tries | Failure |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    const x = first(r), s = x.score;
    L.push(`| ${r.id}${r.expectedToFail ? " ⚠︎" : ""} | ${r.split} | ${s.pass ? "✓" : "✗"} | ${pct(s.fieldsCorrect, s.fieldsCompared)} | ${s.dropped.length} | ${s.invented.length} | ${s.ambiguous.length} | ${s.wrong.length} | ${pct(r.conversion.coverage.visible, r.conversion.coverage.facts)} | ${x.usage.inputTokens} | ${x.usage.outputTokens} | ${x.usage.cacheReadTokens}/${x.usage.cacheWriteTokens} | ${usd(x.costUsd)} | ${x.ms} | ${x.attempts} | ${x.failure ?? ""} |`);
  }
  L.push("", "⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).", "");

  if (args.runs > 1) {
    L.push("## Run-to-run disagreements", "", "| Fixture | Fields that changed between runs |", "|---|---|");
    for (const r of results) L.push(`| ${r.id} | ${r.disagreements.length ? r.disagreements.map((d) => `${d.field} (${d.query})`).join("; ") : "none"} |`);
    L.push("");
  }

  L.push("## Wrong fields (first run, up to 6 per fixture; full list in results.json)", "");
  for (const r of results) {
    const s = first(r).score;
    if (s.pass) continue;
    L.push(`### ${r.id}`);
    if (r.real) { L.push(`${s.wrong.length} wrong fields, ${s.dropped.length} dropped, ${s.invented.length} invented — values redacted (real file).`, ""); continue; }
    if (s.dropped.length) L.push(`- dropped: ${s.dropped.slice(0, 6).join("; ")}${s.dropped.length > 6 ? ` … (+${s.dropped.length - 6})` : ""}`);
    if (s.invented.length) L.push(`- invented: ${s.invented.slice(0, 6).join("; ")}${s.invented.length > 6 ? ` … (+${s.invented.length - 6})` : ""}`);
    if (s.ambiguous.length) L.push(`- ambiguous: ${s.ambiguous.join("; ")}`);
    for (const w of s.wrong.slice(0, 6)) L.push(`- ${w.query} · **${w.field}** · expected \`${JSON.stringify(w.expected)}\` · got \`${JSON.stringify(w.actual)}\``);
    L.push("");
  }
  return L.join("\n") + "\n";
}

/** A live run above the ceiling needs --confirm-spend; a dry run spends nothing and always runs. */
export function spendDecision(estimateUsd: number, args: Pick<Args, "dryRun" | "confirmSpend">): "run" | "refuse" {
  if (args.dryRun) return "run";
  return estimateUsd > SPEND_CEILING_USD && !args.confirmSpend ? "refuse" : "run";
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const root = repoRoot();
  const fixtures = loadFixtures(root, args);
  if (!fixtures.length) throw new Error("No fixtures selected.");

  // Convert first: free, and the estimate needs the text.
  const prepared = fixtures.map((fx) => {
    const text = bufferToCsv(readFileSync(join(root, fx.entry.file)));
    const lines = text.split("\n").length;
    const refused = text.length > MAX_CHARS ? "too many characters" : lines > MAX_LINES ? "too many lines" : null;
    return { fx, text, lines, refused, cov: coverage(text, fx.expected) };
  });

  const est = prepared.filter((p) => !p.refused).map((p) => estimate(p.text, p.fx.expected.queries.length));
  priceFor(MODEL);
  const estCost = est.reduce((n, e) => n + costUsd(MODEL, { inputTokens: e.input, outputTokens: e.output, cacheReadTokens: 0, cacheWriteTokens: 0 }), 0) * args.runs;
  console.log(`${fixtures.length} fixtures × ${args.runs} run(s); estimated cost ${usd(estCost)} (input ~${est.reduce((n, e) => n + e.input, 0) * args.runs} tokens, output ~${est.reduce((n, e) => n + e.output, 0) * args.runs}).`);

  let realClient: MapClient | null = null;
  if (!args.dryRun) {
    if (spendDecision(estCost, args) === "refuse") {
      console.error(`Refusing: the estimate is above the $${SPEND_CEILING_USD} ceiling. Re-run with --confirm-spend if that is intended.`);
      process.exitCode = 2;
      return;
    }
    const key = loadKey(root);
    if (!key) {
      console.error("ANTHROPIC_API_KEY is not set (environment or .env.local). Nothing was run. To run:\n" +
        `  ANTHROPIC_API_KEY=… npx tsx functions/eval/run.ts ${argv.join(" ")}`);
      process.exitCode = 3;
      return;
    }
    realClient = new Anthropic({ apiKey: key });
  }

  const results: FixtureResult[] = prepared.map((p) => ({
    id: p.fx.entry.id, real: p.fx.real, split: p.fx.entry.split, layout: p.fx.entry.layout, knobs: p.fx.entry.knobs,
    format: p.fx.entry.format, rows: p.fx.expected.queries.length, expectedToFail: p.fx.entry.expectedToFail,
    ...(p.fx.entry.failReason ? { failReason: p.fx.entry.failReason } : {}),
    conversion: { chars: p.text.length, lines: p.lines, refused: p.refused, coverage: p.cov },
    runs: [], disagreements: [],
  }));

  const jobs = prepared.flatMap((p, i) => Array.from({ length: args.runs }, (_, run) => ({ p, i, run })));
  let done = 0;
  await pool(jobs, args.concurrency, async ({ p, i, run }) => {
    let rec: RunRecord;
    if (p.refused) {
      rec = { run, failure: "refused", attempts: 0, ms: 0, usage: zeroUsage(), costUsd: 0, score: scoreFixture(p.fx.expected, null) };
    } else {
      const client = realClient ?? stubClient(oracleReply(p.fx.expected));
      const out = await mapSheet(client, p.text);
      rec = { run, failure: out.failure, attempts: out.attempts, stopReason: out.stopReason, ms: out.ms, usage: out.usage,
        costUsd: costUsd(MODEL, out.usage), score: scoreFixture(p.fx.expected, out.result) };
    }
    results[i].runs.push(rec);
    console.log(`[${++done}/${jobs.length}] ${p.fx.entry.id}${args.runs > 1 ? ` run ${run + 1}` : ""}: ${rec.failure ?? (rec.score.pass ? "pass" : "fail")} ${pct(rec.score.fieldsCorrect, rec.score.fieldsCompared)}`);
  });
  for (const r of results) { r.runs.sort((a, b) => a.run - b.run); r.disagreements = disagreements(r.runs.map((x) => x.score)); }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = join(root, "reports", "smart-import-eval", `${stamp}${args.dryRun ? "-dry" : ""}${args.label ? `-${args.label}` : ""}`);
  mkdirSync(dir, { recursive: true });
  const safe = results.map((r) => (r.real ? redact(r) : r));
  writeFileSync(join(dir, "results.json"), JSON.stringify({ stamp, model: MODEL, args: { ...args }, results: safe }, null, 1) + "\n");
  writeFileSync(join(dir, "summary.md"), summary(safe, args, stamp));
  console.log(`Report: ${join(dir, "summary.md")}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
}
