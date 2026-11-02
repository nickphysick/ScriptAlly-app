/**
 * The live (landing-only) site's hosting redirect (launch readiness, 2 Nov).
 *
 * Firebase Hosting applies `redirects` BEFORE it serves static files, so a catch-all would also send
 * /assets/…, /images/… and /api/waitlist home. Its regex dialect (RE2) has no lookahead, so "everything
 * except these" cannot be written directly. This builds it instead: a path whose FIRST SEGMENT has no dot
 * and is not one of `KEEP` goes to `/` with a 301. Files at the top level all have a dot, so they are
 * never matched; `/` itself has an empty first segment and is never matched either.
 *
 *   node scripts/landingRedirect.mjs        prints the regex
 *
 * `src/lib/landingRedirect.test.ts` holds firebase.json's entry equal to `landingRedirectRegex()` and
 * checks how it behaves, so the JSON is never edited by hand.
 */
export const KEEP = ["welcome", "privacy", "api", "assets", "images", "status-dots"];

const esc = (c) => (/[\\\]\-^]/.test(c) ? "\\" + c : c);
const ANY = "[^/.]";

/** A regex for the non-empty strings over [^/.] that are not one of `words`. */
export function complementOf(words) {
  const trie = {};
  for (const w of words) { let n = trie; for (const c of w) n = n[c] ??= {}; n.$ = true; }
  const node = (n, root) => {
    const kids = Object.keys(n).filter((k) => k !== "$").sort();
    const alts = [];
    if (kids.length) alts.push(`[^/.${kids.map(esc).join("")}]${ANY}*`);
    else alts.push(`${ANY}+`);
    for (const k of kids) {
      const sub = node(n[k], false);
      alts.push(esc(k) + sub);
    }
    const body = alts.length === 1 ? alts[0] : `(?:${alts.join("|")})`;
    /* Stopping here is allowed unless this is the root (the segment would be empty) or a kept word. */
    return root || n.$ ? body : `(?:${body})?`;
  };
  return node(trie, true);
}

export const landingRedirectRegex = () => `^/${complementOf(KEEP)}(?:/.*)?$`;

if (import.meta.url === `file://${process.argv[1]}`) console.log(landingRedirectRegex());
