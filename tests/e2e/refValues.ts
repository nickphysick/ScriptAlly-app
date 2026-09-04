/**
 * READ A VALUE OUT OF THE REF, AT TEST TIME.
 *
 * ⚠️ A LOCK THAT TYPES THE REF'S NUMBERS INTO ITSELF IS A COPY, AND A COPY GOES STALE SILENTLY.
 * It then asserts what somebody once read rather than what the design says, and the day the ref
 * moves the lock keeps passing over a board that no longer matches it. These helpers parse the ref
 * on every run, so the assertion and the design cannot come apart.
 *
 * ⚠️ AND `check-design-refs` GUARDS THE FILE ITSELF, so a ref that changes without being enrolled
 * fails the build before any of this runs. The two together mean: the ref cannot move unnoticed,
 * and while it has not moved these values are the design's own.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ⚠️ THE REF IS A PARAMETER NOW, DEFAULTING TO THE CURRENT DESIGN OF RECORD.
 *
 * v60 supersedes v58 entirely. Hardcoding one path meant every caller silently read the OLD design
 * the moment a new one landed — the same fault this file exists to prevent, one level up: a copy
 * that goes stale without saying so. Callers that want a specific vintage name it; everyone else
 * gets the current one, and moving the default is the one edit that retargets the whole set.
 */
export const REF_V60 = "design-refs/timeline-v60.html";
export const REF_V58 = "design-refs/timeline-v58.html";
const REF = join(process.cwd(), REF_V60);

/** the ref's stylesheet, once */
const sheet = (ref: string = REF): string => {
  const s = readFileSync(ref, "utf8");
  const i = s.indexOf("<style>");
  const j = s.indexOf("</style>", i);
  if (i < 0 || j < 0) throw new Error("the ref has no <style> block — it is not the file we think");
  return s.slice(i + 7, j);
};

/** every `--token: value` on the ref's `:root` */
export function refTokens(): Record<string, string> {
  /**
   * ⚠️ EVERY `:root`, IN ORDER — v60 DECLARES THREE OF THEM AND THIS READ ONLY THE FIRST.
   *
   * `exec` returns one match, so `--badge`, `--agent-w` and `--rail-h` — all declared in later
   * `:root` blocks — came back `undefined`. That failed loudly here only because this lock asks for
   * the value with no fallback; the badge case in `calSurface60` wrote `refTokens()["--badge"] ??
   * "58px"` and had been **passing on its own fallback**, asserting a number typed into the test
   * against a ref it never actually read. Same fault as the `?? "10px"` fixed in this file
   * yesterday, one function along.
   *
   * Later declarations overwrite earlier ones, which is what the cascade does.
   */
  const out: Record<string, string> = {};
  for (const m of sheet().matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const d of m[1].split(";")) {
      const k = d.indexOf(":");
      if (k < 0) continue;
      const name = d.slice(0, k).trim();
      if (name.startsWith("--")) out[name] = d.slice(k + 1).trim();
    }
  }
  if (!Object.keys(out).length) throw new Error("the ref's :root parsed to nothing");
  return out;
}

/**
 * The declarations of one rule, by exact selector.
 *
 * ⚠️ IT REFUSES A SELECTOR THAT APPEARS TWICE. Where a rule is declared more than once the cascade
 * takes the LAST and a reader takes the FIRST, so a helper that returns "the rule" is answering a
 * question with two answers — the duplicate-declaration fault this repo has met in three sheets.
 */
export function refRule(selector: string): Record<string, string> {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|\\n|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, "g");
  const hits: string[] = [];
  for (let m = re.exec(sheet()); m; m = re.exec(sheet())) hits.push(m[1]);
  if (!hits.length) throw new Error(`the ref has no rule for "${selector}"`);
  if (hits.length > 1) throw new Error(`the ref declares "${selector}" ${hits.length} times — ambiguous`);
  const out: Record<string, string> = {};
  for (const d of hits[0].split(";")) {
    const k = d.indexOf(":");
    if (k < 0) continue;
    out[d.slice(0, k).trim()] = d.slice(k + 1).trim();
  }
  return out;
}

/** a `#rrggbb` (or a `var(--x)` resolved through the ref's own tokens) as the browser's `rgb(...)` */
export function refColour(value: string): string {
  const v = value.trim();
  const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(v);
  if (m) return refColour(refTokens()[m[1]] ?? "");
  /* ⚠️ THREE-DIGIT HEX TOO. The ref writes `#fff` for the card's fill and `#e2d4be` for its
     border, in the same declaration — a six-digit-only parser reads one and throws on the other,
     which reads as "the ref is malformed" rather than "this helper is". */
  const h = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (!h) throw new Error(`not a hex colour the ref can resolve: "${value}"`);
  const hex = h[1].length === 3 ? h[1].split("").map((c) => c + c).join("") : h[1];
  const n = parseInt(hex, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}
