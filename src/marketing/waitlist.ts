/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The founding-members waitlist client: one `POST` to join, one `GET` for the count, and the pure
 * classification of what came back.
 *
 * ⚠️ THE STATUS CODE IS NOT EVIDENCE, AND ON THIS SITE IT IS ACTIVELY MISLEADING. Both app hosts
 * serve a single-page app behind a `** → /index.html` catch-all, so a request to an API path that
 * has no rewrite does not 404 — it returns **200 with `text/html`**. Measured on both:
 *
 *     GET https://scriptally-dev.web.app/api/waitlist → 200 text/html
 *     GET https://scriptally-app.web.app/api/waitlist → 200 text/html
 *
 * `res.ok` is therefore `true` for a route that does not exist, and `res.json()` throws on
 * `<!doctype`. A client that trusted `res.ok` would tell a reader they were on the list because
 * the page they are reading was served back to them. The content type is checked BEFORE the body
 * is believed, and the parse is wrapped even then.
 *
 * ⚠️ AND THE TWO FAILURES ARE DIFFERENT FACTS. "The route is not wired" (HTML, an unparseable
 * body, a network error) is `down`: retrying cannot help, so the form goes away and the reader is
 * given an address. "A real answer that says no" (JSON with a 4xx or 5xx) is `error`: retrying can
 * help, so the form stays. Collapsing them tells one of the two readers to do something useless.
 *
 * ⚠️ NOTHING HERE CAN PRODUCE `full`. The function returns `cap` in every response and has no
 * branch that enforces it, so a 101st sign-up succeeds and is told it is in. Deciding "full" from
 * `count >= cap` on the client would be this file inventing a policy the server does not hold —
 * and two browsers racing past 100 would both be told they were in. See `FOUNDING_FULL`.
 *
 * ⚠️ NOT DEPLOYED, AND NOT ROUTED. `functions/src/waitlist.ts` exists in source and
 * `firebase functions:list` shows it on NEITHER project; only `firebase.holding.json` carries an
 * `/api/waitlist` rewrite, and the holding page's own form is a placeholder that never calls it.
 * So every join today classifies as `down`, correctly. Making it work is a functions deploy plus a
 * rewrite in `firebase.json` / `firebase.dev.json` — Nick's to run.
 */

export const WAITLIST_ENDPOINT = "/api/waitlist";

/**
 * ⚠️ THE HONEYPOT'S FIELD NAME IS THE BAIT, and it is deliberately the same string as
 * `CONTACT_HONEYPOT_FIELD` in `src/lib/contactTransport.ts` WITHOUT sharing a constant with it.
 * A shared one would couple two unrelated forms so that renaming this form's bait silently
 * renames the contact form's — and the rename would look correct in the diff. Same value, two
 * declarations, on purpose. `functions/src/waitlist.ts` reads `body.website`.
 */
export const WAITLIST_HONEYPOT_FIELD = "website";

/**
 * Which surface a sign-up came from. These strings are the server's — `readSource` in
 * `functions/src/waitlistModel.ts` accepts exactly these and folds anything else to `unknown`.
 *
 * ⚠️ PASSED EXPLICITLY BY EACH MOUNT, NEVER DERIVED. `idPrefix` happens to be one value per
 * surface today, but it exists to keep DOM ids unique — the day someone renames one for a DOM
 * reason the analytics would quietly lie. And it cannot come from the URL either: the sealed band
 * renders on two different pages.
 */
export type WaitlistSource = "landing-panel" | "founders-hero" | "sealed-band";

/** How long to wait before treating a request as unanswerable. */
export const WAITLIST_TIMEOUT_MS = 10_000;

export interface WaitlistCount {
  claimed: number;
  cap: number;
}

/**
 * What a request came back as, reduced to the three cases that decide anything. Separating this
 * from the classification is what lets the classification be tested without a fake `fetch`: the
 * interesting logic is pure and the I/O is four lines.
 */
export type RawResponse =
  /** `fetch` itself rejected — offline, DNS, CORS, an aborted timeout. */
  | { kind: "network" }
  /** An answer arrived that is not JSON, or claimed to be and would not parse. */
  | { kind: "non-json"; status: number }
  | { kind: "json"; status: number; ok: boolean; body: unknown };

export type JoinOutcome =
  | { state: "sent"; count: WaitlistCount | null }
  | { state: "dupe"; count: WaitlistCount | null }
  /**
   * ⚠️ REACHABLE NOW. `FoundingState` has declared `full` since the sealed band was built, and
   * nothing could produce it: the function returned `cap` in every response and enforced it
   * nowhere, so a 101st sign-up succeeded and was told it was in. The function now writes
   * `status: "waiting"` past the cap and answers `full: true`, and this is the member that
   * carries it. Purely additive — every existing branch keeps its meaning.
   */
  | { state: "full"; count: WaitlistCount | null }
  | { state: "error" }
  | { state: "down" };

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;

