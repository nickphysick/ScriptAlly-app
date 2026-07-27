/**
 * assistAgentData — callable Cloud Function (europe-west2, Blaze plan, Pro-gated).
 *
 * Powers the To-do board's "Find these for me" assisted housekeeping fill. Given a rule and a list of
 * agents, it web-searches each agent's PUBLIC submission fact and returns found values WITH
 * PROVENANCE. It WRITES NOTHING to Firestore — accepting a value is a client-side `updateAgent`, and
 * the writer reviews every value first.
 *
 * The Anthropic API key lives ONLY here (Functions secret ANTHROPIC_API_KEY), never in the browser.
 * Mirrors suggestComps, including the server-side Pro check — client gating alone is not a gate on a
 * paid API.
 *
 * ⚠️ NOT DEPLOYED. Before this can go live, Nick must (1) confirm the ANTHROPIC_API_KEY rotation, then
 * (2) deploy — Claude Code never deploys functions to prod:
 *   cd functions && npm install && npm run build
 *   firebase deploy --only functions:assistAgentData
 * The client stays behind ASSIST_LIVE (default OFF, src/lib/assistFill.ts) until then.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { assistFromModel, MalformedAssistError, isAssistRule, AssistInput, AssistAgentInput, MAX_AGENTS } from "./assistAgentDataCore";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

/* Master switch, mirroring suggestComps — must never ship ungated. */
const ASSIST_REQUIRES_PRO = true;
const PRO_PLAN = "Pro"; // mirrors UserPlan.PRO

const MAX_NAME_CHARS = 200;

export const assistAgentData = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: "europe-west2", timeoutSeconds: 120, memory: "512MiB" },
  async (req) => {
    // 1. Auth
    if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in.");
    const uid = req.auth.uid;

    // 2. Validate input
    const rule = req.data?.rule;
    if (!isAssistRule(rule)) throw new HttpsError("invalid-argument", "Unknown or non-assistable rule.");
    const agentsRaw = req.data?.agents;
    if (!Array.isArray(agentsRaw) || agentsRaw.length === 0) throw new HttpsError("invalid-argument", "No agents supplied.");
    if (agentsRaw.length > MAX_AGENTS) throw new HttpsError("invalid-argument", `Too many agents (max ${MAX_AGENTS}).`);

    const agents: AssistAgentInput[] = [];
    for (const a of agentsRaw) {
      const agentId = String(a?.agentId ?? "").trim();
      const name = String(a?.name ?? "").trim().slice(0, MAX_NAME_CHARS);
      const agency = String(a?.agency ?? "").trim().slice(0, MAX_NAME_CHARS);
      if (!agentId || !name) continue; // an unnamed agent can't be researched
      agents.push({ agentId, name, ...(agency ? { agency } : {}) });
    }
    if (agents.length === 0) throw new HttpsError("invalid-argument", "No researchable agents (need a name).");

    // 3. Plan gate (server-side, not just the UI)
    const userSnap = await db.doc(`users/${uid}`).get();
    const plan = userSnap.get("plan");
    if (ASSIST_REQUIRES_PRO && plan !== PRO_PLAN) {
      throw new HttpsError("permission-denied", "Assisted fill is a Pro feature.");
    }

    // 4. Call Claude (web search) + parse/validate
    const input: AssistInput = { rule, agents };
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    try {
      const found = await assistFromModel(client, input);
      return { found };
    } catch (e: unknown) {
      if (e instanceof MalformedAssistError) {
        console.error("assistAgentData: malformed model output:", e.message);
        throw new HttpsError("internal", "Results came back scrambled. Try again.");
      }
      console.error("assistAgentData: Anthropic call failed:", e);
      throw new HttpsError("unavailable", "Assisted fill isn’t available right now.");
    }
  }
);
