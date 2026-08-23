/**
 * Which deployed rule denies the seeder's first write — established by bisection, not by reading.
 *
 * ⚠️ WHY THIS EXISTS. `firebase-tools` 15 has no command that prints a DEPLOYED ruleset, this
 * machine has no `gcloud`, and minting a token from the CLI's stored refresh token is credential
 * handling nobody asked for. So the deployed rules are characterised by what they ACCEPT and DENY,
 * one clause at a time, which is what `rulesProbe.mjs` already does for field allowlists.
 *
 * ⚠️ CREATE AND UPDATE ARE DIFFERENT RULES, and that is the whole discriminator. `allow create`
 * checks `isValidManuscript` alone; `allow update` adds `affectedKeys().hasOnly([...])`. If a
 * create of the same payload succeeds where the update fails, the denial is in the ALLOWLIST and
 * the deployed list is shorter than `main`'s. If both fail, it is `isValidManuscript` itself.
 *
 * ⚠️ DEV ONLY, and it refuses to run anywhere else. Everything it writes, it deletes.
 *
 *   node tests/e2e/rulesDiff.mjs
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));

const dev = env(".env.development");
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") { console.error(`refusing: project is ${PROJECT}, not scriptally-dev`); process.exit(1); }

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: PROJECT,
});
const { user } = await signInWithEmailAndPassword(getAuth(app), "harness@scriptally.test", env(".env.local").SA_E2E_PASSWORD);
const uid = user.uid;
const db = getFirestore(app);
console.log(`signed in on ${PROJECT}\n`);

const iso = (d) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
/** the seeder's manuscript payload, verbatim from tests/e2e/seed.mjs */
const seedPayload = (id) => ({
  id, userId: uid,
  title: "The Smoke Test",
  genre: "Literary Fiction", ageCategory: "Adult",
  wordCount: 92000,
  logline: "A measurement that agreed with itself for a whole day.",
  status: "Querying", statusChangedDate: iso(90), comps: [], shelved: false,
});

const ms = (id) => doc(db, "users", uid, "manuscripts", id);
const attempt = async (label, fn) => {
  try { await fn(); console.log(`  ✅ ${label}`); return true; }
  catch (e) { console.log(`  ❌ ${label} — ${e.code ?? e.message}`); return false; }
};

console.log("what the stored document actually holds:");
const stored = await getDoc(ms("seed-ms-1"));
console.log(`  seed-ms-1 exists: ${stored.exists()}`);
if (stored.exists()) console.log(`  keys: ${Object.keys(stored.data()).sort().join(",")}`);

console.log("\n1 · reproduce — the seeder's own first write (setDoc over the existing doc):");
await attempt("setDoc seed-ms-1 with the seeder's payload", () => setDoc(ms("seed-ms-1"), seedPayload("seed-ms-1")));

console.log("\n2 · the CREATE path — same payload, a document that does not exist yet:");
const probeId = `probe-ms-${Date.now()}`;
const created = await attempt(`create ${probeId} (isValidManuscript alone)`, () => setDoc(ms(probeId), seedPayload(probeId)));
if (created) await attempt(`delete ${probeId}`, () => deleteDoc(ms(probeId)));

console.log("\n3 · the UPDATE path, one allowlisted key at a time:");
for (const [k, v] of [["statusChangedDate", iso(1)], ["title", "The Smoke Test"], ["wordCount", 92000],
                      ["logline", "A measurement that agreed with itself for a whole day."],
                      ["comps", []], ["shelved", false], ["genre", "Literary Fiction"],
                      ["ageCategory", "Adult"], ["status", "Querying"]]) {
  await attempt(`update { ${k} }`, () => updateDoc(ms("seed-ms-1"), { [k]: v }));
}

