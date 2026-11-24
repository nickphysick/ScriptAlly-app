/**
 * Rules budget v1 — AN UPDATE VALIDATES ONLY WHAT IT CHANGES, AND NOTHING GOT LOOSER FOR A CHANGED FIELD.
 *
 * The query update rule now runs its allowlist (unchanged) and then `isValidQueryUpdate` instead of the whole of
 * `isValidQuery`. Every case below runs against BOTH rule sets, each loaded into its own emulator project:
 *   - "before": firestore.rules with the update rule put back as it was (`isValidQuery(incoming(), userId) && hasOnly`)
 *     — rebuilt from the file by two asserted substitutions, so "before" can never silently become "after";
 *   - "after":  firestore.rules as it is.
 * On the small document (the required fields only) both rule sets must give the same answer for every write here.
 * On the fullest document only "after" is asked, because "before" denies any update to it (the expression limit).
 *
 * The field list and every value are generated from `isValidQuery`'s own clauses, and the populations are asserted
 * non-empty (66 optional fields, every one with at least one invalid value), so a regex that stopped matching fails
 * instead of passing vacuously.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { doc, setDoc, updateDoc, deleteField } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AFTER = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
const U = "budget-writer";

/* ── the rule as it was: two substitutions, each required to match exactly once ── */
const HEAD_NOW = "allow update: if isOwner(userId) && isValidId(queryId) && (\n          incoming().diff(existing()).affectedKeys().hasOnly([";
const HEAD_WAS = "allow update: if isOwner(userId) && isValidId(queryId) && isValidQuery(incoming(), userId) && (\n          incoming().diff(existing()).affectedKeys().hasOnly([";
const TAIL_NOW = "            'bookVersionId'\n          ])\n        ) && isValidQueryUpdate(incoming(), incoming().diff(existing()), userId);";
const TAIL_WAS = "            'bookVersionId'\n          ])\n        );";
const once = (s: string, sub: string) => s.split(sub).length === 2;
const BEFORE = AFTER.replace(HEAD_NOW, HEAD_WAS).replace(TAIL_NOW, TAIL_WAS);

/* ── isValidQuery's clauses ── */
const body = AFTER.slice(AFTER.indexOf("function isValidQuery("), AFTER.indexOf("\n    }\n", AFTER.indexOf("function isValidQuery(")));
const OPTIONAL = [...body.matchAll(/\(data\.get\('(\w+)', null\) == null \|\| ([^\n]*)\);?(?=\n|$)/g)].map((m) => ({ field: m[1], check: m[2] }));

type V = { label: string; value: unknown };
function validFor(check: string): unknown {
  const inList = check.match(/in \['([^']+)'/);
  if (inList) return inList[1];
  if (/isValidId/.test(check)) return "v1";
  if (/is list/.test(check)) return [];
  if (/is bool/.test(check)) return true;
  const lo = check.match(/>= (\d+)/);
  if (/is int/.test(check) && !/is string/.test(check)) return lo ? Number(lo[1]) : 1;
  return "2026-11-24";
}
/** every invalid value the clause's own text implies: the wrong type, and the right type just past each bound */
function invalidFor(field: string, check: string): V[] {
  const out: V[] = [];
  const inList = check.match(/in \[([^\]]+)\]/);
  const size = check.match(/size\(\) <= (\d+)/);
  const lo = check.match(/>= (\d+)/), hi = check.match(/<= (\d+)\)?$/) ?? check.match(/>= \d+ && \S+ <= (\d+)/);
  if (inList) { out.push({ label: "a value outside the list", value: "zzz-not-listed" }, { label: "a number", value: 5 }); return out; }
  if (/isValidId/.test(check)) { out.push({ label: "an id with a space", value: "bad id" }, { label: "a number", value: 5 }); return out; }
  if (/is list \|\| .* is map/.test(check)) { out.push({ label: "21 items", value: Array.from({ length: 21 }, (_, i) => `m${i}`) }, { label: "a string", value: "x" }); return out; }
  if (/is list/.test(check)) { out.push({ label: `${Number(size![1]) + 1} items`, value: Array.from({ length: Number(size![1]) + 1 }, (_, i) => `v${i}`) }, { label: "a string", value: "x" }); return out; }
  if (/is bool/.test(check)) { out.push({ label: "the string 'true'", value: "true" }, { label: "a number", value: 1 }); return out; }
  if (/is int/.test(check) && !/is string/.test(check)) {
    out.push({ label: "a string", value: "1" }, { label: "a fraction", value: 1.5 });
    if (lo) out.push({ label: `below ${lo[1]}`, value: Number(lo[1]) - 1 });
    if (hi) out.push({ label: `above ${hi[1]}`, value: Number(hi[1]) + 1 });
    return out;
  }
  if (/is number/.test(check)) { out.push({ label: "a bool", value: true }, { label: "a list", value: [1] }); return out; }
  if (/is timestamp/.test(check)) { out.push({ label: "a number", value: 5 }, { label: "a bool", value: true }); return out; }
  if (/is string/.test(check) && size) { out.push({ label: `${Number(size[1]) + 1} characters`, value: "a".repeat(Number(size[1]) + 1) }, { label: "a number", value: 5 }); return out; }
  throw new Error(`no invalid value for ${field}: ${check}`);
}
const REQUIRED = { id: "q-1", userId: U, manuscriptId: "ms-1", agentId: "ag-1", packageId: "", status: "Queried", sendMethod: "Email" };
const FULLEST = Object.fromEntries(OPTIONAL.map(({ field, check }) => [field, validFor(check)]));
/* the required fields an update may change (id and userId are outside the allowlist) */
const REQUIRED_CHANGES: { field: string; valid: unknown; invalid: V[] }[] = [
  { field: "manuscriptId", valid: "ms-2", invalid: [{ label: "129 characters", value: "m".repeat(129) }, { label: "a number", value: 5 }] },
  { field: "agentId", valid: "ag-2", invalid: [{ label: "129 characters", value: "a".repeat(129) }, { label: "a number", value: 5 }] },
  { field: "packageId", valid: "pk-1", invalid: [{ label: "129 characters", value: "p".repeat(129) }, { label: "a number", value: 5 }] },
  { field: "status", valid: "Rejected", invalid: [{ label: "a status outside the twelve", value: "Ghosted" }, { label: "a number", value: 5 }] },
  { field: "sendMethod", valid: "Post", invalid: [{ label: "a method outside the four", value: "Pigeon" }, { label: "a number", value: 5 }] },
];

