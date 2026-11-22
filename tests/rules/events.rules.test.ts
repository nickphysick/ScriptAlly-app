/**
 * Dashboard first visit v2, Part I — FV2 I1: `events`. One fresh-account walk (signed up, the tour skipped at stop 2, the
 * first agent, the first query, the reminder answered yes) writes exactly those events, in order, with their props,
 * through the app's own `buildEvent`; a client read is denied; an extra field, another writer's uid, a client-set
 * time, free text in props, an update and a delete are all denied.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { buildEvent, type EventName, type EventPath, type EventProps } from "../../src/lib/events";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = process.env.SA_RULES_FILE ? resolve(process.env.SA_RULES_FILE) : resolve(__dirname, "../../firestore.rules");
const U = "fv2-new-writer";
const OTHER = "fv2-other";
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-scriptally-fv2i",
    firestore: { rules: readFileSync(RULES_PATH, "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });
afterEach(async () => { await env.clearFirestore(); });

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const write = (uid: string, name: EventName, path: EventPath, props: EventProps = {}) =>
  addDoc(collection(as(uid), "events"), { ...buildEvent(uid, name, path, props), at: serverTimestamp() });

describe("FV2 I1 · events", () => {
  it("a fresh-account walk writes exactly its events, in order, with the right props", async () => {
    const walk: [EventName, EventPath, EventProps][] = [
      ["signed_up", "ready", { path: "ready" }],
      ["dashboard_first_seen", "ready", {}],
      ["tour_skipped", "ready", { stop: 2 }],
      ["first_agent", "ready", {}],
      ["first_query", "ready", {}],
      ["reminder_answered", "ready", { answer: "yes" }],
    ];
    for (const [n, p, props] of walk) { await assertSucceeds(write(U, n, p, props)); await new Promise((r) => setTimeout(r, 15)); }
    /* ⚠️ withSecurityRulesDisabled hands back nothing: the read is captured outside it */
    let rows: Record<string, unknown>[] = [];
    await env.withSecurityRulesDisabled(async (c) => {
      const s = await getDocs(query(collection(c.firestore(), "events"), orderBy("at")));
      rows = s.docs.map((d) => d.data());
    });
    expect(rows.map((r) => r.name)).toEqual(walk.map((w) => w[0]));
    expect(rows.map((r) => r.props)).toEqual(walk.map((w) => w[2]));
    expect(rows.every((r) => r.uid === U && r.path === "ready" && Object.keys(r).sort().join() === "at,name,path,props,uid")).toBe(true);
  });
  it("a client read is denied, even the writer's own", async () => {
    await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), "events/e0"), { uid: U, name: "opened_app", path: "ready", props: {} }); });
    await assertFails(getDoc(doc(as(U), "events/e0")));
    await assertFails(getDocs(collection(as(U), "events")));
  });
  it("an extra field, another writer's uid, or a client-set time is denied", async () => {
    await assertFails(addDoc(collection(as(U), "events"), { ...buildEvent(U, "opened_app", "ready"), at: serverTimestamp(), note: "x" }));
    await assertFails(addDoc(collection(as(U), "events"), { ...buildEvent(OTHER, "opened_app", "ready"), at: serverTimestamp() }));
    await assertFails(addDoc(collection(as(U), "events"), { ...buildEvent(U, "opened_app", "ready"), at: new Date() }));
  });
  it("a name or path outside the lists, or free text in props, is denied", async () => {
    await assertFails(addDoc(collection(as(U), "events"), { uid: U, name: "page_view", path: "ready", props: {}, at: serverTimestamp() }));
    await assertFails(addDoc(collection(as(U), "events"), { uid: U, name: "opened_app", path: "drafting", props: {}, at: serverTimestamp() }));
    await assertFails(addDoc(collection(as(U), "events"), { uid: U, name: "path_changed", path: "ready", props: { from: "my secret title" }, at: serverTimestamp() }));
    await assertFails(addDoc(collection(as(U), "events"), { uid: U, name: "opened_app", path: "ready", props: { note: "hello" }, at: serverTimestamp() }));
  });
  it("create only: no update, no delete", async () => {
    await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), "events/e1"), { uid: U, name: "opened_app", path: "ready", props: {} }); });
    await assertFails(updateDoc(doc(as(U), "events/e1"), { path: "writing" }));
    await assertFails(deleteDoc(doc(as(U), "events/e1")));
  });
});
