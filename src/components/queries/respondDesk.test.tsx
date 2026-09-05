/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Respond-nudge run · §2 — the ghost IS the saved rung, and the derived line speaks the
 * derivation's own word.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline";
import { deriveQueryFields } from "../../lib/queryDerivation";
import { OUTCOME_STATUS } from "../../lib/responseDraft";
import { QueryStatus } from "../../types";
import { NudgeDesk } from "./NudgeDesk";
import { MarkSentDesk } from "./MarkSentDesk";
import { existsSync } from "node:fs";

const q = { id: "q1", status: QueryStatus.QUERIED, dateSent: "2026-08-12T12:00:00.000Z" } as never;
const sent = { id: "a1", type: QueryStatus.QUERIED, createdAt: "2026-08-12T12:00:00.000Z" };
const proposal = (over: Record<string, unknown> = {}) => ({
  id: "__ghost", type: QueryStatus.PARTIAL_REQUESTED, resultingStatus: QueryStatus.PARTIAL_REQUESTED,
  createdAt: "2026-09-05T12:00:00.000Z", materialsType: "pages", materialsQuantity: "50", ...over,
});

describe("§2 · the ghost rung IS the saved rung — one builder, one renderer", () => {
  it("the ghost's text equals the saved rung's text for the same inputs", () => {
    /* the seam: the ONLY difference between drafting and saved is the activity's id */
    const ghostRows = buildTimelineRows([sent, proposal()], q, null);
    const savedRows = buildTimelineRows([sent, proposal({ id: "act-real" })], q, null);
    const strip = (rows: ReturnType<typeof buildTimelineRows>) =>
      renderToStaticMarkup(React.createElement(TimelineRows, { rows }))
        .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    expect(strip(ghostRows)).toBe(strip(savedRows));
  });

  it("a ghost renders NO ⋯ — a proposal cannot be 'corrected', and the fork it would open has no document", () => {
    /* found on a live snapshot: `activityId: "__ghost"` is truthy, so the menu gate rendered
       "Correct this entry" on the proposal; clicking it opens the fork on a doc that does not
       exist AND closes the verb desk mid-compose (one desk at a time). */
    const rows = buildTimelineRows([sent, proposal()], q, null);
    const html = renderToStaticMarkup(
      React.createElement(TimelineRows, { rows, ghostId: "__ghost", onMenuOpen: () => {} } as never),
    );
    expect(html.indexOf("tl-ev--ghost")).toBeGreaterThan(-1);
    /* COUNTED, not sliced — a slice bounded on a class prefix cut before the menu region and
       passed in both directions (proved on its own first draft). One real row → one menu. */
    expect((html.match(/aria-label="Correct this entry"/g) ?? []).length).toBe(1);
  });

  it("the ghost wears the dashed skin and the saved rung the pulse — skin only, additive", () => {
    const rows = buildTimelineRows([sent, proposal()], q, null);
    const ghostHtml = renderToStaticMarkup(React.createElement(TimelineRows, { rows, ghostId: "__ghost" }));
    expect(ghostHtml).toMatch(/tl-ev--ghost/);
    const freshHtml = renderToStaticMarkup(React.createElement(TimelineRows, { rows, freshId: "__ghost" }));
    expect(freshHtml).toMatch(/tl-ev--fresh/);
    /* and neither class renders when the prop is absent — To-do's bare render untouched */
    const bare = renderToStaticMarkup(React.createElement(TimelineRows, { rows }));
    expect(bare).not.toMatch(/tl-ev--ghost|tl-ev--fresh/);
  });
});

describe("§2 · the derived line speaks the derivation's word", () => {
  it("the status word equals deriveQueryFields' result over the proposed events", () => {
    for (const [outcome, status] of Object.entries(OUTCOME_STATUS)) {
      if (outcome === "offer") continue; /* offer routes to the existing journey */
      const derived = deriveQueryFields([
        { type: QueryStatus.QUERIED, createdAt: "2026-08-12T12:00:00.000Z" },
        { type: status, resultingStatus: status, createdAt: "2026-09-05T12:00:00.000Z" },
      ] as never);
      expect(derived.status, `${outcome}'s line would state a word the recompute does not`).toBe(status);
    }
  });

  it("the page builds the line from OUTCOME_STATUS and getPrimaryAction — never a second table", () => {
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
    expect(page).toContain("const st = deskProposed.resultingStatus as QueryStatus;");
    expect(page).toContain("const holder = getPrimaryAction(st).ballHolder;");
    expect(page).toMatch(/Status becomes <b>\{st\}<\/b>/);
  });
});

