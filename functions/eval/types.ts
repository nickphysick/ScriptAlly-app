/**
 * Shapes shared by the Smart Import evaluation harness: the expected answer the generator writes
 * from its TRUTH, and the manifest that lists every fixture.
 *
 * ⚠️ functions/ is CommonJS — no `import.meta` anywhere under it (TS1343 at predeploy). Everything
 * in functions/eval locates files from the repo root, found by `repoRoot()` below.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface ExpectedEvent {
  type: string;
  date: string | null;
}

export interface ExpectedQuery {
  /** A label for reports: "q7 Clara Voss / Pemberton Literary". */
  label: string;
  /** "" when the writer never recorded a name (an agency-only or unidentified row). */
  agentName: string;
  agency: string;
  /** Scored only when present (the hyperlink fixtures). */
  website?: string;
  status: string;
  /** Other statuses that are equally right — a bare "FULL" cannot say requested or sent. */
  statusAccept?: string[];
  sentDate: string | null;
  timeline: ExpectedEvent[];
  /** Reason codes a correct import raises for this query, and only these. */
  reasons: string[];
  /** Codes neither required nor penalised. */
  reasonsTolerated?: string[];
}

export interface ExpectedFile {
  id: string;
  queries: ExpectedQuery[];
}

export interface ManifestEntry {
  id: string;
  /** Path relative to the repo root. */
  file: string;
  expected: string;
  format: "csv" | "xlsx";
  seed: number;
  layout: string;
  knobs: string[];
  /** Genuine query rows in the truth. */
  rows: number;
  expectedToFail: boolean;
  failReason?: string;
  split: "dev" | "holdout";
}

export interface Manifest {
  note: string;
  generator: string;
  fixtures: ManifestEntry[];
}

/** The repo root: the nearest ancestor of the working directory holding functions/src/smartImportCore.ts.
 *  Fails loudly, naming what it looked for, rather than reading from the wrong place. */
export function repoRoot(start = process.cwd()): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "functions", "src", "smartImportCore.ts"))) return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error(`Could not find the repo root (looked for functions/src/smartImportCore.ts above ${start}). Run from inside the repo.`);
    dir = up;
  }
}

export const FIXTURE_DIR = join("tests", "fixtures", "smart-eval");
export const REAL_DIR = join(FIXTURE_DIR, "real");
