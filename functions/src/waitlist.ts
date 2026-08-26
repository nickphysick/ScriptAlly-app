/**
 * waitlist — HTTP Cloud Function (europe-west2, Blaze plan).
 *
 * Backs the founding-writer signup, which is mounted on THREE surfaces — the landing hero's panel,
 * the `/founders` hero and the sealed band at the foot of both pages — plus the legacy holding
 * page. Reached same-origin via a Firebase Hosting rewrite `/api/waitlist → this function`.
 *
 * ⚠️ THE REWRITE MUST PIN THE REGION. These are v2 functions in `europe-west2`; the short
 * `"function": "waitlist"` form looks up a DEFAULT-region function, finds nothing, hosting 404s,
 * and the SPA catch-all turns that into `200 text/html`. The client checks `content-type` before
 * it believes a body precisely because of this. See CLAUDE.md for the block and the deploy order.
 *
 * ⚠️ IT WRITES THROUGH THE ADMIN SDK AND BYPASSES SECURITY RULES. `waitlist`, `counters` and
 * `ratelimits` are denied to every client in `firestore.rules`; this function is the only writer.
 *
 *   GET  /api/waitlist          → { visible, cap, count? }        — `count` ABSENT below the floor
 *   POST /api/waitlist          → { ok, alreadyJoined?, full?, count?, cap, position? }
 *   GET  /api/waitlist/verify?token=…  → 302 to /founders?verified=…
 *
 * The decisions live in `waitlistModel.ts`; the transactions live in `waitlistStore.ts`. What is
 * here is method, origin, content-type, size and response shape.
 */

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import {
  ALLOWED_ORIGINS, GET_CACHE_SECONDS, MAX_BODY_BYTES, MIN_SUBMIT_MS, REQUIRE_VERIFICATION,
  countPayload, ipHash, judgeJoin, normaliseEmail, readSource,
} from "./waitlistModel";
import { consumeRateLimit, joinWaitlist, readCounterState, verifyWaitlist } from "./waitlistStore";

if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

/**
 * ⚠️ THE IP SALT IS A SECRET AND NEVER HAS A DEFAULT IN CODE. A hard-coded fallback would look
 * like a salt and provide none — anyone with the repo could reverse every stored hash by
 * enumerating IPv4. When it is unset the function still works and simply stores no `ipHash`:
 * rate limiting degrades to per-window-without-identity rather than the build failing closed on a
 * public signup form.
 */
const IP_HASH_SALT = defineSecret("WAITLIST_IP_SALT");

/** The public origin a verify link lands on. Overridden per environment by hosting, not by code. */
const FOUNDERS_PATH = "/founders";

const jsonHeaders = (res: { set: (k: string, v: string) => void }, origin: string | undefined) => {
  /* ⚠️ AN ORIGIN IS ALLOWED OR IT IS NOT ECHOED. Reflecting whatever arrived is the same as having
     no allowlist while looking like having one. Same-origin requests send no `Origin` at all and
     need no header — which is how all four real surfaces reach this. */
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
};

