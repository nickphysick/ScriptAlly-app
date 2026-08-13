/**
 * Catalogue verification — PURE CORE (no Firebase, no secrets, injected fetch).
 *
 * ⚠️ THIS IS THE ONE THING THAT MAKES THE CARD'S FOOTER TRUE. "EVERY TITLE CHECKED AGAINST A REAL
 * CATALOGUE — NOTHING INVENTED" cannot be earned by asking the model to be careful; the previous
 * version of this feature did exactly that ("Inventing a title, author or year is far worse than
 * returning fewer suggestions") and that is a promise, not a check. A model that follows the
 * instruction perfectly and a model that hallucinates produce byte-identical output.
 *
 * So the check is CODE, not prose: every candidate is looked up in Google Books and dropped unless
 * a volume actually matches on title AND author. The record this returns is what the client
 * persists and what the ✓ VERIFIED chip renders from — see CompVerification in src/types.ts.
 *
 * ⚠️ AND A FAILED LOOKUP DROPS THE CANDIDATE, NEVER DOWNGRADES IT. There is no unverified path: a
 * title we could not confirm is not a suggestion, because the row would sit under a footer claiming
 * it had been checked.
 *
 * Google Books' public volumes endpoint needs no API key, which is deliberate — a verification step
 * that depends on a second secret is a verification step that silently stops running when the
 * secret expires.
 */

export const CATALOGUE_NAME = "Google Books";
const ENDPOINT = "https://www.googleapis.com/books/v1/volumes";

/** Matches CompVerification in the app's src/types.ts — the client persists this verbatim. */
export interface CatalogueRecord {
  catalogue: string;
  /** ISO — the server's clock, never the client's. */
  checkedAt: string;
  /** The catalogue's own volume id. */
  externalId?: string;
}

export interface CatalogueMatch {
  record: CatalogueRecord;
  /** The catalogue's spelling, which wins over the model's — see the note in `verifyTitle`. */
  title: string;
  author: string;
  /** First publication year according to the catalogue, when it gave one. */
  year?: number;
  publisher?: string;
}

/** The subset of `fetch` this module needs — injected so tests drive it without a network. */
export type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/**
 * ⚠️ COMPARISON IS LOOSE ON PUNCTUATION AND CASE, STRICT ON WORDS. A catalogue's spelling differs
 * from a model's in ways that are not disagreements — smart quotes, a subtitle after a colon, "and"
 * versus "&". Normalising those away avoids dropping real books over typography. What it must NOT
 * do is match different books: the word content still has to correspond.
 */
export function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The part before a colon — catalogues often carry a subtitle the model does not. */
function mainTitle(s: string): string {
  const cut = s.split(":")[0];
  return normaliseForMatch(cut || s);
}

/** A surname match is enough: catalogues vary on initials, middle names and ordering. */
function authorMatches(candidate: string, volumeAuthors: string[]): boolean {
  const wanted = normaliseForMatch(candidate).split(" ").filter(Boolean);
  if (wanted.length === 0) return false;
  const surname = wanted[wanted.length - 1];
  return volumeAuthors.some((a) => normaliseForMatch(a).split(" ").filter(Boolean).includes(surname));
}

interface VolumeInfo {
  title?: unknown;
  subtitle?: unknown;
  authors?: unknown;
  publishedDate?: unknown;
  publisher?: unknown;
}

function yearOf(v: VolumeInfo): number | undefined {
  const raw = typeof v.publishedDate === "string" ? v.publishedDate : "";
  const m = raw.match(/^(\d{4})/);
  if (!m) return undefined;
  const y = Number(m[1]);
  return Number.isInteger(y) && y >= 1000 && y <= 2100 ? y : undefined;
}

/**
 * Look one candidate up. Returns null when the catalogue has nothing that matches — which drops the
 * candidate.
 *
 * ⚠️ THE CATALOGUE'S FACTS WIN OVER THE MODEL'S. Where a volume is found, its title, author, year
 * and publisher replace whatever the model said. The whole point of the check is that the record is
 * the catalogue's, not the model's — carrying the model's year beside a catalogue's verification
 * would put an unverified number inside a verified claim.
 *
 * ⚠️ A NETWORK OR PARSE FAILURE ALSO DROPS THE CANDIDATE. Failing open — "the catalogue was
 * unreachable, so let it through" — would make the footer's claim depend on Google's uptime.
 */
export async function verifyTitle(
  fetchImpl: FetchLike,
  candidate: { title: string; author: string },
  now: () => Date
): Promise<CatalogueMatch | null> {
  const q = `intitle:${candidate.title} inauthor:${candidate.author}`;
  const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&maxResults=5&printType=books`;

  let payload: unknown;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    payload = await res.json();
  } catch {
    return null;
  }

  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return null;

  const wantTitle = mainTitle(candidate.title);
  for (const item of items) {
    const rec = item as { id?: unknown; volumeInfo?: VolumeInfo };
    const info = rec.volumeInfo;
    if (!info || typeof info.title !== "string") continue;
    const authors = Array.isArray(info.authors)
      ? info.authors.filter((a): a is string => typeof a === "string")
      : [];
    if (!authors.length) continue;
    if (mainTitle(info.title) !== wantTitle) continue;
    if (!authorMatches(candidate.author, authors)) continue;

    const externalId = typeof rec.id === "string" && rec.id ? rec.id : undefined;
    return {
      record: {
        catalogue: CATALOGUE_NAME,
        checkedAt: now().toISOString(),
        ...(externalId ? { externalId } : {}),
      },
      title: info.title,
      author: authors[0],
      ...(yearOf(info) !== undefined ? { year: yearOf(info) } : {}),
      ...(typeof info.publisher === "string" && info.publisher ? { publisher: info.publisher } : {}),
    };
  }
  return null;
}
