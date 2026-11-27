/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1 — THE FIXTURE: nineteen agents on their OWN emulator account, so the list holds exactly them.
 *
 * ⚠️ EMULATOR ONLY. firebase-admin is pointed at the emulator hosts by fsTarget (`targetEnv`), and the project is
 *    asserted to be `demo-scriptally` before anything is written. The harness account (54 agents, home country US) is
 *    left alone: its own population would flag every British agent and drown the cases this lock is about.
 *
 * The account is `clr@scriptally.test` (uid `clr-rows-v1`), the harness password, home country GB, one manuscript.
 * Every write is delete-before-write, so a re-run restores it. Dates are relative to the run, so the nudge-due query is
 * nudge due on whatever day this runs.
 *
 * v1.2 (26 Nov): Pemberton not queried (three not queried), Lang and Pryce unrated (five unrated), Quinn in Dublin (two
 * abroad), Hussain with five genres, Whitfield (closed to queries) carries Crime so the panel's door counts are faceted
 * observably; the manuscript's genre is Crime. Still 19 agents.
 * The cases (Phase 4's list): unrated ×3 (Carey, Sandhu, Whitfield) · no genres ×2 (Carey, Lang) · three genres
 * (Hussain, Okafor) · no reply time ×2 (Achebe, Pryce) · each policy (always: most; no response means no: Blackwood,
 * Hussain, Sandhu; unstated: Ellison, Whitfield) · abroad: Holt (New York) · nudge due: Ferris · partial requested: Tan ·
 * full requested: Okafor · full sent: Holt · passed: Reed · not queried: Ellison (open), Whitfield (closed to queries).
 *
 *   node tests/e2e/clrFixture.mjs           seed (the emulator must be running)
 *   import { seedClr } from "./clrFixture.mjs"   the spec's beforeAll
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { targetEnv, assertTarget, harnessPassword, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

export const CLR_UID = "clr-rows-v1";
export const CLR_EMAIL = "clr@scriptally.test";
export const CLR_MS = "clr-ms";

const DAY = 86_400_000;
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const noon = (ms) => `${ymd(ms)}T12:00:00.000Z`;

/** [first, surname, agency, city, country, rating, genres, weeks, nrmn, door, story]
 *  story: null = not queried; else [[daysAgo, status], …] oldest first */
const W = (n) => n * 7;
export const CLR_AGENTS = [
  ["Rosalind", "Achebe", "Brightwater Literary", "London", "GB", 2, ["Literary"], null, false, "Open", [[W(2), "Queried"]]],
  ["Theo", "Blackwood", "Marlow & Finch", "Manchester", "GB", 5, ["Crime", "Noir"], 12, true, "Open", [[W(3), "Queried"]]],
  ["Imogen", "Carey", "Pilgrim Literary", "London", "GB", null, [], 8, false, "Open", [[W(1), "Queried"]]],
  ["George", "Ellison", "Quayside Agency", "Glasgow", "GB", 5, ["Crime", "Thriller"], 4, null, "Open", null],
  ["Samuel", "Ferris", "Kestrel House", "Oxford", "GB", 4, ["Crime", "Gothic"], 6, false, "Open", [[W(7), "Queried"]]],
  ["Clara", "Holt", "Larkfield Agency", "New York", "US", 4, ["Thriller", "Speculative"], 10, false, "Open",
    [[W(10), "Queried"], [W(6), "Partial Requested"], [W(5), "Partial Sent"], [W(3), "Full Requested"], [W(1), "Full Sent"]]],
  ["Nadia", "Hussain", "Linden Literary", "London", "GB", 3, ["Literary", "Upmarket", "Book club", "Historical", "Saga"], 12, true, "Open", [[W(2), "Queried"]]],
  ["Beatrice", "Lang", "Corrin & Wade", "London", "GB", null, [], 8, false, "Open", [[W(1), "Queried"]]],
  ["Alistair", "Morrow", "Fernhill Literary", "London", "GB", 4, ["Historical", "Thriller"], 6, false, "Open", [[W(2), "Queried"]]],
  ["Daniel", "Okafor", "Northgate Books", "Leeds", "GB", 5, ["Thriller", "Crime", "Horror"], 6, false, "Open",
    [[W(5), "Queried"], [W(1), "Full Requested"]]],
  ["Hugo", "Pemberton", "Calloway Literary", "London", "GB", 4, ["Crime", "Psychological"], 8, false, "Open", null],
  ["Owen", "Pryce", "Tidewell Literary", "Cardiff", "GB", null, ["Historical", "Saga"], null, false, "Open", [[W(2), "Queried"]]],
  ["Martha", "Quinn", "Thistle & Bell", "Dublin", "IE", 2, ["Book club"], 8, false, "Open", [[W(1), "Queried"]]],
  ["Marcus", "Reed", "Hartley & Co", "London", "GB", 4, ["Crime", "Thriller"], 6, false, "Open", [[W(6), "Queried"], [W(2), "Rejected"]]],
  ["Priya", "Sandhu", "Westbrook Agency", "Birmingham", "GB", null, ["Young adult"], 10, true, "Open", [[W(1), "Queried"]]],
  ["Fenella", "Stirling", "Ashcombe Agency", "Bristol", "GB", 3, ["Upmarket", "Book club"], 12, false, "Open", [[W(2), "Queried"]]],
  ["William", "Tan", "Foxglove Literary", "London", "GB", 4, ["Crime", "Historical"], 8, false, "Open", [[W(4), "Queried"], [5, "Partial Requested"]]],
  ["Harriet", "Vane-Coe", "Stillwater Reps", "Edinburgh", "GB", 5, ["Thriller", "Psychological"], 5, false, "Open", [[W(1), "Queried"]]],
  ["Eleanor", "Whitfield", "Greenfield Literary", "London", "GB", null, ["Crime", "Book club"], 8, null, "Closed", null],
];
export const clrId = (surname) => `clr-${surname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export async function seedClr() {
  targetEnv();
  assertTarget(EMULATOR_PROJECT);
  const req = createRequire(resolve(ROOT, "functions/package.json"));
  const admin = req("firebase-admin");
  const { getFirestore } = req("firebase-admin/firestore");
  const app = admin.apps.find((a) => a?.name === "clr-seed") ?? admin.initializeApp({ projectId: EMULATOR_PROJECT }, "clr-seed");
  const auth = admin.auth(app);
  const db = getFirestore(app);
  const password = harnessPassword();
  if (!password) throw new Error("No SA_E2E_PASSWORD in the environment or .env.local");

  try { await auth.deleteUser(CLR_UID); } catch { /* not there yet */ }
  await auth.createUser({ uid: CLR_UID, email: CLR_EMAIL, password, emailVerified: true });

  /* the user: the harness user's settled state (onboarded, tours done), with its own id, email and home country */
  const harness = (await db.doc("users/LS4ymFFCEvhN82advZQJ5zkr7sv2").get()).data() ?? {};
  const user = { ...harness, id: CLR_UID, email: CLR_EMAIL, name: "Rows Fixture", homeCountry: "GB" };
  const base = db.doc(`users/${CLR_UID}`);
  /* delete-before-write: the sub-collections this fixture owns */
  for (const col of ["agents", "queries", "activities", "manuscripts", "tasks", "taskFlags", "packages", "versions"]) {
    const snap = await base.collection(col).get();
    for (const d of snap.docs) await d.ref.delete();
  }
  await base.set(user);

  const now = Date.now();
  await base.collection("manuscripts").doc(CLR_MS).set({
    id: CLR_MS, userId: CLR_UID, title: "The Salt Line", status: "Querying", genre: "Crime", ageCategory: "Adult",
    wordCount: 82000, logline: "", statusChangedDate: ymd(now - W(12) * DAY), comps: [],
  });

  let n = 0;
  for (const [first, surname, agency, city, country, rating, genres, weeks, nrmn, door, story] of CLR_AGENTS) {
    const id = clrId(surname);
    const agent = {
      id, userId: CLR_UID, name: `${first} ${surname}`, agency, city, country, genres,
      /* v1.3 — a wishlist on file for all but Achebe, so "Full profile" / "Has gaps" (List health's own gap rule) split the
         list: the gaps come from no genres (Carey, Lang), no reply time (Achebe, Pryce), no wishlist (Achebe) and a closed
         door with no reopen task (Whitfield) */
      email: `${first.toLowerCase()}@example.com`, website: "", mswlNotes: surname === "Achebe" ? "" : "Voice-led fiction with a hook.", agentNotes: "", notes: "",
      submissionStatus: door, submissionMethod: "Email", materialsWanted: ["Query letter"], socials: [],
      dateAdded: ymd(now - (60 + n) * DAY), lastCheckedDate: ymd(now - 10 * DAY), setAside: false, importedNeedsReview: false,
      ...(rating ? { starRating: rating } : {}),
      ...(weeks ? { responseTimeWeeks: weeks } : {}),
      ...(nrmn === null ? {} : { noResponseMeansNo: nrmn }),
    };
    await base.collection("agents").doc(id).set(agent);
    if (story) {
      const qid = `clr-q-${surname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const [sentAgo] = story[0];
      const last = story[story.length - 1];
      const query = {
        id: qid, userId: CLR_UID, agentId: id, manuscriptId: CLR_MS, status: last[1], dateSent: ymd(now - sentAgo * DAY),
        sendMethod: "Email", packageId: "", personalisationNotes: "", lastStatusChange: noon(now - last[0] * DAY),
      };
      const at = (s) => story.find((x) => x[1] === s);
      if (at("Partial Sent")) query.partialSentDate = ymd(now - at("Partial Sent")[0] * DAY);
      if (at("Full Sent")) query.fullSentDate = ymd(now - at("Full Sent")[0] * DAY);
      await base.collection("queries").doc(qid).set(query);
      let k = 0;
      for (const [ago, status] of story) {
        k += 1;
        await base.collection("activities").doc(`${qid}-e${k}`).set({
          id: `${qid}-e${k}`, userId: CLR_UID, queryId: qid, manuscriptId: CLR_MS, activityType: "Status Changed",
          resultingStatus: status, date: ymd(now - ago * DAY), createdAt: noon(now - ago * DAY),
          description: `${status} — ${first} ${surname}`, details: "",
        });
      }
    }
    n += 1;
  }
  return { agents: CLR_AGENTS.length, uid: CLR_UID, email: CLR_EMAIL };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await seedClr();
  console.log(`clr fixture: ${r.agents} agents on ${r.email} (uid ${r.uid})`);
  process.exit(0);
}