export const waitlist = onRequest(
  { region: "europe-west2", timeoutSeconds: 30, memory: "256MiB", secrets: [IP_HASH_SALT] },
  async (req, res) => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    jsonHeaders(res, origin);

    try {
      /* ⚠️ A CROSS-ORIGIN REQUEST FROM AN UNLISTED HOST IS REFUSED, NOT SERVED. The browser would
         block the response anyway, but a server that answers is a server that did the work. */
      if (origin && !ALLOWED_ORIGINS.includes(origin)) {
        res.status(403).json({ ok: false, error: "Not permitted." });
        return;
      }

      const path = (req.path || "").replace(/\/+$/, "");
      const isVerify = path.endsWith("/verify");

      /* ── The verify link ── */
      if (isVerify) {
        if (req.method !== "GET") { res.status(405).json({ ok: false, error: "Method not allowed." }); return; }
        const token = typeof req.query.token === "string" ? req.query.token : "";
        if (!token) { res.redirect(302, `${FOUNDERS_PATH}?verified=unknown`); return; }
        const outcome = await verifyWaitlist(db, token, Date.now());
        /* ⚠️ A REDIRECT, NOT JSON. This URL is opened by a person from their email client, so the
           answer has to be a page. `/founders` reads the parameter and says what happened. */
        res.redirect(302, `${FOUNDERS_PATH}?verified=${outcome.kind}`);
        return;
      }

      /* ── The count ── */
      if (req.method === "GET") {
        const counter = await readCounterState(db);
        /* ⚠️ CACHED AT THE EDGE. Three mounted forms ask on every page view for a number that
           moves a handful of times a day; without this every visit is an invocation and a read. */
        res.set("Cache-Control", `public, max-age=${GET_CACHE_SECONDS}`);
        res.status(200).json(countPayload(counter));
        return;
      }

      /* ── Joining ── */
      if (req.method === "POST") {
        const ctype = String(req.headers["content-type"] ?? "");
        if (!ctype.toLowerCase().includes("application/json")) {
          res.status(415).json({ ok: false, error: "Expected JSON." });
          return;
        }
        /* ⚠️ SIZE IS CHECKED BEFORE THE BODY IS TRUSTED. `rawBody` is what actually arrived; the
           parsed object cannot tell you how much was sent. */
        const size = Buffer.isBuffer(req.rawBody) ? req.rawBody.length : 0;
        if (size > MAX_BODY_BYTES) {
          res.status(413).json({ ok: false, error: "That request was too large." });
          return;
        }

        let body: Record<string, unknown> = {};
        if (req.body && typeof req.body === "object") body = req.body as Record<string, unknown>;
        else if (typeof req.body === "string") { try { body = JSON.parse(req.body); } catch { body = {}; } }

        const email = normaliseEmail(body.email);
        const source = readSource(body.source);
        const verdict = judgeJoin({ email, trap: body.website, elapsedMs: body.elapsedMs });

        /* Hashed here rather than at the rate limit, so a SILENT rejection can be logged with it.
           No I/O — the rate limit's transaction still runs where it did. */
        const rawIp = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim()
          || req.ip || "";
        const salt = IP_HASH_SALT.value();
        const hashedIp = rawIp && salt ? ipHash(rawIp, salt) : null;

        /* ⚠️ A HONEYPOT HIT AND A TOO-FAST SUBMIT BOTH LOOK LIKE SUCCESS AND WRITE NOTHING.
           Telling a bot which check it failed is telling it what to change. */
        if (verdict.kind === "honeypot" || verdict.kind === "too-fast") {
          /* ⚠️ THE ONLY TRACE A SILENT GUARD LEAVES. Both branches answer `ok` and write no
             document, so without this line there is no way to know whether they are catching bots
             or customers — and the timing guard's false positive is a real writer who believes
             they hold a founding place and does not. If this fires twenty times a day on
             `landing-panel`, it is eating signups and the number is how we find out.
             ⚠️ AND IT CARRIES NO ADDRESS, hashed or otherwise. A log line is not the place for one:
             logs are read by more people, kept in more places and retained on someone else's
             schedule. The hashed IP is enough to tell one abuser from twenty writers. */
          console.warn(JSON.stringify({
            event: "waitlist.silent_reject",
            guard: verdict.kind,
            source,
            ipHash: hashedIp ?? null,
            ...(verdict.kind === "too-fast"
              ? { elapsedMs: typeof body.elapsedMs === "number" ? body.elapsedMs : null,
                  thresholdMs: MIN_SUBMIT_MS }
              : {}),
          }));
          const counter = await readCounterState(db);
          res.status(200).json({ ok: true, ...countPayload(counter) });
          return;
        }

        /* ⚠️ THE RATE LIMIT RUNS BEFORE VALIDATION, so malformed attempts are not free. */
        if (hashedIp) {
          const { allowed } = await consumeRateLimit(db, hashedIp, Date.now());
          if (!allowed) {
            res.status(429).json({ ok: false, error: "Too many attempts. Please try again later." });
            return;
          }
        }

        if (verdict.kind === "bad-email") {
          res.status(400).json({ ok: false, error: "Please enter a valid email address." });
          return;
        }

        const result = await joinWaitlist(db, {
          emailNormalised: email,
          hashedIp,
          source,
          nowMs: Date.now(),
          requireVerification: REQUIRE_VERIFICATION,
        });

        /* ⚠️ THE RESPONSE IS ADDITIVE OVER WHAT THE CLIENT ALREADY READS. `ok`, `alreadyJoined`,
           `count` and `cap` keep their meanings; `full` is the one new flag, and a client that
           does not know it simply reads a successful join — which is what a waiting-list place is.
           The counter fields come from `countPayload`, so the floor applies to the join response
           too: a number that is public here is public. */
        res.status(200).json({
          ok: true,
          ...countPayload(result.counter),
          ...(result.outcome === "already" ? { alreadyJoined: true } : {}),
          ...(result.outcome === "waiting" ? { full: true } : {}),
          ...(result.position !== null ? { position: result.position } : {}),
        });
        return;
      }

      res.status(405).json({ ok: false, error: "Method not allowed." });
    } catch (e) {
      /* Log the real cause; never leak internals to the caller. */
      console.error("waitlist: request failed:", e);
      res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
    }
  },
);
