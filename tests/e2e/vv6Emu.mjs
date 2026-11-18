/**
 * Versions v6 — the VV6 locks' emulator fixture. EMULATOR ONLY (demo-scriptally; refused anywhere else).
 *
 *   node tests/e2e/vv6Emu.mjs seed        write every vv6- document on the harness account (wipes vv6- first)
 *   node tests/e2e/vv6Emu.mjs facts       what the page should show, worked out HERE from the raw documents
 *   node tests/e2e/vv6Emu.mjs ms [id]     one manuscript document, keys sorted (Undo's exact check)
 *   node tests/e2e/vv6Emu.mjs founding on|off   the harness account's founding flag (users/{uid}/private/entitlement),
 *                                         which the founding writer band reads; the server writes it in real life
 *
 * Three books, the ref's three states (design-refs/versions-v6, its `seed()`; names, dates and figures invented):
 *   · vv6-ms     "everyday": Original 14 sent (9 replied, 1 asked for more), Prologue cut 12 (8/3, 1 full),
 *                Fast-paced opening IN USE 9 (4/3, 1 full), World-building first 6 (5/0), Dual timeline unsent;
 *                plus 4 queries with no version recorded (the notice).
 *   · vv6-early  "just started": Original 14 (9/1) and Prologue cut IN USE with 3 sent (1/1) — one ranked version.
 *   · vv6-fresh  "day one": no versions, no queries.
 *
 * ⚠️ EVERY e2e:emu RUN IMPORTS THE COMMITTED SNAPSHOT AND EXPORTS NOTHING, so a seed lasts as long as this run's
 *    emulators and cannot leave residue for the next one.
 * ⚠️ FACTS ARE THIS FILE'S OWN ARITHMETIC over the raw documents, never lib/versionsV2's, so a page that agrees with
 *    them agrees with something it did not compute.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertTarget, EMULATOR_HOSTS, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

assertTarget(EMULATOR_PROJECT);
process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOSTS.firestore;
const require = createRequire(resolve(ROOT, "functions/package.json"));
const admin = require("firebase-admin");
const db = admin.initializeApp({ projectId: EMULATOR_PROJECT }, "vv6-emu").firestore();
const { Timestamp } = admin.firestore;
const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const U = (p) => db.doc(`users/${uid}/${p}`);
const noon = (day) => `${day}T12:00:00.000Z`;
const sortKeys = (o) => Array.isArray(o) ? o.map(sortKeys) : o && typeof o === "object" && !(o instanceof Timestamp) ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])])) : o;

export const MS = "vv6-ms", EARLY = "vv6-early", FRESH = "vv6-fresh";
const NAMES = [["Odile Fenn", "Fenn Literary"], ["Barnaby Cole", "Cole & Pike"], ["Ruth Amari", "Amari Agency"], ["Theo Lansing", "Lansing House"],
  ["Mina Sato", "Sato Literary"], ["Ewan Price", "Price & Holt"], ["Clara Voss", "Voss Books"], ["Idris Lake", "Lake Associates"],
  ["Frieda Moss", "Moss Literary"], ["Gil Hartley", "Hartley Agency"], ["Hana Ito", "Ito & Grey"], ["Joel Ferrer", "Ferrer Lit"]];

/* a version's queries: [sent, replied (incl. asked), asked for more, of those the full] — the ref's everyday figures */
const BOOKS = {
  [MS]: {
    title: "The Salt Ledger",
    versions: [
      { n: 0, name: "Original", parent: null, saved: "2026-05-12", q: [14, 9, 1, 0] },
      { n: 1, name: "Prologue cut", parent: 0, saved: "2026-07-03", q: [12, 8, 3, 1], changes: ["Cut the prologue", "Opened on chapter one"], words: 89500 },
      { n: 2, name: "Fast-paced opening", parent: 1, saved: "2026-10-02", q: [9, 4, 3, 1], changes: ["Moved the harbour scene to page 1", "Stated the premise on page 3", "Trimmed chapter two"], words: 89100, use: true },
      { n: 3, name: "World-building first", parent: 0, saved: "2026-07-20", q: [6, 5, 0, 0], changes: ["Added a passage of world-building before chapter one"], words: 93200 },
      { n: 4, name: "Dual timeline", parent: 2, saved: "2026-11-14", q: [0, 0, 0, 0], changes: ["Alternated the two timelines from chapter one"], words: 90400 },
    ],
    unrecorded: 4,
  },
  [EARLY]: {
    title: "The Salt Ledger (early)",
    versions: [
      { n: 0, name: "Original", parent: null, saved: "2026-05-12", q: [14, 9, 1, 0] },
      { n: 1, name: "Prologue cut", parent: 0, saved: "2026-07-03", q: [3, 1, 1, 0], changes: ["Cut the prologue", "Opened on chapter one"], words: 89500, use: true },
    ],
    unrecorded: 0,
  },
};