/* The widest updates the app sends (traced through src/ for this branch; reports/rules-budget-v1/REPORT.md lists
   every writer). Values are valid and differ from FULLEST's, so every key is really changed. */
const alt = (f: string) => { const c = OPTIONAL.find((o) => o.field === f)!.check; const l = c.match(/in \['[^']+', '([^']+)'/); return l ? l[1] : /isValidId/.test(c) ? "v2" : /is list/.test(c) ? ["x"] : /is bool/.test(c) ? false : /is int/.test(c) && !/is string/.test(c) ? 2 : "2026-11-25"; };
const RECOMPUTE_KEYS = ["partialRequestedDate", "partialSentDate", "fullRequestedDate", "fullSentDate", "revisionRound", "hasAgentResponded", "responseReceivedAt", "rejectedDate", "lastStatusChange"];
const DETAIL_KEYS = ["materialsRequestedType", "materialsRequestedQuantity", "fullVersionSent", "expectedSendDate", "sendReminderDate", "rrNotes", "rejectionFeedbackType", "rejectionFeedbackText", "rejectionReflection", "rejectionLesson", "rejectedFromStatus", "offerDate", "offerResponseDeadline", "offerNotes", "closingReason", "closingNotes"];
const CLEARED_ON_DELETE = ["expectedSendDate", "sendReminderDate", "materialsRequestedType", "materialsRequestedQuantity", "requestSynopsis", "requestFrom", "requestFromUnit", "rrNotes", "offerDate", "offerResponseDeadline", "offerNotes", "offerCallOn", "closingReason", "closingNotes", "rejectionFeedbackType", "rejectionFeedbackText", "rejectionReflection", "rejectionLesson", "rejectedFromStatus", "withdrawTold", "agentRecheckOn", "lastNudgeSentDate", "closePlan", "writerExpectedDate", "writerExpectedSetAt", "nudgeDate", "nudgeSetAt", "lastSentLabel"];
const WIDEST: Record<string, Record<string, unknown>> = {
  "reply step for a partial request (planOfResponse, 29 keys)": { status: "Partial Requested", ...Object.fromEntries([...DETAIL_KEYS, ...RECOMPUTE_KEYS, "requestSynopsis", "requestFrom", "requestFromUnit"].map((f) => [f, f === "requestFrom" ? 3 : alt(f)])) },
  "response or close (planRecord, 26 keys)": { status: "Rejected", ...Object.fromEntries([...DETAIL_KEYS, ...RECOMPUTE_KEYS].map((f) => [f, alt(f)])) },
  "deleting every timeline entry (deleteTimelineEntries, 28 keys cleared)": Object.fromEntries(CLEARED_ON_DELETE.map((f) => [f, deleteField()])),
  "recomputeQuery (10 keys)": { status: "Full Sent", ...Object.fromEntries(RECOMPUTE_KEYS.map((f) => [f, alt(f)])) },
  "a step edit with its details (planStepEdit + planDetails1522, 17 keys)": { status: "Full Sent", ...Object.fromEntries([...RECOMPUTE_KEYS, "lastNudgeSentDate", "sentHow", "sentPackageId", "packageId", "sentPackageEdition", "sentPackageName"].map((f) => [f, f === "packageId" ? "pk-9" : f === "sentHow" ? "individual" : alt(f)])), sendMethod: "Post" },
};
const envs: Record<"before" | "after", RulesTestEnvironment> = {} as never;
const SETS = ["before", "after"] as const;
beforeAll(async () => {
  envs.before = await initializeTestEnvironment({ projectId: "demo-scriptally-budget-before", firestore: { rules: BEFORE, host: "127.0.0.1", port: 8080 } });
  envs.after = await initializeTestEnvironment({ projectId: "demo-scriptally-budget-after", firestore: { rules: AFTER, host: "127.0.0.1", port: 8080 } });
});
afterAll(async () => { await envs.before?.cleanup(); await envs.after?.cleanup(); });
afterEach(async () => { await envs.before.clearFirestore(); await envs.after.clearFirestore(); });

const path = `users/${U}/queries/q-1`;
const me = (s: (typeof SETS)[number]) => envs[s].authenticatedContext(U).firestore();
const seed = (s: (typeof SETS)[number], data: Record<string, unknown>) =>
  envs[s].withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), path), data); });