describe("§2 · one activity per save, through the one primitive", () => {
  it("saveDeskResponse calls recordQueryResponse exactly once and overlays only what it collected", () => {
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const at = page.indexOf("const saveDeskResponse = async");
    expect(at).toBeGreaterThan(-1);
    const body = page.slice(at, page.indexOf("const [deskFreshStatus", at));
    expect((body.match(/recordQueryResponse\(/g) ?? []).length).toBe(1);
    expect(body).toContain("...responseDraftToPayload(deskResp)");
    expect(body, "the quantity does not reach the payload").toContain("materialsQuantity: parseQty(deskQty.amount)");
    expect(body, "the close reason does not reach the payload").toContain('deskCloseReason === "withdrew"');
    expect(body).toContain("undo: () => res.undo()");
  });

  it("offer routes OUT to the existing journey — the desk collects no terms", () => {
    const desk = readFileSync(join(process.cwd(), "src/components/queries/RespondDesk.tsx"), "utf8");
    expect(desk).toContain('k.key === "offer" ? onOffer()');
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
    expect(page).toMatch(/onOffer=\{\(\) => \{ setDeskVerb\(null\); openRecord\(activeQuery\); \}\}/);
  });
});

/* ══ §3 — mark sent in the desk ═══════════════════════════════════════════════════════════════ */
describe("§3 · the window rule is the log sheet's, verbatim", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("the desk feeds the SAME draftExpectedOverrideIso — keeping the window writes nothing", () => {
    expect(page).toContain("draftExpectedOverrideIso({ reminder: deskMark.reminder, dateSent: deskMark.dateSent } as never, activeAgent)");
    /* and the save spreads the override only when it derives */
    expect(page).toContain("...(deskMarkOverrideIso ? { writerExpectedDate: deskMarkOverrideIso } : {})");
  });

  it("the derived expected FOLLOWS the override, else the window", () => {
    const at = page.indexOf("const deskMarkExpected");
    const body = page.slice(at, page.indexOf("const deskMarkDerived", at));
    expect(body).toContain("if (deskMarkOverrideIso) return deskMarkOverrideIso;");
    expect(body).toContain("d.setDate(d.getDate() + win * 7);");
  });

  it("one send activity through the receipt-bearing face; the Undo restores both halves", () => {
    const at = page.indexOf("const saveDeskMarkSent");
    const body = page.slice(at, page.indexOf("const saveDeskNudge", at));
    expect((body.match(/markSentWithReceipt\(/g) ?? []).length).toBe(1);
    expect(body).toContain("await deleteActivities([res.activityId]);");
    expect(body).toContain("writerExpectedDate: res.prior.writerExpectedDate ?? deleteField()");
    expect(body).toContain("nudgeDate: res.prior.nudgeDate ?? deleteField()");
  });

  it("'as asked' is a pre-fill from the request's own figure — and stays editable", () => {
    expect(page).toContain('req?.materialsQuantity ? String(parseQty(String(req.materialsQuantity))) : snapToUnit(unit)');
    const desk = readFileSync(join(process.cwd(), "src/components/queries/MarkSentDesk.tsx"), "utf8");
    expect(desk, "the qty is display-only — 'editable' is the brief's word").toContain('onChange={(e) => onDraft({ ...draft, qty: { ...qty, amount: String(parseQty(e.target.value)) } })}');
    /* and the label is HONEST: only while the draft still equals a figure the request RECORDED —
       never on a default, never after an edit (the fabricated-value family) */
    expect(page).toContain('askedLabel={deskMark.qty && deskMarkAsk && deskMark.qty.amount === deskMarkAsk.amount && deskMark.qty.unit === deskMarkAsk.unit ? "as asked" : null}');
    expect(page).toContain('setDeskMarkAsk(req?.materialsQuantity ? { amount, unit } : null);');
  });
});

/* ══ §4 — nudge in the desk ═══════════════════════════════════════════════════════════════════ */
describe("§4 · the draft is the ONE template, and the nudge is one activity with a whole undo", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const save = (() => {
    const at = page.indexOf("const saveDeskNudge");
    expect(at, "saveDeskNudge missing").toBeGreaterThan(-1);
    const end = page.indexOf("const pickSendMethod", at) > -1 ? page.indexOf("const pickSendMethod", at) : page.indexOf("};", page.indexOf("finally", at));
    return page.slice(at, end);
  })();

  it("the desk's letter is nudgeDraft over the shared requestedProse — never a second letter", () => {
    expect(page).toContain("? nudgeDraft({");
    expect(page).toContain("requested: requestedProse(activeQuery.status as QueryStatus)");
    /* and the mapping has ONE home — FocusFlow imports the same one */
    const flow = readFileSync(join(process.cwd(), "src/components/todo/FocusFlow.tsx"), "utf8");
    expect(flow).toContain('import { nudgeDraft, requestedProse } from "../../lib/nudgeDraft"');
    expect(flow.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("function requestedProse");
  });

  it("the clipboard copy happens FIRST, inside the click's gesture, and is best-effort", () => {
    const copyAt = save.indexOf("navigator.clipboard?.writeText(deskNudgeDraftText)");
    const logAt = save.indexOf("await logNudge(");
    expect(copyAt).toBeGreaterThan(-1);
    expect(logAt).toBeGreaterThan(-1);
    expect(copyAt, "the copy must precede the write — clipboard access outside the gesture is refused").toBeLessThan(logAt);
  });

  it("one nudge activity through logNudge; the chosen interval IS the recorded check-back", () => {
    expect((save.match(/logNudge\(/g) ?? []).length).toBe(1);
    /* weeks → nudgeDate + N·7; custom → its own date; none → NO checkBackDate key at all */
    expect(save).toContain("d.setDate(d.getDate() + deskNudge.again.weeks * 7)");
    expect(save).toContain("...(checkBackDate ? { checkBackDate } : {})");
  });

  it("the Undo deletes the rung and puts the PRIOR reminder back — both fields, deleteField when absent", () => {
    expect(save).toContain("await deleteActivities([res.activityId!]);");
    expect(save).toContain("nudgeDate: res.prior?.nudgeDate ?? deleteField()");
    expect(save).toContain("lastNudgeSentDate: res.prior?.lastNudgeSentDate ?? deleteField()");
  });

  it("the again-after default is the existing reminder's own interval, else 4", () => {
    const at = page.indexOf("const deskNudgeDefaultWeeks");
    const body = page.slice(at, page.indexOf("useEffect", at));
    expect(body).toContain('if (!activeQuery?.nudgeDate) return 4;');
    expect(body).toContain("activeQuery.lastNudgeSentDate || activeQuery.dateSent");
    expect(body).toContain("wks >= 1 && wks <= 52 ? wks : 4");
  });

  it("Nudge stays absent for with-you and closed — the panel's turn gate is untouched", () => {
    const panel = readFileSync(join(process.cwd(), "src/components/queries/QueryPanel.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(panel).toContain('onNudge && (facts.turn === "sand" || facts.turn === "agent")');
  });

  it("the derived line states record + unchanged status + never-sends, in the ref's words", () => {
    expect(page).toContain("Records a <b>Nudged</b> rung on the timeline. Status stays <b>{activeQuery.status}</b>.");
    expect(page).toContain("draft is copied for your mail client — ScriptAlly never sends.");
  });
});

describe("§4 · the NudgeDesk renders the ref's anatomy", () => {
  const render = (over: Record<string, unknown> = {}) => renderToStaticMarkup(
    React.createElement(NudgeDesk, {
      agencyName: "Stillwater Reps",
      subject: "Query sent 12 Aug · 24 days ago · window 6 weeks",
      toEmail: "harriet@stillwaterreps.co.uk",
      draftText: "Dear Harriet,\n\nA line.",
      defaultWeeks: 4,
      draft: { nudgeDate: "2026-09-05", again: { kind: "weeks", weeks: 4 } },
      onDraft: () => {},
      derivedLine: "derived",
      onRecord: () => {},
      onCancel: () => {},
      ...over,
    }),
  );

  it("mail block: To + from-your-own-client, the draft's lines, and the sage default chip leads", () => {
    const html = render();
    expect(html).toContain("harriet@stillwaterreps.co.uk");
    expect(html).toContain("from your own mail client");
    expect(html).toContain("Dear Harriet,");
    const chips = html.slice(html.indexOf("qrd-chips"));
    expect(chips.indexOf("qrd-win"), "the default interval chip leads the row").toBeLessThan(chips.indexOf("Pick a date"));
    expect(chips).toContain("No more nudges");
    expect(html).toContain("Copy draft &amp; record nudge");
  });

  it("no To line when the agent has no recorded email — absence, not a placeholder", () => {
    const html = render({ toEmail: null });
    expect(html).not.toContain(">To <");
    expect(html).toContain("from your own mail client");
  });
});

/* ══ §5 — the viewport surfaces retire ════════════════════════════════════════════════════════ */
describe("§5 · the popover is gone, the modal is mobile-only, the desk took their work", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("MarkSentPopover: no file, no import, no mount — the desk carries the verb AND the version field", () => {
    expect(existsSync(join(process.cwd(), "src/components/MarkSentPopover.tsx"))).toBe(false);
    expect(page).not.toContain("MarkSentPopover");
    expect(page).not.toContain("isMarkSentOpen");
  });

  it("NudgeModal mounts behind the mobile gate only — the desk has no mobile geometry, the modal is its stand-in below md", () => {
    expect(page).toContain("{isMobile && isNudgeOpen && activeQuery && activeAgent && (");
    /* exactly one mount, and no other <NudgeModal on the page */
    expect((page.match(/<NudgeModal/g) ?? []).length).toBe(1);
  });

  it("the closure offer's Nudge now opens the DESK, notched to the button that asked", () => {
    /* sliced to the drawer's Tracking mount — the page-wide string would also match the top-bar
       wiring, and a lock either caller satisfies distinguishes nothing (proved by mutation) */
    const at = page.indexOf('ghostId={proposedAny ? "__ghost" : null}');
    expect(at, "the Tracking mount has moved").toBeGreaterThan(-1);
    const end = page.indexOf("onSetExpectedDate", at);
    expect(end, "the mount's far anchor is missing").toBeGreaterThan(at);
    const mount = page.slice(at, end);
    expect(mount).toContain('onNudge={(anchor) => openDeskVerb("nudge", anchor)}');
    expect(mount).not.toContain("setIsNudgeOpen");
    const timeline = readFileSync(join(process.cwd(), "src/components/reading-pane/QueryTimeline.tsx"), "utf8");
    expect(timeline).toContain("onClick={(e) => onNudge(e.currentTarget)}");
  });

  it("the version field renders at two versions and not at one — D8, behaviourally", () => {
    const render = (n: number) => renderToStaticMarkup(
      React.createElement(MarkSentDesk, {
        title: "Mark the partial sent", subject: "s", askedLabel: null,
        draft: { dateSent: "2026-09-05", sendMethod: "Email" as never, reminder: { kind: "none" }, qty: null, bookVersionId: "", note: "" },
        onDraft: () => {}, windowWeeks: 6,
        bookVersions: Array.from({ length: n }, (_, i) => ({ id: `v${i}`, name: `Draft ${i + 1}` })),
        readVersion: null, derivedLine: "d", onMark: () => {}, onCancel: () => {},
      }),
    );
    const two = render(2);
    expect(two).toContain("Version sent");
    expect(two).toContain("— not recorded —");
    expect(two).toContain("No version is recorded for the sample you queried with.");
    expect(render(1)).not.toContain("Version sent");
  });
});