async function wipe() {
  let n = 0;
  for (const c of ["activities", "agents", "manuscripts", "queries"]) {
    const s = await db.collection(`users/${uid}/${c}`).get();
    for (const d of s.docs) {
      if (!d.id.startsWith("vv6-")) continue;
      if (c === "queries") for (const a of (await d.ref.collection("activity").get()).docs) await a.ref.delete();
      await d.ref.delete(); n++;
    }
  }
  return n;
}

const day = (base, k) => new Date(Date.parse(`${base}T12:00:00Z`) + k * 864e5).toISOString().slice(0, 10);
let qn = 0;
async function query(book, stamp, sent, steps, status) {
  const id = `vv6-q-${qn++}`;
  const ag = qn % NAMES.length;
  const at = (st) => steps.find((s) => s[0] === st)?.[1];
  await U(`queries/${id}`).set({
    id, userId: uid, manuscriptId: book, agentId: `vv6-ag-${ag}`, packageId: "", status, dateSent: noon(sent), personalisationNotes: "", sendMethod: "Email",
    ...(stamp ? { bookVersionId: stamp } : {}),
    ...(at("Partial Requested") ? { partialRequestedDate: noon(at("Partial Requested")) } : {}),
    ...(at("Full Requested") ? { fullRequestedDate: noon(at("Full Requested")) } : {}),
    ...(at("Rejected") ? { rejectedDate: noon(at("Rejected")) } : {}),
    ...(steps.length ? { lastStatusChange: noon(steps[steps.length - 1][1]), hasAgentResponded: true } : {}),
  });
  for (const [st, d] of [["Queried", sent], ...steps]) {
    const slug = st.toLowerCase().replace(/[^a-z]+/g, "-");
    await U(`queries/${id}/activity/act-status-${slug}-${id}`).set({ type: st, resultingStatus: st, createdAt: Timestamp.fromMillis(Date.parse(noon(d))), note: st, queryId: id, reconstructed: true });
    const fid = `vv6-act-${id}-${slug}`;
    await U(`activities/${fid}`).set({ id: fid, userId: uid, queryId: id, manuscriptId: book, activityType: st === "Queried" ? "Query Sent" : "Status Changed",
      description: st === "Queried" ? `Query sent to ${NAMES[ag][0]} at ${NAMES[ag][1]}` : `${st} — ${NAMES[ag][0]}`, date: noon(d), details: "", resultingStatus: st });
  }
}