describe("the populations", () => {
  it("the 'before' rule set really is the old update rule", () => {
    expect(once(AFTER, HEAD_NOW)).toBe(true);
    expect(once(AFTER, TAIL_NOW)).toBe(true);
    expect(BEFORE).not.toContain("isValidQueryUpdate(incoming()");
    expect(once(BEFORE, HEAD_WAS)).toBe(true);
  });
  it("every check a changed key meets is isValidQuery's own check for it, value first", () => {
    /* value first, then the null test: for a changed key that is DELETED the value test errors and the null test
       allows it, exactly as isValidQuery's `get(f, null) == null || <check>` did — the tests below delete every field */
    const own: Record<string, string> = { materialsRequestedQuantity: "isValidQueryMaterialsQuantity", materialsWanted: "isValidQueryMaterialsWanted" };
    const fnBody = (name: string) => { const i = AFTER.indexOf(`function ${name}(data) {\n      return `); expect(i, name).toBeGreaterThan(0); return AFTER.slice(i, AFTER.indexOf(";\n    }\n", i)).split("return ")[1]; };
    const change = AFTER.slice(AFTER.indexOf("function isValidQueryChange("), AFTER.indexOf("\n    }\n", AFTER.indexOf("function isValidQueryChange(")));
    for (const { field, check } of OPTIONAL) {
      if (own[field]) expect(change).toContain(`&& (!('${field}' in written) || ${own[field]}(data))`);
      else expect(change, field).toContain(`&& (!('${field}' in written) || (${check} || data.get('${field}', null) == null))`);
    }
    const checkOf = (f: string) => OPTIONAL.find((o) => o.field === f)!.check;
    expect(fnBody("isValidQueryMaterialsWanted")).toBe(`${checkOf("materialsWanted")} || data.get('materialsWanted', null) == null`);
    /* the one rewritten type test: isValidQuery's four (string, int, float, number) in two, since number is int or float */
    expect(checkOf("materialsRequestedQuantity")).toBe("(data.materialsRequestedQuantity is string || data.materialsRequestedQuantity is int || data.materialsRequestedQuantity is float || data.materialsRequestedQuantity is number)");
    expect(fnBody("isValidQueryMaterialsQuantity")).toBe("(data.materialsRequestedQuantity is string || data.materialsRequestedQuantity is number) || data.get('materialsRequestedQuantity', null) == null");
    /* the enums: an `in` over exactly the values isValidQuery chains with == */
    for (const [name, f] of [["isValidQueryStatus", "status"], ["isValidQuerySendMethod", "sendMethod"]] as const) {
      const i = body.indexOf(`data.${f} is string`);
      const chain = body.slice(i, body.indexOf("\n        )\n", i));
      const was = [...chain.matchAll(/== '([^']+)'/g)].map((m) => m[1]);
      const now = [...fnBody(name).matchAll(/'([^']+)'/g)].map((m) => m[1]);
      expect(fnBody(name)).toMatch(new RegExp(`^data\\.${f} in \\[`));
      expect(now).toEqual(was);
      expect(was.length).toBeGreaterThanOrEqual(4);
    }
    /* and isValidQueryChange checks nothing isValidQuery does not name */
    const named = [...change.matchAll(/!\('(\w+)' in (?:changed|written)\)/g)].map((m) => m[1]);
    /* a required key is checked on any change, removal included; an optional key when it is written */
    for (const r of ["id", "userId", "manuscriptId", "agentId", "packageId", "status", "sendMethod"]) expect(change).toContain(`(!('${r}' in changed) ||`);
    expect([...change.matchAll(/' in changed\)/g)]).toHaveLength(7);
    expect([...change.matchAll(/' in written\)/g)]).toHaveLength(66);
    expect(named.sort()).toEqual([...OPTIONAL.map((o) => o.field), "id", "userId", "manuscriptId", "agentId", "packageId", "status", "sendMethod"].sort());
  });
  it("every key gated inside a group is in that group's hasAny list, and every listed key is gated there", () => {
    const change = AFTER.slice(AFTER.indexOf("function isValidQueryChange("), AFTER.indexOf("\n    }\n", AFTER.indexOf("function isValidQueryChange(")));
    const groups = change.split("&& (!changed.hasAny([").slice(1);
    expect(groups.length).toBeGreaterThanOrEqual(2);
    let seen = 0;
    for (const g of groups) {
      const listed = [...g.slice(0, g.indexOf("])")).matchAll(/'(\w+)'/g)].map((m) => m[1]);
      const gated = [...g.matchAll(/!\('(\w+)' in (?:changed|written)\)/g)].map((m) => m[1]);
      expect(gated, listed.join(",")).toEqual(listed);
      seen += gated.length;
    }
    expect(seen).toBe(73);
    /* nothing is gated outside a group */
    expect(change.slice(0, change.indexOf("&& (!changed.hasAny(["))).not.toMatch(/ in (changed|written)\)/);
  });
  it("66 optional fields, every one with a valid value and at least two invalid ones", () => {
    /* counted two ways: the clause pattern, and every data.get( in isValidQuery — the pattern once missed the last
       clause (agentRecheckOn ends in ";"), which left it unchecked on update */
    expect((body.match(/data\.get\(/g) ?? []).length).toBe(66);
    expect(OPTIONAL).toHaveLength(66);
    expect(OPTIONAL.map((o) => o.field)).toContain("agentRecheckOn");
    for (const { field, check } of OPTIONAL) expect(invalidFor(field, check).length, field).toBeGreaterThanOrEqual(2);
    expect(REQUIRED_CHANGES).toHaveLength(5);
  });
});

describe("an update that sets an optional field to an invalid value is denied, before and after", () => {
  for (const { field, check } of OPTIONAL) {
    it(`${field}`, async () => {
      for (const s of SETS) {
        await seed(s, REQUIRED);
        /* the control: a valid value for the same field is allowed, so the denials below are the value's */
        await assertSucceeds(updateDoc(doc(me(s), path), { [field]: validFor(check) }));
        for (const bad of invalidFor(field, check)) {
          await seed(s, REQUIRED);
          await assertFails(updateDoc(doc(me(s), path), { [field]: bad.value })).catch((e) => { throw new Error(`${s} · ${field} = ${bad.label}: ${e}`); });
        }
      }
    });
  }
});

describe("an update that sets a required field to an invalid value, or deletes it, is denied, before and after", () => {
  for (const { field, valid, invalid } of REQUIRED_CHANGES) {
    it(`${field}`, async () => {
      for (const s of SETS) {
        await seed(s, REQUIRED);
        await assertSucceeds(updateDoc(doc(me(s), path), { [field]: valid }));
        for (const bad of [...invalid, { label: "deleted", value: deleteField() }]) {
          await seed(s, REQUIRED);
          await assertFails(updateDoc(doc(me(s), path), { [field]: bad.value })).catch((e) => { throw new Error(`${s} · ${field} = ${bad.label}: ${e}`); });
        }
      }
    });
  }
  /* the value-first checks lean on a deleted key's value test erroring and the null test allowing it: so delete, and
     null, every optional field, on the small query (before and after) and on the fullest (after) */
  for (const { field, check } of OPTIONAL) {
    it(`deleting or nulling ${field} is still allowed`, async () => {
      for (const s of SETS) for (const v of [deleteField(), null]) {
        await seed(s, { ...REQUIRED, [field]: validFor(check) });
        await assertSucceeds(updateDoc(doc(me(s), path), { [field]: v }));
      }
      for (const v of [deleteField(), null]) {
        await seed("after", { ...REQUIRED, ...FULLEST });
        await assertSucceeds(updateDoc(doc(me("after"), path), { [field]: v }));
      }
    });
  }
});

describe("an update outside the allowlist is denied, before and after", () => {
  const outside: V[] = [
    { label: "id", value: "q-2" }, { label: "userId", value: "someone-else" },
    { label: "a key no rule names", value: "x" }, { label: "nextStep (nested-map key)", value: { at: 1 } },
  ];
  for (const o of outside) {
    it(o.label, async () => {
      const key = o.label === "a key no rule names" ? "notAQueryField" : o.label.split(" ")[0];
      for (const s of SETS) {
        await seed(s, REQUIRED);
        await assertFails(updateDoc(doc(me(s), path), { [key]: o.value }));
        /* the same key beside an allowlisted valid change is still denied */
        await assertFails(updateDoc(doc(me(s), path), { [key]: o.value, rrNotes: "fine" }));
      }
    });
  }
});

describe("a create with any invalid field is denied, before and after", () => {
  it("the control: a create with the required fields only is allowed", async () => {
    for (const s of SETS) await assertSucceeds(setDoc(doc(me(s), path), REQUIRED));
  });
  for (const { field, check } of OPTIONAL) {
    it(`${field}`, async () => {
      for (const s of SETS) for (const bad of invalidFor(field, check)) {
        await assertFails(setDoc(doc(me(s), path), { ...REQUIRED, [field]: bad.value })).catch((e) => { throw new Error(`${s} · create ${field} = ${bad.label}: ${e}`); });
      }
    });
  }
  for (const r of ["id", "userId", "manuscriptId", "agentId", "packageId", "status", "sendMethod"]) {
    it(`missing ${r}`, async () => {
      const { [r]: _gone, ...rest } = REQUIRED as Record<string, unknown>;
      for (const s of SETS) await assertFails(setDoc(doc(me(s), path), rest));
    });
  }
  it("a create naming another writer is denied", async () => {
    for (const s of SETS) await assertFails(setDoc(doc(me(s), path), { ...REQUIRED, userId: "someone-else" }));
  });
});

describe("after: on the FULLEST query, a valid update is allowed and every invalid one still denied", () => {
  /* ⚠️ NOT "every field at once": an update that changes 25+ keys still meets the limit (24 fit, measured in
     reports/rules-budget-v1/ledger/after/expr-count.json). The cost now follows the keys an update CHANGES. The widest
     writes the app sends are below; each must stay allowed on the fullest query. */
  it("the undo that puts the query back whole (restoreSnapshot) after the widest write is allowed", async () => {
    await seed("after", { ...REQUIRED, ...FULLEST, ...WIDEST[Object.keys(WIDEST)[0]] });
    await assertSucceeds(setDoc(doc(me("after"), path), { ...REQUIRED, ...FULLEST }));
  });
  for (const [label, patch] of Object.entries(WIDEST)) {
    it(`the app's ${label} is allowed on the fullest query`, async () => {
      await seed("after", { ...REQUIRED, ...FULLEST });
      await assertSucceeds(updateDoc(doc(me("after"), path), patch));
    });
  }
  it("the bug, before: the same reminder update on the fullest query was DENIED (the 1,000-expression limit)", async () => {
    await seed("before", { ...REQUIRED, ...FULLEST });
    await assertFails(updateDoc(doc(me("before"), path), { nudgeDate: "2026-12-04", nudgeSetAt: "2026-11-24T12:00:00.000Z" }));
  });
  it("one reminder update on the fullest query is allowed", async () => {
    await seed("after", { ...REQUIRED, ...FULLEST });
    await assertSucceeds(updateDoc(doc(me("after"), path), { nudgeDate: "2026-12-04", nudgeSetAt: "2026-11-24T12:00:00.000Z" }));
  });
  for (const { field, check } of [...OPTIONAL, ...REQUIRED_CHANGES.map((r) => ({ field: r.field, check: "" }))]) {
    it(`${field} invalid on the fullest query`, async () => {
      const bads = check ? invalidFor(field, check) : REQUIRED_CHANGES.find((r) => r.field === field)!.invalid;
      for (const bad of bads) {
        await seed("after", { ...REQUIRED, ...FULLEST });
        await assertFails(updateDoc(doc(me("after"), path), { [field]: bad.value })).catch((e) => { throw new Error(`fullest · ${field} = ${bad.label}: ${e}`); });
      }
    });
  }
});