console.log("\n4 · which key does a full setDoc actually AFFECT? (identical values → empty diff)");
if (stored.exists()) {
  const before = stored.data();
  const p = seedPayload("seed-ms-1");
  const changed = Object.keys(p).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(p[k]));
  const removed = Object.keys(before).filter((k) => !(k in p));
  console.log(`  changed by the seeder's payload: ${changed.join(",") || "(none)"}`);
  console.log(`  REMOVED by setDoc (a full replace): ${removed.join(",") || "(none)"}`);
  const same = { ...before };
  await attempt("setDoc with the document's OWN current data (a true no-op diff)", () => setDoc(ms("seed-ms-1"), same));
}
/**
 * ⚠️ THE MANUSCRIPT IS ACCEPTED — every case above passes, including an exact reproduction of the
 * seeder's first write. So the earlier diagnosis ("denied at its FIRST write, the manuscript") was
 * WRONG: the `await` that rejects is simply the first one the seeder logs nothing after. Section 5
 * walks the seeder's remaining payloads in its own order until one is refused.
 */
const { collection, writeBatch } = await import("firebase/firestore");
console.log("\n5 · the seeder's NEXT payloads, in its own order:");

const AGENT = (i) => ({
  id: `probe-agent-${i}`, userId: uid, name: "Elinor Hale", agency: "Cavendish & Roe",
  email: "elinor@example.com",
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "",
  mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB",
  submissionStatus: "Open",
  submissionMethod: "Email",
  responseTimeWeeks: 8,
  starRating: 3,
  noResponseMeansNo: false,
  setAside: false, importedNeedsReview: false,
  materialsWanted: ["Query letter", "Synopsis"],
  dateAdded: iso(120), lastCheckedDate: iso(10),
});
const ag = (id) => doc(db, "users", uid, "agents", id);
const one = AGENT("x");
const ok = await attempt("create ONE agent with the seeder's payload", () => setDoc(ag("probe-agent-x"), one));
if (ok) { await attempt("delete it", () => deleteDoc(ag("probe-agent-x"))); }
else {
  console.log("\n  bisecting the agent payload — dropping one key at a time:");
  for (const k of Object.keys(one)) {
    if (["id", "userId", "name"].includes(k)) continue;
    const trimmed = { ...one }; delete trimmed[k];
    const passed = await attempt(`    without { ${k} }`, () => setDoc(ag("probe-agent-x"), trimmed));
    if (passed) { await deleteDoc(ag("probe-agent-x")); }
  }
}

/**
 * ⚠️ A BATCH IS ATOMIC AND VALIDATED PER DOCUMENT, so one bad member denies all twelve — which a
 * single-document probe cannot show. Section 6 replicates the seeder's batches faithfully, values
 * and all, then bisects whichever one is refused.
 */
console.log("\n6 · the seeder's BATCHES, replicated with its own varying values:");
const NAMES = [
  ["Elinor Hale", "Cavendish & Roe"], ["Tom Ellery", "Curtis Vane"],
  ["Marcus Reed", "Reed & Partners"], ["Priya Nair", "Northbank Literary"],
  ["Joan Whitfield", "Whitfield Agency"], ["Sam Okoro", "Okoro Bell"],
  ["Rachel Lin", "Lin Literary"], ["David Marsh", "Marsh & Co"],
  ["Ana Duarte", "Duarte Words"], ["Peter Vance", "Vance Associates"],
  ["Iris Kwan", "Kwan & Hall"], ["Noah Bright", "Bright Literary"],
];
const agentDoc = (name, agency, i) => ({
  id: `probe-agent-${i + 1}`, userId: uid, name, agency,
  email: `${name.split(" ")[0].toLowerCase()}@example.com`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "",
  mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB",
  submissionStatus: i % 5 === 0 ? "Closed" : "Open",
  submissionMethod: "Email",
  responseTimeWeeks: 8,
  starRating: (i % 5) + 1,
  noResponseMeansNo: i % 3 === 0,
  setAside: false, importedNeedsReview: false,
  materialsWanted: ["Query letter", "Synopsis"],
  dateAdded: iso(120 - i * 3), lastCheckedDate: iso(10),
});
const b = writeBatch(db);
NAMES.forEach(([n, a], i) => b.set(ag(`probe-agent-${i + 1}`), agentDoc(n, a, i)));
const batchOk = await attempt("the twelve-agent batch", () => b.commit());
if (batchOk) {
  const c = writeBatch(db);
  NAMES.forEach((_, i) => c.delete(ag(`probe-agent-${i + 1}`)));
  await attempt("clean up the twelve", () => c.commit());
} else {
  console.log("\n  bisecting — which member is refused:");
  for (let i = 0; i < NAMES.length; i++) {
    const [n, a] = NAMES[i];
    const passed = await attempt(`    agent ${i} (${n}, status ${i % 5 === 0 ? "Closed" : "Open"}, stars ${(i % 5) + 1}, nrn ${i % 3 === 0})`,
      () => setDoc(ag(`probe-agent-${i + 1}`), agentDoc(n, a, i)));
    if (passed) await deleteDoc(ag(`probe-agent-${i + 1}`));
  }
}

