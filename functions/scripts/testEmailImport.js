/*
 * DEV-ONLY test harness for extractFromEmail — NOT part of the deployed build.
 * Lives in functions/scripts/ (outside tsconfig `include: ["src"]`), so `npm run build` ignores it
 * and it never becomes a deployed trigger. It exercises the PURE core (functions/lib/emailImportCore.js)
 * with seeded fixtures — no emulator, no Firestore, no prod data.
 *
 * Run (after building the functions):
 *   cd functions && npm run build
 *   # without a key — runs the validator self-test only, then prints the command below:
 *   node scripts/testEmailImport.js
 *   # with the key — also makes the two real Claude calls and prints the proposals:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/testEmailImport.js
 */
"use strict";

let core;
try {
  core = require("../lib/emailImportCore.js");
} catch (e) {
  console.error("Could not load ../lib/emailImportCore.js — build first:  cd functions && npm run build");
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
}

const { validateAndNormalise, extractProposal, QUERY_STATUSES } = core;

const MANUSCRIPT_ID = "ms_clockworks";

/* Seeded context — the writer's existing agents & queries for this manuscript. Margaret Holloway
 * (Pemberton) is on file with a Queried query; the Ardal & Crewe agent in Fixture B is NOT. */
const CONTEXT = {
  agents: [{ id: "agent_mh", agency: "Pemberton Literary Agency", name: "Margaret Holloway" }],
  queries: [
    { id: "q_mh", agentId: "agent_mh", status: "Queried", rungs: [{ status: "Queried", date: "2026-05-02" }] },
  ],
};

/* Fixture emails. NB: the visual mockup's sample bodies carried no dates; these include a realistic
 * dateline so the date-PRESENT path is exercised (the implied "Queried" in B still has no date). */
const FIXTURES = [
  {
    key: "A — matched (agent reply asking for the full)",
    input: {
      manuscriptId: MANUSCRIPT_ID,
      direction: "received",
      emailText: [
        "Date: 15 June 2026",
        "",
        "Dear Nick,",
        "",
        "Thank you so much for sending your query and the opening pages of The Book of Lost Clockworks",
        "back in May. I read them with real interest over the weekend.",
        "",
        "I'd be delighted to see the full manuscript whenever it's convenient for you.",
        "",
        "Warm wishes,",
        "Margaret Holloway",
        "Pemberton Literary Agency",
      ].join("\n"),
    },
    expect: 'kind:"matched" (agent_mh / q_mh); one "Full Requested" incoming record dated 2026-06-15.',
  },
  {
    key: "B — new agent (intro asking for the first fifty pages)",
    input: {
      manuscriptId: MANUSCRIPT_ID,
      direction: "received",
      emailText: [
        "Date: 15 June 2026",
        "",
        "Hi Nick,",
        "",
        "I'm James Ardal, an agent at the Ardal & Crewe Literary Agency. Your query for",
        "The Book of Lost Clockworks reached me and the premise really caught my eye.",
        "",
        "I'd love to read the first fifty pages when you have a moment.",
        "",
        "Best,",
        "James Ardal",
        "Ardal & Crewe Literary Agency",
      ].join("\n"),
    },
    expect:
      'kind:"new_agent" (Ardal & Crewe / James Ardal); an implied "Queried" outgoing record with ' +
      'dateProvisional:true (no date stated) + a "Partial Requested" incoming record dated 2026-06-15.',
  },
];

/* ── 1. Validator self-test (no API call) — proves the pure validation/normalisation works. ── */
function validatorSelfTest() {
  console.log("── Validator self-test (no model call) ──");

  // (a) a well-formed object normalises, and direction is derived from status.
  const good = {
    subject: { kind: "matched", agentId: "agent_mh", queryId: "q_mh", agency: "Pemberton Literary Agency", agentName: "Margaret Holloway", manuscriptId: "WRONG_SHOULD_BE_OVERRIDDEN" },
    records: [
      { resultingStatus: "Full Requested", direction: "outgoing" /* deliberately wrong */, date: "2026-06-15", dateProvisional: false, sourceQuote: "see the full manuscript", note: "Agent asked for the full." },
      { resultingStatus: "Queried", direction: "outgoing", date: null, dateProvisional: false /* should be forced true */, sourceQuote: "your query", note: "Implied earlier query." },
    ],
    unplaced: [],
  };
  const norm = validateAndNormalise(good, MANUSCRIPT_ID);
  assert(norm.subject.manuscriptId === MANUSCRIPT_ID, "manuscriptId is forced to the server value");
  assert(norm.records[0].direction === "incoming", "Full Requested direction re-derived to incoming");
  assert(norm.records[1].dateProvisional === true, "null date forces dateProvisional true");
  console.log("  ✓ well-formed proposal normalises; direction + provisional + manuscriptId enforced");

  // (b) a bad status hard-fails.
  let threw = false;
  try {
    validateAndNormalise({ subject: { kind: "matched", agency: "X" }, records: [{ resultingStatus: "partialRequested" }], unplaced: [] }, MANUSCRIPT_ID);
  } catch (_e) {
    threw = true;
  }
  assert(threw, "non-enum resultingStatus is rejected");
  console.log("  ✓ non-enum status rejected (only exact QueryStatus strings pass)");
  console.log("  QueryStatus set:", QUERY_STATUSES.join(", "));
  console.log("");
}

function assert(cond, msg) {
  if (!cond) {
    console.error("  ✗ FAILED:", msg);
    process.exit(1);
  }
}

/* ── 2. Real extraction against the two fixtures — only when the key is present. ── */
async function runFixtures() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.log("── Live extraction (the two fixtures) ──");
    console.log("  SKIPPED — ANTHROPIC_API_KEY is not set in this shell, so no model call was made");
    console.log("  (nothing is fabricated). To run the real extraction:\n");
    console.log("    cd functions && npm run build && \\");
    console.log("      ANTHROPIC_API_KEY=sk-ant-... node scripts/testEmailImport.js\n");
    console.log("  Expected:");
    for (const f of FIXTURES) console.log(`    • Fixture ${f.key}\n        ${f.expect}`);
    return;
  }

  let Anthropic;
  try {
    const mod = require("@anthropic-ai/sdk");
    Anthropic = mod.default || mod;
  } catch (e) {
    console.error("  Could not load @anthropic-ai/sdk — run from the functions/ dir after npm install.");
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: key });

  for (const f of FIXTURES) {
    console.log(`── Fixture ${f.key} ──`);
    console.log(`  expect: ${f.expect}`);
    try {
      const proposal = await extractProposal(client, { ...f.input, context: CONTEXT });
      console.log(JSON.stringify(proposal, null, 2));
    } catch (e) {
      console.error("  extraction failed:", String(e && e.message ? e.message : e));
    }
    console.log("");
  }
}

(async () => {
  validatorSelfTest();
  await runFixtures();
})();
