/**
 * Discover v1 — lock A1: the four new stores' rules. `scoutDecisions`, `scoutShares`, `discoverPrefs` and
 * `agentSubmissions` accept the shapes the page writes and refuse extra keys, other users and wrong values.
 *
 * ⚠️ PROVED RED FIRST: `SA_RULES_FILE=<the rules with one hasOnly check dropped> npm run test:rules` turns the
 * "an extra key is denied" cases red (reports/discover-v1/mutation-proofs.jsonl).
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = process.env.SA_RULES_FILE ? resolve(process.env.SA_RULES_FILE) : resolve(__dirname, "../../firestore.rules");
const U = "dv1-writer";
const OTHER = "dv1-other";
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-scriptally-dv1",
    firestore: { rules: readFileSync(RULES_PATH, "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });
afterEach(async () => { await env.clearFirestore(); });

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const seed = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), path), data); });

const added = { decision: "added", at: "2026-10-18T12:00:00.000Z", manuscriptId: "ms-1" };
const passed = { decision: "passed", at: "2026-10-18T12:00:00.000Z", manuscriptId: "ms-1", until: "2027-10-18T12:00:00.000Z" };

describe("A1 · scoutDecisions", () => {
  it("the owner may record an add and a pass, read them, and delete one (Bring back / Undo)", async () => {
    await assertSucceeds(setDoc(doc(as(U), `users/${U}/scoutDecisions/ca-aoife-murphy`), added));
    await assertSucceeds(setDoc(doc(as(U), `users/${U}/scoutDecisions/ca-diane-osei`), passed));
    await assertSucceeds(getDoc(doc(as(U), `users/${U}/scoutDecisions/ca-diane-osei`)));
    await assertSucceeds(deleteDoc(doc(as(U), `users/${U}/scoutDecisions/ca-diane-osei`)));
  });
  it("an extra key is denied", async () => {
    await assertFails(setDoc(doc(as(U), `users/${U}/scoutDecisions/ca-a`), { ...added, note: "hi" }));
  });
  it("a pass without until, or an add with one, is denied", async () => {
    await assertFails(setDoc(doc(as(U), `users/${U}/scoutDecisions/ca-a`), { decision: "passed", at: passed.at, manuscriptId: "ms-1" }));
    await assertFails(setDoc(doc(as(U), `users/${U}/scoutDecisions/ca-a`), { ...added, until: passed.until }));
  });
  it("a decision outside the enum is denied", async () => {
    await assertFails(setDoc(doc(as(U), `users/${U}/scoutDecisions/ca-a`), { ...added, decision: "skipped" }));
  });
  it("another writer may neither read nor write it", async () => {
    await seed(`users/${U}/scoutDecisions/ca-a`, added);
    await assertFails(getDoc(doc(as(OTHER), `users/${U}/scoutDecisions/ca-a`)));
    await assertFails(setDoc(doc(as(OTHER), `users/${U}/scoutDecisions/ca-b`), added));
  });
});

describe("A1 · scoutShares", () => {
  it("the owner may create the echo once and delete it", async () => {
    await assertSucceeds(setDoc(doc(as(U), `users/${U}/scoutShares/agent-1`), { at: "2026-10-18T12:00:00.000Z" }));
    await assertFails(setDoc(doc(as(U), `users/${U}/scoutShares/agent-1`), { at: "2026-10-19T12:00:00.000Z" }));
    await assertSucceeds(deleteDoc(doc(as(U), `users/${U}/scoutShares/agent-1`)));
  });
  it("an extra key is denied, and so is another writer", async () => {
    await assertFails(setDoc(doc(as(U), `users/${U}/scoutShares/agent-1`), { at: "x", notes: "no" }));
    await assertFails(setDoc(doc(as(OTHER), `users/${U}/scoutShares/agent-1`), { at: "x" }));
  });
});

describe("A1 · discoverPrefs on the user document", () => {
  const user = { id: U, name: "Writer", email: "w@example.com", plan: "Pro", trialStartDate: "2026-01-01", subscriptionStatus: "active" };
  it("a leaf write is allowed", async () => {
    await seed(`users/${U}`, user);
    await assertSucceeds(updateDoc(doc(as(U), `users/${U}`), { "discoverPrefs.lens": "fast" }));
    await assertSucceeds(updateDoc(doc(as(U), `users/${U}`), { "discoverPrefs.openOnly": false }));
  });
  it("discoverPrefs that is not a map is denied", async () => {
    await seed(`users/${U}`, user);
    await assertFails(updateDoc(doc(as(U), `users/${U}`), { discoverPrefs: "best" }));
  });
});

describe("A1 · agentSubmissions", () => {
  const sub = (uid: string, src = "agent-1", extra: Record<string, unknown> = {}) => ({
    userId: uid, sourceAgentId: src, createdAt: "2026-10-18T12:00:00.000Z",
    name: "Sam Ferrier", agency: "Larkspur Literary", website: "larkspur.ie", genres: ["Literary Fiction"],
    mswlNotes: "Fathers and sons.", responseTimeWeeks: 4, noResponseMeansNo: false, ...extra,
  });
  it("a writer may create their own, at their own deterministic id", async () => {
    await assertSucceeds(setDoc(doc(as(U), `agentSubmissions/${U}_agent-1`), sub(U)));
  });
  it("a second create of the same agent (an update) is denied", async () => {
    await seed(`agentSubmissions/${U}_agent-1`, sub(U));
    await assertFails(setDoc(doc(as(U), `agentSubmissions/${U}_agent-1`), sub(U)));
  });
  it("private fields are denied — notes, a rating", async () => {
    await assertFails(setDoc(doc(as(U), `agentSubmissions/${U}_agent-1`), sub(U, "agent-1", { notes: "private" })));
    await assertFails(setDoc(doc(as(U), `agentSubmissions/${U}_agent-1`), sub(U, "agent-1", { starRating: 5 })));
  });
  it("another writer's name, or an id that is not uid_source, is denied", async () => {
    await assertFails(setDoc(doc(as(U), `agentSubmissions/${OTHER}_agent-1`), sub(OTHER)));
    await assertFails(setDoc(doc(as(U), `agentSubmissions/${U}_agent-2`), sub(U, "agent-1")));
  });
  it("nobody but the admin may read the queue", async () => {
    await seed(`agentSubmissions/${U}_agent-1`, sub(U));
    await assertFails(getDoc(doc(as(U), `agentSubmissions/${U}_agent-1`)));
  });
});