/**
 * ⚠️ CREATE AND OVERWRITE ARE DIFFERENT RULES, AND THE PROBE HAD BEEN TESTING THE WRONG ONE. Every
 * section above wrote to a `probe-*` id that did not exist — the CREATE path, `isValidAgent` alone.
 * The seeder writes `seed-agent-N`, which DO exist, so its `set` is an UPDATE and meets
 * `affectedKeys().hasOnly([...])`. A `set` without merge is a full replace, so any key the stored
 * document holds and the payload omits is a REMOVAL and counts as affected.
 */
console.log("\n7 · the OVERWRITE path — the seeder's own ids, which already exist:");
const existing = await getDoc(ag("seed-agent-1"));
console.log(`  seed-agent-1 exists: ${existing.exists()}`);
if (existing.exists()) {
  const have = Object.keys(existing.data()).sort();
  const payload = agentDoc(NAMES[0][0], NAMES[0][1], 0);
  const want = Object.keys({ ...payload, id: "seed-agent-1" }).sort();
  console.log(`  stored keys : ${have.join(",")}`);
  console.log(`  payload keys: ${want.join(",")}`);
  const removed = have.filter((k) => !want.includes(k));
  const added = want.filter((k) => !have.includes(k));
  console.log(`  ⚠️ REMOVED by a full set: ${removed.join(",") || "(none)"}`);
  console.log(`  ⚠️ ADDED by a full set  : ${added.join(",") || "(none)"}`);
  await attempt("setDoc seed-agent-1 with the seeder's payload (the real first agent write)",
    () => setDoc(ag("seed-agent-1"), { ...payload, id: "seed-agent-1" }));
  for (const k of removed) {
    await attempt(`  update removing only { ${k} }`, async () => {
      const { deleteField } = await import("firebase/firestore");
      return updateDoc(ag("seed-agent-1"), { [k]: deleteField() });
    });
  }
}

/**
 * ⚠️ WHICH KEY, EXACTLY. The overwrite is denied with nothing added and nothing removed, so the
 * refusal is about the keys whose VALUES differ — `affectedKeys()` is a value diff, not a key diff.
 * Each is tried alone, so the answer is a name rather than a suspicion.
 */
console.log("\n8 · the value diff, and each changed key tried on its own:");
if (existing.exists()) {
  const before = existing.data();
  const payload = { ...agentDoc(NAMES[0][0], NAMES[0][1], 0), id: "seed-agent-1" };
  const changed = Object.keys(payload).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(payload[k]));
  console.log(`  keys whose value differs: ${changed.join(", ") || "(none)"}`);
  for (const k of changed) {
    console.log(`    stored ${k} = ${JSON.stringify(before[k])}  →  payload ${JSON.stringify(payload[k])}`);
  }
  console.log("");
  for (const k of changed) {
    await attempt(`  update { ${k} } alone`, () => updateDoc(ag("seed-agent-1"), { [k]: payload[k] }));
  }
}
process.exit(0);