async function seed() {
  const wiped = await wipe();
  for (let i = 0; i < NAMES.length; i++) {
    await U(`agents/vv6-ag-${i}`).set({ id: `vv6-ag-${i}`, userId: uid, name: NAMES[i][0], agency: NAMES[i][1], email: "", website: "", genres: ["Thriller"], mswlNotes: "",
      submissionStatus: "Open", responseTimeWeeks: 8, submissionMethod: "Email", materialsRequired: [], createdDate: noon("2026-01-02") });
  }
  for (const [book, b] of Object.entries(BOOKS)) {
    const vid = (n) => `${book}-bv-${n}`;
    const use = b.versions.find((v) => v.use);
    await U(`manuscripts/${book}`).set({ id: book, userId: uid, title: b.title, genre: "Thriller", ageCategory: "Adult", wordCount: 92000, logline: "A harbour, a ledger, a tide.",
      comps: [], status: "Querying", statusChangedDate: noon("2026-05-01"),
      bookVersions: b.versions.map((v) => ({ id: vid(v.n), name: v.name, kind: v.n ? "revision" : "initial", createdDate: v.saved, num: v.n,
        ...(v.n ? { parentId: vid(v.parent), changes: v.changes, wordCount: v.words } : { original: true }) })),
      inUseBookVersionId: vid(use.n), bookVersionSeq: Math.max(...b.versions.map((v) => v.n)) });
    for (const v of b.versions) {
      const [sent, rep, more, full] = v.q;
      for (let k = 0; k < sent; k++) {
        /* Original's queries go out BEFORE it was saved and carry no stamp (counted by date); the rest are stamped */
        const s = v.n ? day(v.saved, k + 1) : day("2026-03-01", k * 3);
        const r = day(s, 12 + (k % 5) * 4);
        const steps = k < full ? [["Partial Requested", r], ["Full Requested", day(r, 9)]] : k < more ? [["Partial Requested", r]] : k < rep ? [["Rejected", r]] : [];
        const status = k < full ? "Full Requested" : k < more ? "Partial Requested" : k < rep ? "Rejected" : k % 2 ? "No Response" : "Queried";
        await query(book, v.n ? vid(v.n) : null, s, steps, status);
      }
    }
    for (let k = 0; k < b.unrecorded; k++) await query(book, null, day("2026-08-10", k * 6), [], "Queried");
  }
  await U(`manuscripts/${FRESH}`).set({ id: FRESH, userId: uid, title: "Dead Reckoning", genre: "Thriller", ageCategory: "Adult", wordCount: 70000, logline: "A navigator's last chart.",
    comps: [], status: "Querying", statusChangedDate: noon("2026-09-01") });
  console.log(`seeded vv6 (${uid}) — wiped ${wiped}, wrote 3 books, ${NAMES.length} agents, ${qn} queries`);
}

/** Per book: each version's sent / replied / asked for more / asked for the full, from the raw documents. */
async function facts() {
  const out = {};
  const qsAll = (await db.collection(`users/${uid}/queries`).get()).docs.map((d) => d.data()).filter((q) => q.id.startsWith("vv6-"));
  const feed = (await db.collection(`users/${uid}/activities`).get()).docs.map((d) => d.data()).filter((a) => a.id.startsWith("vv6-"));
  const MORE = new Set(["Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Resubmitted", "Offer", "Signed"]);
  const FULL = new Set(["Full Requested", "Full Sent", "Offer", "Signed"]);
  const hist = (q) => [q.status, ...feed.filter((a) => a.queryId === q.id).map((a) => a.resultingStatus)];
  for (const book of [MS, EARLY, FRESH]) {
    const ms = (await U(`manuscripts/${book}`).get()).data();
    const vs = ms.bookVersions ?? [];
    const orig = vs.find((v) => v.original);
    const of = (q) => vs.some((v) => v.id === q.bookVersionId) ? q.bookVersionId : orig && q.dateSent.slice(0, 10) <= orig.createdDate ? orig.id : null;
    const counted = qsAll.filter((q) => q.manuscriptId === book && q.status !== "Withdrawn");
    out[book] = {
      inUse: ms.inUseBookVersionId ?? null,
      unrecorded: counted.filter((q) => of(q) === null).length,
      versions: vs.map((v) => {
        const mine = counted.filter((q) => of(q) === v.id);
        const asked = mine.filter((q) => hist(q).some((s) => MORE.has(s)));
        return { id: v.id, num: v.num, name: v.name, original: !!v.original, archived: !!v.archived, parentId: v.parentId ?? null,
          sent: mine.length, replied: mine.filter((q) => hist(q).some((s) => s && s !== "Queried" && s !== "No Response" && s !== "Withdrawn")).length,
          more: asked.length, full: asked.filter((q) => hist(q).some((s) => FULL.has(s))).length };
      }),
    };
  }
  console.log(JSON.stringify(out));
}

const cmd = process.argv[2];
if (cmd === "seed") await seed();
else if (cmd === "facts") await facts();
else if (cmd === "ms") console.log(JSON.stringify(sortKeys((await U(`manuscripts/${process.argv[3] ?? MS}`).get()).data() ?? null)));
else if (cmd === "founding") { await U("private/entitlement").set({ founding: process.argv[3] !== "off" }, { merge: true }); console.log(`founding ${process.argv[3] !== "off"}`); }
else { console.error("usage: vv6Emu.mjs seed|facts|ms [id]|founding on|off"); process.exit(2); }
process.exit(0);