/**
 * The count, if the body genuinely carries one.
 *
 * ⚠️ BOTH FIGURES OR NEITHER. A count without a cap cannot be drawn as a proportion, and a cap of
 * zero would divide by it. Absence here means the counter renders nothing at all — never a zero,
 * never an empty bar.
 */
export const readCount = (body: unknown): WaitlistCount | null => {
  if (!body || typeof body !== "object") return null;
  const claimed = num((body as Record<string, unknown>).count);
  const cap = num((body as Record<string, unknown>).cap);
  if (claimed === null || cap === null || cap === 0) return null;
  return { claimed, cap };
};

/** What a join attempt means. Pure — see the docblock for why. */
export const classifyJoin = (raw: RawResponse): JoinOutcome => {
  if (raw.kind === "network" || raw.kind === "non-json") return { state: "down" };
  if (!raw.ok) return { state: "error" };
  const body = (raw.body ?? {}) as Record<string, unknown>;
  /* ⚠️ A 200 THAT DOES NOT SAY `ok` IS STILL A FAILURE. The function answers `{ ok: true, … }`;
     anything else arriving with a 2xx is an answer we do not understand, and treating an
     unrecognised body as success is how a reader gets told they are on a list they are not on. */
  if (body.ok !== true) return { state: "error" };
  /* ⚠️ `full` IS CHECKED BEFORE `alreadyJoined`, and the order is deliberate: a person who joins
     the waiting list after the cap fills is `full`, not `sent`, even though the write succeeded.
     Both flags are absent on an ordinary join, so this reads as one `if` on a normal day. */
  if (body.full === true) return { state: "full", count: readCount(body) };
  return { state: body.alreadyJoined === true ? "dupe" : "sent", count: readCount(body) };
};

/** One request, reduced to a `RawResponse`. The only impure thing in this file. */
const request = async (init: RequestInit): Promise<RawResponse> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WAITLIST_TIMEOUT_MS);
  try {
    const res = await fetch(WAITLIST_ENDPOINT, { ...init, signal: controller.signal });
    /* ⚠️ THE CONTENT TYPE IS CHECKED BEFORE THE BODY IS TOUCHED. See the docblock: a missing route
       here answers 200 with the SPA's own HTML, so `res.ok` proves nothing. */
    if (!(res.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
      return { kind: "non-json", status: res.status };
    }
    try {
      return { kind: "json", status: res.status, ok: res.ok, body: await res.json() };
    } catch {
      /* Claimed JSON, was not. Same conclusion as HTML: the route is not answering properly. */
      return { kind: "non-json", status: res.status };
    }
  } catch {
    return { kind: "network" };
  } finally {
    clearTimeout(timer);
  }
};

export interface JoinFields {
  email: string;
  /** The honeypot's value. Empty for every real person; sent regardless. */
  trap: string;
  /** Milliseconds from the FORM MOUNTING to the submit — not from page load. */
  elapsedMs: number;
  source: WaitlistSource;
}

/**
 * ⚠️ ADDITIVE, AND BOTH DIRECTIONS STILL WORK. The server tolerates all three new fields being
 * absent — `judgeJoin` treats a missing trap and a missing timer as a pass, and `readSource` folds
 * a missing source to `unknown` — so an older client against this server behaves exactly as it did.
 * The reverse holds too: these fields on the pre-cap server are simply ignored properties on a
 * parsed body. Neither end has to ship first.
 */
export const joinWaitlist = async (fields: JoinFields): Promise<JoinOutcome> =>
  classifyJoin(await request({
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      email: fields.email,
      [WAITLIST_HONEYPOT_FIELD]: fields.trap,
      elapsedMs: fields.elapsedMs,
      source: fields.source,
    }),
  }));

/**
 * The live count, or `null`.
 *
 * ⚠️ A FAILED READ HIDES THE COUNTER AND NOTHING ELSE. It deliberately does not put the band into
 * `down`: a `GET` that did not answer is not proof that a `POST` would not, and presenting the
 * whole offer as broken on the strength of one flaky request would be a worse error than an absent
 * counter. The form stays until someone actually tries.
 */
export const fetchWaitlistCount = async (): Promise<WaitlistCount | null> => {
  const raw = await request({ method: "GET", headers: { Accept: "application/json" } });
  return raw.kind === "json" && raw.ok ? readCount(raw.body) : null;
};
