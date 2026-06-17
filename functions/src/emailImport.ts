/**
 * extractFromEmail — callable Cloud Function (europe-west2, Blaze plan, Pro-gated).
 *
 * Takes a pasted email + minimal context flags, reads the caller's own agents/queries server-side,
 * asks Claude what to log, and returns a structured proposal. It WRITES NOTHING to Firestore — the
 * UI and the commit step are separate, later prompts.
 *
 * The Anthropic API key lives ONLY here (Functions secret ANTHROPIC_API_KEY), never in the browser.
 * Mirrors the smartImportMap setup.
 *
 * Setup (one-off, run by Nick — same secret as Smart Import):
 *   firebase functions:secrets:set ANTHROPIC_API_KEY     # already set if Smart Import is live
 *   cd functions && npm install && npm run build
 *   firebase deploy --only functions:extractFromEmail
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import {
  extractProposal,
  MalformedProposalError,
  ContextAgent,
  ContextQuery,
  ContextRung,
  ExistingContext,
} from "./emailImportCore";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

/* ── Plan gate ─────────────────────────────────────────────────────────────
 *  The real entitlement field EXISTS on the user doc: User.plan === "Pro" (UserPlan.PRO in
 *  src/types.ts). This master switch lets the whole feature be opened to all tiers in one line if
 *  ever needed — but it must never ship ungated, so it defaults to true. ── */
const EMAIL_IMPORT_REQUIRES_PRO = true;
const PRO_PLAN = "Pro"; // mirrors UserPlan.PRO

/* Caps to keep the model payload small. */
const MAX_AGENTS = 60;
const MAX_QUERIES = 50;
const MAX_RUNGS_PER_QUERY = 6;
const MAX_EMAIL_CHARS = 50_000;

export const extractFromEmail = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: "europe-west2", timeoutSeconds: 60, memory: "512MiB" },
  async (req) => {
    // 1. Auth
    if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in.");
    const uid = req.auth.uid;

    const manuscriptId = (req.data?.manuscriptId ?? "") as string;
    const direction = req.data?.direction as "received" | "sent";
    const emailText = (req.data?.emailText ?? "") as string;

    if (!manuscriptId.trim()) throw new HttpsError("invalid-argument", "Missing manuscriptId.");
    if (direction !== "received" && direction !== "sent") {
      throw new HttpsError("invalid-argument", "direction must be 'received' or 'sent'.");
    }
    if (!emailText.trim()) throw new HttpsError("invalid-argument", "No email text.");
    if (emailText.length > MAX_EMAIL_CHARS) throw new HttpsError("invalid-argument", "Email too long.");

    // 2. Plan gate (server-side, not just the UI)
    const userSnap = await db.doc(`users/${uid}`).get();
    const plan = userSnap.get("plan");
    if (EMAIL_IMPORT_REQUIRES_PRO && plan !== PRO_PLAN) {
      throw new HttpsError("permission-denied", "Email import is a Pro feature.");
    }

    // 3. Read context server-side (the client never supplies agent/query data)
    const context = await readContext(uid, manuscriptId);

    // 4. Call Claude + 5. parse/validate (inside extractProposal)
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    try {
      // 6. Return the proposal — no Firestore writes anywhere in this function.
      return await extractProposal(client, { manuscriptId, direction, emailText, context });
    } catch (e: any) {
      if (e instanceof MalformedProposalError) {
        console.error("extractFromEmail: malformed model output:", e.message);
        throw new HttpsError("internal", "Couldn't read that email cleanly. Try again.");
      }
      // Transport / API / quota error — log the cause, return a safe generic message.
      console.error("extractFromEmail: Anthropic call failed:", e);
      throw new HttpsError("unavailable", "Couldn't read the email right now.");
    }
  }
);

/** Read the caller's agents and the queries (+ recent rungs) for one manuscript into a compact,
 *  capped context object. All reads are scoped to users/{uid}/… so a caller only ever sees their own
 *  data. Rungs come from the per-query `activity` subcollection (status + date only). */
async function readContext(uid: string, manuscriptId: string): Promise<ExistingContext> {
  const agentsSnap = await db.collection(`users/${uid}/agents`).limit(MAX_AGENTS).get();
  const agents: ContextAgent[] = agentsSnap.docs.map((d) => ({
    id: d.id,
    agency: (d.get("agency") as string) || "",
    name: ((d.get("name") as string) || "").trim() || null,
  }));

  const queriesSnap = await db
    .collection(`users/${uid}/queries`)
    .where("manuscriptId", "==", manuscriptId)
    .limit(MAX_QUERIES)
    .get();

  const queries: ContextQuery[] = [];
  for (const qd of queriesSnap.docs) {
    const rungsSnap = await db.collection(`users/${uid}/queries/${qd.id}/activity`).get();
    const rungs: ContextRung[] = rungsSnap.docs
      .map((rd) => {
        const status = (rd.get("resultingStatus") as string) || (rd.get("type") as string) || "";
        return { status, date: rungDateISO(rd), _ms: rungMillis(rd) };
      })
      .filter((r) => !!r.status)
      // oldest → newest; some legacy rungs may lack createdAt (sort them first)
      .sort((a, b) => a._ms - b._ms)
      .slice(-MAX_RUNGS_PER_QUERY)
      .map((r) => ({ status: r.status, date: r.date }));

    queries.push({
      id: qd.id,
      agentId: (qd.get("agentId") as string) || "",
      status: (qd.get("status") as string) || "",
      rungs,
    });
  }

  return { agents, queries };
}

/** A rung's display date as ISO YYYY-MM-DD, from its `createdAt` Timestamp or a legacy `date` string. */
function rungDateISO(rd: admin.firestore.QueryDocumentSnapshot): string | null {
  const createdAt = rd.get("createdAt");
  if (createdAt && typeof createdAt.toDate === "function") {
    return createdAt.toDate().toISOString().slice(0, 10);
  }
  const date = rd.get("date");
  if (typeof date === "string" && date.length >= 10) return date.slice(0, 10);
  return null;
}

/** Sortable millis for a rung (createdAt Timestamp → ms, legacy date string → ms, else 0). */
function rungMillis(rd: admin.firestore.QueryDocumentSnapshot): number {
  const createdAt = rd.get("createdAt");
  if (createdAt && typeof createdAt.toMillis === "function") return createdAt.toMillis();
  const date = rd.get("date");
  if (typeof date === "string") {
    const ms = Date.parse(date);
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}
