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
import { surnameKey } from "../../lib/queryCentreGrid";
import { sliceBetween } from "../../test/sliceBetween";
import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline";
import { deriveQueryFields } from "../../lib/queryDerivation";
import { OUTCOME_STATUS } from "../../lib/responseDraft";
import { QueryStatus } from "../../types";
import { NudgeDesk } from "./NudgeDesk";
import { MarkSentDesk } from "./MarkSentDesk";
import { IlloSlot } from "./IlloSlot";
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
    /* bounded on the NEXT save — saveDeskClosed (§2, correction pass 3) is a second legitimate
       caller of the primitive further down, and the old wide bound counted it */
    const body = page.slice(at, page.indexOf("const saveDeskMarkSent", at));
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
    /* §3 of correction pass 3: recorded-but-zero (the journey's own "0" stamp, or prose parseQty
       reads as 0) takes the SAME branch as absent — formatQty(0) is "" and a blank field wearing
       "as asked" is the fabricated-value family with a new face. Both halves of the brief's
       assert: absent/zero → unit default + no label; a real figure → that figure + the label. */
    expect(page).toContain("const askedN = req?.materialsQuantity ? parseQty(String(req.materialsQuantity)) : 0;");
    expect(page).toContain('const amount = askedN > 0 ? String(askedN) : snapToUnit(unit);');
    expect(page).toContain("setDeskMarkAsk(askedN > 0 ? { amount, unit } : null);");
    const desk = readFileSync(join(process.cwd(), "src/components/queries/MarkSentDesk.tsx"), "utf8");
    expect(desk, "the qty is display-only — 'editable' is the brief's word").toContain('onChange={(e) => onDraft({ ...draft, qty: { ...qty, amount: String(parseQty(e.target.value)) } })}');
    /* and the label is HONEST: only while the draft still equals a figure the request RECORDED —
       never on a default, never after an edit (the fabricated-value family) */
    expect(page).toContain('askedLabel={deskMark.qty && deskMarkAsk && deskMark.qty.amount === deskMarkAsk.amount && deskMark.qty.unit === deskMarkAsk.unit ? "as asked" : null}');
    expect(page).toContain('setDeskMarkAsk(askedN > 0 ? { amount, unit } : null);');
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
    /* ⚠️ RETARGETED (v14 §3): the gate moved into `queryVerbs`, which the panel AND the list's
       action grid now import — the law is stronger for it, because one predicate cannot let two
       surfaces disagree about what a with-you row offers. Both halves asserted: the panel reads
       the predicate, and the predicate is the agent-side rule. */
    expect(panel).toContain("onNudge && verbs.nudge");
    expect(panel).toContain("const verbs = queryVerbs(facts.turn);");
    const verbsSrc = readFileSync(join(process.cwd(), "src/lib/queryRowFacts.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(verbsSrc).toContain('nudge: turn === "sand" || turn === "agent"');
    expect(verbsSrc, "a closed row offers a nudge").toMatch(/turn === "closed"[\s\S]{0,220}nudge: false/);
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

/* ══ correction pass 3 · §2 — Mark closed moves into the desk ═════════════════════════════════ */
describe("§2 (pass 3) · the close menu is retired; closed is the desk's fourth verb, one primitive", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("the in-flow menu is GONE — no state, no trigger, no 'Close this query as…' on the page", () => {
    expect(page).not.toContain("isCloseMenuOpen");
    expect(page).not.toContain("closeTriggerRef");
    /* the mobile sheet's own heading survives — the desktop popover's is gone with it */
    expect((page.match(/Close this query as/g) ?? []).length).toBe(1);
  });

  /* ⚠️ REWRITTEN BY §4, WHICH RETIRES THIS ASSERTION'S SUBJECT. Close is no longer a desk verb —
     it is one decision and it opens a quick popover. What survives is the law the count was
     standing for: BOTH live close controls behave the same way and each carries its own anchor,
     so the two cannot drift into two surfaces for one verb. `openDeskVerb("closed", …)` must now
     appear NOWHERE. */
  it("both live close controls open the QUICK POPOVER with their own anchor — and neither the desk", () => {
    expect((page.match(/openQuick\("close", activeQuery\.id, anchor\)/g) ?? []).length).toBe(2);
    expect(page, "a close control went back through the desk")
      .not.toMatch(/openDeskVerb\("closed"/);
    /* ⚠️ AND NUDGE STAYS ON THE DESK, which is the distinction §4.5 refuses to collapse: nudging
       composes a draft and wants the timeline; snoozing moves a date. */
    expect((page.match(/openDeskVerb\("nudge", anchor\)/g) ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("closed's save is ONE recordQueryResponse — the old menu's bare updateQueryStatus is retired from this act", () => {
    /* ⚠️ RETARGETED AT `commitClose`, WHICH IS WHERE THE WRITE LIVES NOW (§4.4). The desk's save
       and the quick popover's three reasons both call it, so asserting `saveDeskClosed`'s own
       body would now be asserting a delegation and would pass over a popover that had grown a
       second write. The LAW is unchanged: one close, one activity, one primitive. */
    const at = page.indexOf("const commitClose");
    expect(at, "the shared close primitive was renamed or removed").toBeGreaterThan(-1);
    const body = sliceBetween(page, "const commitClose", "const saveDeskClosed");
    expect((body.match(/recordQueryResponse\(/g) ?? []).length).toBe(1);
    expect(body).not.toContain("updateQueryStatus");
    /* the reason maps the way the primitive already maps it */
    expect(body).toContain('"Withdrew my submission"');
    expect(body).toContain('"No response after expected window"');
    expect(body).toContain("undo: () => res.undo()");
  });

  it("the derived line is the brief's copy, nudge clause only when a future nudge exists", () => {
    expect(page).toContain("Status becomes <b>Closed</b> — {deskClosed.reason}.");
    const at = page.indexOf("const deskClosedDerived");
    const body = page.slice(at, page.indexOf("const saveDeskResponse", at) > -1 ? page.indexOf("const saveDeskResponse", at) : at + 1200);
    expect(body).toContain("new Date(activeQuery.nudgeDate).getTime() > Date.now()");
  });

  it("the closed proposal joins the one ghost channel", () => {
    expect(page).toContain("const proposedAny = deskProposed ?? deskMarkProposed ?? deskClosedProposed;");
  });

  it("below md, the modal's 'close instead' hands over to the sheet that has the close rows", () => {
    expect(page).toContain("onCloseInstead={() => { setIsNudgeOpen(false); setMobileMoreOpen(true); }}");
  });
});

/* ══ drawer-3 · §3 — the illustration slots ═══════════════════════════════════════════════════ */
describe("§3 (drawer-3) · two slots, placeholder until art exists, one-line swap", () => {
  it("the placeholder admits itself: hatched chrome, the slot's name and size, hidden from AT", () => {
    const html = renderToStaticMarkup(React.createElement(IlloSlot, { name: "spot · nudge", width: 56, height: 56, round: true }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("spot · nudge");
    expect(html).toContain("qi-slot--round");
    expect(html).not.toContain("qi-slot--art");
  });

  it("art REPLACES the placeholder chrome in the same box — rim, hatch and label all leave together", () => {
    const html = renderToStaticMarkup(React.createElement(IlloSlot, {
      name: "spot · nudge", width: 56, height: 56, round: true,
      art: React.createElement("svg", { "data-art": "x" }),
    }));
    expect(html).toContain("qi-slot--art");
    expect(html).toContain('data-art="x"');
    expect(html, "the label survives beside finished art").not.toContain("spot · nudge");
  });

  it("the header slot is keyed by the STATE the band wears; the desk's by verb", () => {
    /* ⚠️ RETARGETED (colours v2): five flat states ARE the illustration families, so the fold from
       eight rungs to four is gone rather than rewritten — one fewer mapping between status and
       picture, and the slot's key is now the same word the band's class carries. */
    const panel = readFileSync(join(process.cwd(), "src/components/queries/QueryPanel.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(panel).toContain("state-specific · ${facts.state}");
    expect(panel).toContain("art={STATE_ART[facts.state]}");
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
    expect(page).toContain('spot={deskVerb === "closed" ? "close" : deskVerb}');
    expect(page).toContain('spot="correct"');
    const desk = readFileSync(join(process.cwd(), "src/components/queries/CorrectionDesk.tsx"), "utf8");
    expect(desk).toContain("art={SPOT_ART[spot]}");
  });

  it("both ART tables are EMPTY today — the slots render placeholders, and an entry is the whole swap", () => {
    const panel = readFileSync(join(process.cwd(), "src/components/queries/QueryPanel.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(panel).toMatch(/const STATE_ART[^=]*= \{\};/);
    const desk = readFileSync(join(process.cwd(), "src/components/queries/CorrectionDesk.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(desk).toMatch(/const SPOT_ART[^=]*= \{\};/);
  });
});

/* ══ drawer-3 · §2 — the desk's structural immunity ═══════════════════════════════════════════ */
describe("§2 (drawer-3) · the desk mounts on the BODY; the card scrolls inside its own wrapper", () => {
  const desk = readFileSync(join(process.cwd(), "src/components/queries/CorrectionDesk.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("portalled to document.body — no page ancestor can contain or clip a fixed desk", () => {
    expect(desk).toContain("return createPortal(");
    expect(desk).toContain("document.body,");
  });

  it("the scroller is INSIDE the card — the notch and the accent strip sit on a box that never scrolls", () => {
    expect(desk).toContain('className="qcd-scroll"');
    const css = readFileSync(join(process.cwd(), "src/components/queries/correctionDesk.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/\.qcd-scroll \{[^}]*overflow-y: auto/);
    expect(css, "the card grew its own overflow — the notch will clip").not.toMatch(/\.qcd-card \{[^}]*overflow/);
  });

  it("geometry 1: top-anchored to the window; the anchor moves only the notch", () => {
    expect(desk).toContain("const top = win.top + 12;");
    expect(desk).toContain("const maxH = win.height - 24;");
    /* the anchor's centre reaches ONLY the arrow expression, never the top */
    expect(desk).toMatch(/setPos\(\{ top, maxH, arrow: Math\.max\(10, Math\.min\(centre - top - 8, h - 26\)\) \}\)/);
  });
});

/* ══ colours v2 · Phase 2 — the stat tiles and the view switch ════════════════════════════════ */
describe("Phase 2 · the tiles state the whole set, and the switch changes only the renderer", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const tiles = readFileSync(join(process.cwd(), "src/components/queries/QueryStatTiles.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("the tile counts are the DERIVED ones — quickCounts over the scoped set, and THE overdue predicate", () => {
    expect(page).toContain("counts={quickTally}");
    expect(page).toContain("overdueCount={overdueTally}");
    /* the overdue figure calls the same predicate the filter does — never a second rule */
    expect(page).toContain("const overdueTally = mastheadScopedQueries.filter((q) => isOverdueForReply(q)).length;");
    expect(page).toContain("if (needsOverdue && !isOverdueForReply(q)) return false;");
  });

  it("⚠️ Past expected is a SECOND AXIS, not a fifth court — it combines with whichever court is on", () => {
    /* the chips' semantics exactly: one court + a flag. A tile row of five exclusive buttons would
       have made "with you AND past expected" unaskable, which is the commonest question here.
       ⚠️ RETARGETED FROM THREE SPELLINGS TO THE CLAIM (QC-chassis round, Phase 1), AND ONLY AFTER
       THOSE SPELLINGS CAUGHT A REAL REGRESSION. The tile MARKUP moved to `shared/StatTiles` so the
       To-do page could mount the same component; the first version of that component took ONE
       selected key and silently collapsed these two axes into one. This lock went red, correctly,
       on a page that then pressed a single tile where it had pressed two. So the claim is asserted
       where it now lives — the wrapper rings a SET, and the pick still branches on `past` — and
       the component is asserted to honour a set at all, which is the half that broke. */
    expect(tiles, "the overdue flag stopped combining with the court")
      .toContain("selected={overdue ? [quickKey, \"past\"] : [quickKey]}");
    expect(tiles, "past stopped toggling its own axis")
      .toContain("k === \"past\" ? onOverdue(!overdue) : onQuick(k as QuickKey)");
    const shared = readFileSync(join(process.cwd(), "src/components/shared/StatTiles.tsx"), "utf8");
    expect(shared, "the shared row cannot ring two tiles, so the two axes cannot both show")
      .toContain("Array.isArray(selected) ? selected.includes(k) : selected === k");
  });

  it("active is an ink border, never a fill — colour on this page states the court", () => {
    const css = readFileSync(join(process.cwd(), "src/components/queries/queryStatTiles.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/\.qct-tile--on \{[^}]*border-color: var\(--ink/);
    expect(css, "the active tile takes a fill").not.toMatch(/\.qct-tile--on \{[^}]*background/);
  });

  it("the retired chip row is gone — markup AND rules, together", () => {
    expect(page).not.toContain("qcc-quick");
    expect(page).not.toContain("QUICK_FILTERS.map");
    const grid = readFileSync(join(process.cwd(), "src/components/queries/queryCentreGrid.css"), "utf8");
    for (const c of [".qcc-qf ", ".qcc-qf{", ".qcc-quick", ".qcc-qf-sw", ".qcc-qf-mk"])
      expect(grid, `${c} outlived its markup`).not.toContain(c);
  });

  it("the view is session state with a URL reflection — one writer on the URL, not two", () => {
    /* ⚠️ `?q=` is App.tsx's and a selection NAVIGATES; a second owned param would put two writers
       on one URL. replaceState cannot navigate, so it cannot fight the router — and the effect
       re-asserts the param when a `?q=` navigation drops it. */
    expect(page).toContain('sessionStorage.setItem("sa.qcView", gridView)');
    expect(page).toContain("window.history.replaceState(window.history.state,");
    expect(page).toContain("}, [gridView, selectedQueryId]);");
    expect(page, "the view took the router's own writer").not.toMatch(/navigate\([^)]*view=/);
  });

  it("the switch is beside Sort and owns nothing else", () => {
    expect(page).toContain("<QueryViewSwitch view={gridView} onView={setGridView} />");
    const sw = readFileSync(join(process.cwd(), "src/components/queries/QueryViewSwitch.tsx"), "utf8");
    expect(sw, "the switch grew state of its own").not.toMatch(/useState|useEffect/);
  });
});

/* ══ colours v2 · Phases 3–5 — List, Board, and the Calendar placeholder ══════════════════════ */
describe("Phase 3–5 · three renderers over one set of rows", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const list = readFileSync(join(process.cwd(), "src/components/queries/QueryListView.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const board = readFileSync(join(process.cwd(), "src/components/queries/QueryBoardView.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("all three views take the SAME rows, already narrowed and ordered — no view re-derives", () => {
    for (const mount of ["<QueryListView", "<QueryBoardView", "<QueryCentreGrid"])
      expect(page, `${mount} is not fed gridRows`).toMatch(new RegExp(`${mount}[\\s\\S]{0,400}rows=\\{gridRows\\}`));
    for (const [what, src] of [["list", list], ["board", board]] as const) {
      /* ⚠️ NARROWED (toolbar v2, §2): this forbade ANY `.sort(`, which was the right claim about
         ROWS and the wrong one about headings — the list orders its group headings through the
         shared `compareGroupLabels`, which is the opposite of a second ordering. What must never
         happen is a view re-ordering the rows it was handed, so that is what is asserted. */
      expect(src, `the ${what} sorts the rows it was handed`).not.toMatch(/rows[\s\S]{0,12}\.sort\(/);
      expect(src, `the ${what} sorts a copy of the rows`).not.toMatch(/\[\.\.\.rows\]/);
      expect(src, `the ${what} filters on something other than its column`).not.toMatch(/matchesFilters|inQuick|quickCounts/);
    }
  });

  it("all three open the SAME drawer", () => {
    expect((page.match(/onOpen=\{\(id\) => onOpenQuery\?\.\(id\)\}/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("the list's headers speak the PAGE's sort vocabulary, and direction is one flag", () => {
    /* a header handing back GRID_SORTS' keys would be a second sort model over one list */
    for (const k of ["journey_depth", "agent_az", "date_newest", "due_soonest"])
      expect(list, `the list does not offer ${k}`).toContain(`"${k}"`);
    expect(page).toContain("onSort={(k) => { if (k === sortKey) setSortDesc((d) => !d); else { setSortKey(k); setSortDesc(false); } }}");
    expect(page).toContain("const compareQueries = (a: Query, b: Query): number => sortDesc ? -compareQueriesAsc(a, b) : compareQueriesAsc(a, b);");
  });

  it("⚠️ the board has NO drag — status is derived, and the board is a read", () => {
    for (const h of ["onDrop", "onDragStart", "onDragOver", "onDragEnd", "draggable"])
      expect(board, `the board grew a ${h} handler`).not.toContain(h);
  });

  it("seven columns in the enum's own order, every status reaching exactly one", async () => {
    const { BOARD_COLUMNS, boardColumnsCover, boardColumnFor } = await import("../../lib/queryCentreGrid");
    expect(BOARD_COLUMNS).toHaveLength(7);
    expect(BOARD_COLUMNS.map((c) => c.key)).toEqual(["queried", "preq", "psent", "freq", "fsent", "offer", "closed"]);
    expect(boardColumnsCover(), "a status reaches no column, or two").toBe(true);
    /* the two collectors the ref names, stated rather than implied */
    expect(boardColumnFor(QueryStatus.REVISE_RESUBMIT)).toBe("freq");
    expect(boardColumnFor(QueryStatus.NO_RESPONSE)).toBe("closed");
  });

  it("the band survives ONLY where the card's status is not its column's own", () => {
    expect(board).toContain("const alt = r.status !== col.statuses[0];");
    expect(board).toContain("{alt && (");
    /* and the strip is always there — the column made the band redundant, not the colour */
    expect(board).toContain('<span className="qbv-strip" aria-hidden="true" />');
  });

  it("⚠️ v14 §1 — the card is identity only, and the shingle went with the line it hid", () => {
    /* RETARGETED. The overlap's whole justification was covering the fact line at rest; with no
       line to cover it would have eaten the leaf instead. An 8px stack of short cards is also
       shorter than tall cards overlapped — the density is bought again, more plainly. */
    const css = readFileSync(join(process.cwd(), "src/components/queries/queryBoardView.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/\.qbv-card \{[^}]*margin-bottom: 8px/);
    expect(css, "the shingle survives").not.toMatch(/margin-bottom: calc\(-1/);
    expect(css, "the hover lift survives — there is nothing underneath to lift clear of").not.toMatch(/\.qbv-card:hover[^{]*\{[^}]*translateY/);
    expect(css, "the hover shadow went too — a clickable card should say so").toMatch(/\.qbv-card:hover[^{]*\{[^}]*box-shadow/);
    /* the fact line's rules went WITH its markup */
    for (const c of [".qbv-fact", ".qbv-fs", ".qbv-m ", ".qbv-mk"])
      expect(css, `${c} outlived its markup`).not.toContain(c);
    expect(board, "the board still renders a fact line").not.toContain("qbv-fact");
    expect(board, "the board still renders materials").not.toMatch(/MATERIAL_SLOTS|qbv-mats/);
    /* the header's rule is the state's deep step, and the header takes no fill */
    expect(css).toMatch(/\.qbv-h \{[^}]*border-bottom: 1\.5px solid var\(--state-accent/);
    expect(css.match(/\.qbv-h \{[^}]*\}/)?.[0] ?? "", "the column header grew a filled bar").not.toMatch(/background/);
  });

  it("the Calendar renders a placeholder and nothing else (Phase 5)", () => {
    expect(page).toContain('<p className="qcc-calph">Calendar — coming with the timeline board</p>');
    /* it must not have grown a second timeline board here — the fork the ref cautions against */
    expect(page).not.toMatch(/TodoCalendarPage|timeline-v57|<TimelineBoard/);
  });
});

/* ══ views pass 4 (v14) — the row, the verbs, the scrim and the motion ════════════════════════ */
describe("v14 §2–§4 · one predicate, one history, one ground", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const list = readFileSync(join(process.cwd(), "src/components/queries/QueryListView.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const panel = readFileSync(join(process.cwd(), "src/components/queries/QueryPanel.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const pcss = readFileSync(join(process.cwd(), "src/components/queries/queryPanel.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const lcss = readFileSync(join(process.cwd(), "src/components/queries/queryListView.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("§2 · the list's verbs ARE the drawer's — one predicate, imported by both", () => {
    expect(list).toContain('import { queryVerbs, type SinceEvent } from "../../lib/queryRowFacts";');
    expect(panel).toContain("const verbs = queryVerbs(facts.turn);");
    expect(list).toContain("const v = queryVerbs(f.turn);");
    /* neither surface restates a gate of its own */
    for (const [what, src] of [["list", list], ["panel", panel]] as const)
      expect(src, `${what} restates the agent-side gate`).not.toMatch(/turn === "sand" \|\| .*turn === "agent"/);
  });

  it("§2 · Court is retired, and the status is plain text with its dot", () => {
    expect(list).not.toContain("qlv-turn");
    expect(list).not.toContain("Court");
    expect(lcss, "the status pill kept a fill").not.toMatch(/\.qlv-st \{[^}]*background/);
    /* the row's colour is the bar, in the deep tone */
    expect(lcss).toMatch(/\.qlv-bar \{[^}]*background: var\(--state-accent/);
    expect(lcss).toMatch(/\.qlv-bar \{[^}]*width: 4px/);
  });

  it("§2 · the Sent leaf is the original send, in sand, whatever the row's state", () => {
    /* built from `dateSent` alone — the card's leaf legitimately drifts to the last event, and the
       Sent column must not, because it marks where the journey started */
    expect(page).toContain("const ms = q.dateSent ? new Date(q.dateSent).getTime() : NaN;");
    expect(page).toContain('out[q.id] = { month: MONTHS_SHORT[d.getMonth()].toUpperCase(), day: d.getDate(), caption: "sent" };');
    /* …and it wears the Queried class, so its month strip is sand on every row */
    expect(list).toContain('className="qlv-leaf qcc--st-queried"');
    /* one month table, shared with the card's own leaf */
    expect(page).toContain("MON as MONTHS_SHORT");
  });

  it("§2 · Since then reads the timeline's own rows, and says so when there are none", () => {
    expect(page).toContain("out[q.id] = sinceThen(activities as never, q.id,");
    expect(list).toContain("nothing yet");
    const facts = readFileSync(join(process.cwd(), "src/lib/queryRowFacts.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    /* the send is the leaf's, so it is excluded — what is left is precisely "since then" */
    expect(facts).toContain("if (a.activityType === ActivityType.QUERY_SENT) continue;");
    expect(facts).toContain("out.sort((x, y) => x.atMs - y.atMs)");
  });

  it("§2 · the action grid is fixed, and an absent verb is hidden rather than removed", () => {
    expect(lcss).toMatch(/\.qlv-acts \{[^}]*grid-template-columns: 132px 30px 30px 30px/);
    expect(list).toContain('style={v.nudge ? undefined : { visibility: "hidden" }}');
    expect(list).toContain('style={v.markClosed ? undefined : { visibility: "hidden" }}');
    /* a row action opens the DRAWER first — the desk needs its host and the ghost needs a rail */
    expect(page).toContain("setSelectedQueryId(id);\n                  onOpenQuery?.(id);");
  });

  it("⚠️ §3 · the top bar carries NO verbs — navigation only", () => {
    /* ⚠️ THE FAR ANCHOR IS SEARCHED FROM THE NEAR ONE. There are two `qpn-inner` in this file (the
       form mode's comes FIRST), so a bare indexOf gave a negative slice and an empty string — the
       first-match trap, caught by asserting the slice found something before reading it. */
    const barAt = panel.indexOf('<div className="qpn-bar">');
    expect(barAt, "the top bar has moved").toBeGreaterThan(-1);
    const bar = panel.slice(barAt, panel.indexOf('<div className="qpn-inner">', barAt));
    expect(bar.length, "the top bar's slice found nothing").toBeGreaterThan(100);
    expect(bar, "a verb survives in the top bar").not.toContain("qpn-act");
    expect(bar).toContain("Previous query");
    /* and the verb row exists, on the stage block's own ground */
    expect(panel).toContain('<div className="qpn-verbs">');
    expect(pcss).toMatch(/\.qpn-verbs \{[^}]*background-color: var\(--band-a/);
  });

  it("§4 · the scrim portals to the body and covers everything", () => {
    expect(panel).toContain("createPortal(");
    expect(panel).toContain("document.body,");
    expect(pcss).toMatch(/\.qpn-scrim \{[^}]*position: fixed; inset: 0/);
    expect(pcss).toMatch(/\.qpn-scrim \{[^}]*background: rgba\(58, 28, 20, 0\.14\)/);
    expect(pcss).toMatch(/\.qpn-scrim \{[^}]*transition: opacity 240ms/);
  });

  it("§4 · 360 opening, 220 closing, and reduced motion keeps the scrim's fade", () => {
    /* the timing lives on the state being transitioned TO, so no JS has to know the direction */
    expect(pcss).toMatch(/\.qpn \{[^}]*transition: transform 220ms cubic-bezier\(0\.4, 0, 1, 1\)/);
    expect(pcss).toMatch(/\.qpn\[data-on="true"\] \{[^}]*transition: transform 360ms cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)/);
    expect(pcss).toMatch(/\.qpn \{ transition-duration: 0s; \}/);
    expect(pcss).toMatch(/\.qpn-scrim \{ transition-duration: 120ms; \}/);
    /* ⚠️ NO `var()` INSIDE THE FRAMES — it fails silently in this setup */
    const frames = pcss.match(/@keyframes qpnRise \{[^}]*\}[^}]*\}/)?.[0] ?? "";
    expect(frames, "the rise keyframes are missing").toContain("translateY(8px)");
    expect(frames, "a var() reached the keyframes").not.toContain("var(");
  });
});

/* ══ toolbar v2 · §3 — the list header ════════════════════════════════════════════════════════ */
describe("§3 (sand band, superseding the mono) · the header is separated by its GROUND, and it drives THE sort", () => {
  const list = readFileSync(join(process.cwd(), "src/components/queries/QueryListView.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const css = readFileSync(join(process.cwd(), "src/components/queries/queryListView.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  /* ⚠️ REWRITTEN, NOT RETARGETED. The previous four assertions asserted PLAYFAIR — the choice
     this section withdraws — so they described a retired decision and are deleted rather than
     inverted. What survives is the LAW they were standing for: the header must not be set in the
     face the agent names beneath it use, whatever that face is. */
  /**
   * ⚠️ THIS CASE HAS NOW BEEN WRITTEN THREE TIMES, AND THE REASON IS WORTH MORE THAN THE VALUES.
   * v2 asserted Playfair; query-toolbar §3 replaced it with mono and asserted "NOT the serif the
   * agent names use"; this replaces it with Playfair again. Neither reversal was a mistake — what
   * changed underneath both is WHAT SEPARATES THE HEADER FROM THE ROWS. On a white header sharing
   * the rows' ground, the typeface was the only separator available, and a serif label an inch
   * above serif data cannot be read as a label. A sand band separates them by GROUND, which frees
   * the type to be the page's own voice.
   *
   * So the durable claim is the SEPARATION, and it is asserted as the band — not as a typeface,
   * which is the term that has flipped twice.
   */
  it("a sand band with its own rule — the header does not share the rows' ground", () => {
    expect(css).toMatch(/\.qlv-head \{[^}]*background: var\(--state-queried, #f7efe3\)/);
    expect(css).toMatch(/\.qlv-head \{[^}]*border-bottom: 1px solid #e4d9c9/);
    /* the rows keep the card's own white — if they ever took the band's ground the separation
       would be gone and this case would still pass on the header alone */
    expect(css, "the rows took the header's ground").not.toMatch(/(?:^|\n)\s*\.qlv-row \{[^}]*background:/);
  });

  /**
   * ⚠️ THE BUTTON MAY NOT DECLARE A FONT AT ALL, and this is the only part of the fault a source
   * lock can see. `.qlv-h--btn { font: inherit }` sat after `.qlv-h` at equal specificity and
   * reset the family and size to whatever the row inherits — so the header rendered in the page's
   * sans while the sheet said Playfair, and before that while it said JetBrains Mono. The mono
   * only LOOKED right because `text-transform` and `letter-spacing` are not part of the `font`
   * shorthand and came through on their own.
   *
   * ⚠️ AND `font-family: inherit` IS NOT THE FIX — it is the same damage spelled longhand, for the
   * same reason. The modifier needs no font reset: `.qlv-h` is an author rule on the same element
   * and beats the UA sheet unaided. So the assertion is an ABSENCE of any font declaration here.
   *
   * The rendered face is asserted where it belongs — `parity` in `queryViews.measure.ts` reads
   * the computed `font-family`, which is the only thing that can see a cascade.
   */
  it("the sortable header button declares no font — the shorthand was silently winning", () => {
    const btn = (css.match(/(?:^|\n)\.qlv-h--btn \{[^}]*\}/) ?? [""])[0];
    expect(btn, "the .qlv-h--btn rule vanished — this lock now asserts nothing").toContain("cursor: pointer");
    expect(btn, "a font declaration came back on the modifier").not.toMatch(/font(-family|-size|-weight)?\s*:/);
  });

  it("names in Playfair ink, orderless names muted — the ref's own four values", () => {
    expect(css).toMatch(/\.qlv-h \{[^}]*font-family: var\(--font-serif\)/);
    expect(css).toMatch(/\.qlv-h \{[^}]*font-size: 14px/);
    expect(css).toMatch(/\.qlv-h \{[^}]*color: var\(--ink/);
    expect(css).toMatch(/\.qlv-h--dead \{[^}]*color: #9c8878/);
  });

  /* ⚠️ THE ALIGNMENT LAW, AS SOURCE — the rendered proof is in the measurement, which is where a
     geometric claim belongs. What a source lock CAN say is that there is only one template and
     one horizontal padding to disagree about, which is the structural guarantee behind it. */
  it("one grid template and one horizontal padding, shared by the header and the rows", () => {
    const shared = css.match(/\.qlv-head, \.qlv-row \{[^}]*\}/g) ?? [];
    expect(shared.length, "the shared rule was split or renamed").toBeGreaterThanOrEqual(1);
    expect(shared[0]).toMatch(/grid-template-columns:/);
    expect(shared[0]).toMatch(/padding-left: 26px/);
    expect(shared[0]).toMatch(/padding-right: 18px/);
    /* neither may state a horizontal padding of its own — that is exactly how they drifted */
    const headOnly = (css.match(/(?:^|\n)\.qlv-head \{[^}]*\}/) ?? [""])[0];
    const rowOnly = (css.match(/(?:^|\n)\.qlv-row \{[^}]*\}/) ?? [""])[0];
    for (const [name, block] of [["head", headOnly], ["row", rowOnly]] as const) {
      expect(block, `${name} restated a horizontal padding`).not.toMatch(/padding-left|padding-right/);
      expect(block, `${name} used the padding shorthand, which sets all four`).not.toMatch(/padding:/);
    }
    /* ⚠️ AND THE MEDIA QUERY IS WHERE IT ACTUALLY BROKE: it narrowed the ROW's left padding and
       not the header's, so the two were 4px apart at 1280 and identical at 1440. */
    const mq = (css.match(/@media \(max-width: 1380px\) \{[\s\S]*?\n\}/) ?? [""])[0];
    /* ⚠️ ANCHORED. A bare `\.qlv-row \{` also matches the TAIL of `.qlv-head, .qlv-row {`, so the
       first form of this assertion went red on the shared rule that fixes the bug — the exact
       first-match trap this repo records against class-name locks, wearing a grouped selector. */
    expect(mq, "the narrow regime moved one of them without the other")
      .not.toMatch(/(?:^|\n)\s*\.qlv-row \{[^}]*padding-left/);
  });

  /* ⚠️ THE CONDITIONAL-MOUNT ASSERTION IS DELETED, NOT INVERTED. It required the caret to exist
     only on the sorted column, which is precisely what §3 changes: a caret that is mounted on
     hover grows an element under the pointer and reflows the label. Three opacities, one
     element, nothing moving. */
  it("the caret is always mounted and opacity-stepped — 0, .4 on hover, 1 when sorted", () => {
    expect(css).toMatch(/\.qlv-caret \{[^}]*color: #7c3a2a/);
    expect(css).toMatch(/\.qlv-caret \{[^}]*opacity: 0/);
    expect(css).toMatch(/\.qlv-h--btn:hover \.qlv-caret \{[^}]*opacity: 0\.4/);
    expect(css).toMatch(/\.qlv-h--on \.qlv-caret \{[^}]*opacity: 1/);
    expect(list, "the caret went back to being conditionally mounted").not.toContain("{sortKey === c.sort && (");
    /* ⚠️ AND NO COLOUR SHIFT ON HOVER — asserted as an ABSENCE, because the inherited rule would
       now lighten an ink label. The caret is the whole affordance, which is all the ref draws. */
    expect(css, "a hover colour came back, and from ink it can only lighten")
      .not.toMatch(/(?:^|\n)\s*\.qlv-h--btn:hover \{/);
  });

  /* ⚠️ RIGHT-ALIGNMENT IS RETIRED BY §4.1, so that half is deleted rather than kept. The law that
     survives is that the three orderless columns are not controls: muted, default cursor, and
     rendered as spans so they are out of the tab order entirely. */
  it("What went, Since then and Actions name no order — inert, muted, unfocusable", () => {
    expect(list).toContain('<span key={i} className="qlv-h qlv-h--dead">{c.label}</span>');
    expect(css).toMatch(/\.qlv-h--dead \{[^}]*cursor: default/);
    expect(css).toMatch(/\.qlv-h--dead \{[^}]*color: #9c8878/);
    /* §4.1 — the Actions column joins the other six rather than hanging off the right edge */
    expect(css).toMatch(/\.qlv-acts \{[^}]*justify-content: start/);
    expect(css, "Actions is right-aligned again").not.toMatch(/\.qlv-acts \{[^}]*justify-content: end/);
  });

  /* ⚠️ THE AGENT COLUMN SORTS BY SURNAME, which it claimed and did not do. Asserted through the
     PURE function rather than the comparator's spelling, so a refactor of the switch cannot
     redden it and a change of meaning must. */
  it("Agent sorts by surname, not by the whole name", () => {
    expect(surnameKey("Hester Blaine")).toBe("blaine");
    expect(surnameKey("Ottoline de Vere")).toBe("vere");
    expect(surnameKey("Madonna")).toBe("madonna");          // a mononym sorts under itself
    expect(surnameKey("  Iris  Kwan  ")).toBe("kwan");      // a trailing space is not a surname
    expect(surnameKey("Ana Ruiz-Marsh")).toBe("ruiz-marsh"); // a hyphenated surname is one token
    expect(surnameKey("")).toBe("");
    expect(surnameKey(null)).toBe("");
    /* and the comparator reaches it, with the full name as the tiebreak */
    expect(page).toMatch(/case "agent_az": return surnameKey\(agA\)[\s\S]{0,80}agA\.localeCompare\(agB\)/);
  });

  it("⚠️ ONE SORT STATE — a header writes the page's own key, so the Sort menu's label follows", () => {
    /* the header hands back the PAGE's vocabulary… */
    for (const k of ["journey_depth", "agent_az", "date_newest", "due_soonest"])
      expect(list, `the header does not offer ${k}`).toContain(`"${k}"`);
    /* ⚠️ …AND THE HEADER ACTUALLY CALLS IT. The first draft of this case asserted the keys and the
       page's routing and never the click, so a header whose onClick was emptied passed it — the
       parts were each correct and the composition was dead. Proved by that mutation. */
    expect(list, "a header no longer drives the sort").toContain("onClick={() => onSort(c.sort!)}");
    /* …the page routes it into the one sortKey, toggling direction on a repeat… */
    expect(page).toContain("onSort={(k) => { if (k === sortKey) setSortDesc((d) => !d); else { setSortKey(k); setSortDesc(false); } }}");
    /* …and the Sort MENU's face is DERIVED FROM THAT SAME KEY, which is what makes it follow a
       header click. ⚠️ ASSERTED AS THE DERIVATION, NOT THE MARKUP: the trigger's spelling is the
       To-do stream's to change (it is becoming a shared ToolbarButton as this runs), and a lock
       pinned to their markup would go red on an edit that leaves this claim entirely true. */
    expect(page, "the Sort control's face stopped being read from sortKey")
      .toContain("value={SORT_LABELS[sortKey] ?? \"Last activity\"}");
    /* ⚠️ AND THE TABLE COVERS THE KEYS THE MENU DOES NOT OFFER. The Status header sorts by
       `journey_depth`, which the five-row menu deliberately omits; a trigger reading the menu's
       own list would name "Last activity" while the list was ordered by something else. */
    expect(page).toMatch(/const SORT_LABELS[^=]*=[\s\S]{0,260}journey_depth:/);
  });
});

/* ══ toolbar v2 · §1 — the popovers' chassis ══════════════════════════════════════════════════ */
describe("§1 (toolbar v2) · an OPT-IN chassis, and a fourth caller that must not feel it", () => {
  const shell = readFileSync(join(process.cwd(), "src/components/shell/F12Shell.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const css = readFileSync(join(process.cwd(), "src/components/shell/f12.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("⚠️ THE DATE EDITOR IS THE FOURTH CALLER AND OPTS OUT — by default, not by care", () => {
    /* the variant defaults to `plain`, so a caller that says nothing renders exactly what it
       always did; the date editor says nothing, and that is asserted rather than assumed */
    expect(shell).toContain('chassis = "plain"');
    const dateAt = page.indexOf('title={dateEdit === "sent" ? "Date sent" : "Reply expected by"}');
    expect(dateAt, "the date editor has moved").toBeGreaterThan(-1);
    const mount = page.slice(page.lastIndexOf("<F12Popover", dateAt), dateAt + 400);
    expect(mount, "the date editor took the toolbar's chassis").not.toContain("chassis=");
    /* and every mount rule is scoped to the modifier, so the cascade cannot reach it */
    for (const rule of css.split("}").filter((r) => r.includes("f12-pop-frame") || r.includes("f12-pop-band") || r.includes("f12-pop-mbody")))
      expect(rule, `an unscoped mount rule: ${rule.slice(0, 60)}`).not.toMatch(/^\s*\.f12-pop\s*\{/);
  });

  it("the three toolbar menus opt IN, and nothing else does", () => {
    expect((page.match(/chassis="mount"/g) ?? []).length, "the mount chassis has spread").toBe(3);
    for (const title of ['title="Filter"', 'title="Group"', 'title="Sort"'])
      expect(page).toContain(title);
  });

  it("the chassis is the app's three layers — rim, frame, sage band", () => {
    expect(css).toMatch(/\.f12-pop--mount \{[^}]*border-radius: 14px/);
    expect(css).toMatch(/\.f12-pop--mount \{[^}]*padding: 6px/);
    expect(css).toMatch(/\.f12-pop-frame \{[^}]*border: 1px solid rgba\(124, 58, 42, 0\.28\)/);
    expect(css).toMatch(/\.f12-pop-frame \{[^}]*overflow: hidden/);
    expect(css).toMatch(/\.f12-pop-band \{[^}]*linear-gradient\(135deg, #dce0d9, #d0d6cc\)/);
    expect(css).toMatch(/\.f12-pop-bt \{[^}]*font-size: 14px/);
  });

  it("⚠️ the variant restyles the shell's OWN rows — it does not fork PRow", () => {
    /* naming a parallel `.f12-opt` set would have meant a second row component to render it */
    expect(css).toMatch(/\.f12-pop--mount \.f12-prow \{/);
    expect(css).toMatch(/\.f12-pop--mount \.f12-prow\.f12-on \{[^}]*background: var\(--state/);
    expect(css, "a parallel option class was introduced").not.toMatch(/\.f12-opt \{/);
  });

  it("Filter is THREE facets — Status, Sent via, Version — and Included is gone, not deprecated", () => {
    const at = page.indexOf("const renderFilterPopover");
    const body = page.slice(at, page.indexOf("const renderGroupPopover", at));
    const labels = [...body.matchAll(/<PopSection label="([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(["Status", "Sent via", "Version"]);
    /* ⚠️ Version stays because this popover is its ONLY control — the ref's "exactly two" would
       have retired Part E's filter by accident. */
    expect(body).toContain("setVersionFilter");
    /* Included had no other reader, so the field went with the facet rather than being deprecated */
    const grid = readFileSync(join(process.cwd(), "src/lib/queryCentreGrid.ts"), "utf8");
    expect(grid, "the retired facet's field survives").not.toContain("included");
    expect(page).not.toContain("needsTasks");
  });

  it("Sort is five keys plus ONE footer control, and the labels flip for the name keys", () => {
    const at = page.indexOf("const SORT_KEYS");
    const keys = [...page.slice(at, page.indexOf("SORT_IS_NAME", at)).matchAll(/key: "([^"]+)"/g)].map((m) => m[1]);
    expect(keys).toEqual(["last_activity", "date_newest", "due_soonest", "agent_az", "agency_az"]);
    expect(page).toContain('SORT_IS_NAME(sortKey) ? "A–Z" : "Newest"');
    expect(page).toContain('SORT_IS_NAME(sortKey) ? "Z–A" : "Oldest"');
    /* ⚠️ A KEY THE MENU OFFERS IS A KEY THE SORT CAN DO — `agency_az` came with its own case, or
       it would have fallen through and ordered by something else under an honest-looking label. */
    expect(page).toMatch(/case "agency_az": \{/);
  });
});

/* ══ toolbar v2 · §2 — Group actually groups ══════════════════════════════════════════════════ */
describe("§2 (toolbar v2) · one partition, three views, and a board that says why not", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const list = readFileSync(join(process.cwd(), "src/components/queries/QueryListView.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const grid = readFileSync(join(process.cwd(), "src/components/queries/QueryCentreGrid.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("⚠️ the List partitions with the GRID'S OWN functions — never a second grouping", () => {
    for (const src of [grid, list]) {
      expect(src).toContain("groupLabelFor(r, group)");
      expect(src).toContain("compareGroupLabels(a, b, group)");
    }
    expect(page).toContain("group={gridGroup}");
    /* both views are handed the same state, so they cannot partition differently */
    expect((page.match(/group=\{gridGroup\}/g) ?? []).length).toBe(2);
  });

  it("an empty group is omitted — the buckets ARE the headings", () => {
    /* headings come from the bucket keys, so a group with nothing in it cannot have a heading */
    for (const src of [grid, list])
      expect(src).toContain("[...buckets.keys()].sort((a, b) => compareGroupLabels(a, b, group))");
    expect(list).toContain('group === "none"');
  });

  it("the heading's rule is the group's own deep step, and blank where the group names no state", () => {
    const gridLib = readFileSync(join(process.cwd(), "src/lib/queryCentreGrid.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(gridLib).toContain("export function groupAccentClass");
    /* ⚠️ agency and month name no state, so they get "" and the CSS falls back to neutral —
       borrowing a state's colour for a group that is not a state would mean nothing */
    expect(gridLib).toMatch(/if \(key === "status"\)[\s\S]{0,400}return "";\n\}/);
    const gcss = readFileSync(join(process.cwd(), "src/components/queries/queryCentreGrid.css"), "utf8");
    expect(gcss).toMatch(/\.qcc-sech-rule \{[^}]*background: var\(--state-accent, #e4d9cb\)/);
    const lcss = readFileSync(join(process.cwd(), "src/components/queries/queryListView.css"), "utf8");
    expect(lcss).toMatch(/\.qlv-gline \{[^}]*background: var\(--state-accent, #e4d9cb\)/);
  });

  it("⚠️ the Board disables Group and says why — it is already grouped by status", () => {
    expect(page).toContain('disabled={gridView === "board"}');
    expect(page).toContain('title={gridView === "board" ? "The board is already grouped by status." : undefined}');
    /* and it keeps stating its value, because the reason it is disabled is that the value is true */
    expect(page).toContain('value={gridView === "board" ? "Status" : (GRID_GROUPS.find((g) => g.key === gridGroup)?.label ?? "None")}');
    const tb = readFileSync(join(process.cwd(), "src/components/shared/ToolbarButton.tsx"), "utf8");
    /* the shared control gained the state ADDITIVELY — the To-do page's mounts pass nothing */
    expect(tb).toContain("disabled = false");
    expect(tb).toContain('className={disabled ? "qcc-tb-btn qcc-tb-btn--off" : "qcc-tb-btn"}');
  });

  it("the headings are not sticky", () => {
    const lcss = readFileSync(join(process.cwd(), "src/components/queries/queryListView.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(lcss.match(/\.qlv-ghead \{[^}]*\}/)?.[0] ?? "", "the list's heading sticks").not.toContain("sticky");
    const gcss = readFileSync(join(process.cwd(), "src/components/queries/queryCentreGrid.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(gcss.match(/\.qcc-sech \{[^}]*\}/)?.[0] ?? "", "the grid's heading sticks").not.toContain("sticky");
  });
});

/* ══ quick actions · §4 — snooze and close are one decision each ══════════════════════════════ */
describe("§4 (quick actions) · no drawer, no desk, no selection — and one component for all of it", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const pop = readFileSync(join(process.cwd(), "src/components/queries/QuickActionPopover.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const list = readFileSync(join(process.cwd(), "src/components/queries/QueryListView.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const panel = readFileSync(join(process.cwd(), "src/components/queries/QueryPanel.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  /**
   * ⚠️ THE SECTION'S WHOLE CLAIM, AND IT IS AN ABSENCE. The rendered proof is the measurement's
   * (no `.qpn` in the DOM, route unchanged); what a source lock can prove is that the quick pair
   * RETURNS before the lines that open things. Asserted as order, not as presence: the drawer
   * calls are still there for the composing verbs, and a lock that merely forbade them would go
   * red on a correct file.
   */
  it("the quick pair returns BEFORE anything that opens a drawer, a desk or a selection", () => {
    const body = sliceBetween(page, "onVerb={(id, verb, anchor) => {", "sortKey={sortKey}");
    const guard = body.indexOf('if (verb === "snooze" || verb === "closed")');
    const ret = body.indexOf("return;", guard);
    expect(guard, "the quick pair is no longer intercepted").toBeGreaterThan(-1);
    expect(ret, "the interception does not return").toBeGreaterThan(guard);
    for (const opener of ["setSelectedQueryId(id)", "onOpenQuery?.(id)", "openDeskVerb("]) {
      const at = body.indexOf(opener);
      expect(at, `${opener} vanished — this lock is now asserting nothing`).toBeGreaterThan(-1);
      expect(at, `${opener} runs before the quick pair returns`).toBeGreaterThan(ret);
    }
  });

  /* ⚠️ ONE COMPONENT, NOT THREE. The copy law is measured on the rendered popover from each
     anchor; here we prove there is only one thing to render. */
  it("every anchor mounts the SAME component — the page has exactly one QuickActionPopover", () => {
    expect((page.match(/<QuickActionPopover/g) ?? []).length).toBe(1);
    expect(list, "the list grew its own popover").not.toContain("QuickActionPopover");
    expect(panel, "the drawer grew its own popover").not.toContain("QuickActionPopover");
    /* the list's slot two is snooze, and it hands the page an anchor rather than opening anything */
    expect(list).toContain('onVerb?.(r.id, "snooze", e.currentTarget)');
    expect(panel).toContain("onSnooze(e.currentTarget)");
  });

  /**
   * ⚠️ THE THIRD ANCHOR, AND IT IS DRIVEN BY THE FACTS RATHER THAN BY THE PROSE. Which caption
   * clause is the reminder comes from `nudgePartIndex`; a view testing `part.startsWith("Nudge
   * agent in")` would stop being a control the day the wording changed, silently. This file
   * already records the same lesson from the other direction — the drawer's tray used to REGEX
   * the caption for a figure and went on labelling a true number with a false label.
   */
  it("the reminder clause is a control in BOTH places, and neither matches on the wording", () => {
    const facts = readFileSync(join(process.cwd(), "src/lib/queryCardFacts.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(facts, "the facts stopped publishing which clause is the reminder").toContain("nudgePartIndex");
    /* the list's clause */
    expect(list).toContain("i === f.nudgePartIndex && v.nudge");
    expect(list).toContain('onVerb?.(r.id, "snooze", e.currentTarget)');
    /* the drawer's clause — the SAME string, passed in rather than rebuilt */
    expect(panel).toContain("reminderLabel && onSnooze && verbs.nudge");
    expect(page).toContain("panelRow.facts.captionParts[panelRow.facts.nudgePartIndex]");
    /* neither surface may recognise the clause by reading it */
    for (const view of [list, panel]) {
      expect(view, "a view matched the reminder clause on its wording")
        .not.toMatch(/Nudge agent in|no nudge set/);
    }
  });

  /* ⚠️ THE DASHED UNDERLINE IS THE PANE'S "edit in place", NOT THE TIMELINE'S "provisional".
     Two grammars live three inches apart on this page and the repo already paid for diluting
     one; both anchors wear the same one, and it is asserted so a restyle cannot split them. */
  it("both reminder clauses wear one dashed treatment", () => {
    const lcss = readFileSync(join(process.cwd(), "src/components/queries/queryListView.css"), "utf8");
    const pcss = readFileSync(join(process.cwd(), "src/components/queries/queryPanel.css"), "utf8");
    expect(lcss).toMatch(/\.qlv-snz \{[^}]*border-bottom: 1px dashed #cdbfae/);
    expect(pcss).toMatch(/\.qpn-snz \{[^}]*border-bottom: 1px dashed #cdbfae/);
  });

  /**
   * ⚠️ SNOOZE WRITES NO ACTIVITY — the claim its own sub-line makes to the reader. Asserted over
   * the write's body, and it names the activity primitives rather than counting calls, because
   * "one call fewer" is not the claim: the claim is that NONE of them is reachable from here.
   */
  it("snooze writes no activity — the reminder moves, and nothing is recorded", () => {
    const body = sliceBetween(page, "const commitQuickSnooze", "const commitStopNudging");
    for (const w of ["recordQueryResponse", "addActivity", "logNudge", "recordMaterialsSent", "markSentWithReceipt"])
      expect(body, `snooze reached ${w}`).not.toContain(w);
    /* both halves of the one reminder — the page's caption and the board's card */
    expect(body).toContain("updateQuery(q.id, { nudgeDate: next }");
    expect(body).toContain('dismissTask("nudge_overdue", q.id, "fixed snooze", days)');
    /* and it is reversible, restoring the PRIOR date rather than compensating with a negative */
    expect(body).toContain("undo:");
    expect(body).toContain("nudgeDate: prior");
  });

  it("close writes exactly one activity, through the one primitive both surfaces share", () => {
    const body = sliceBetween(page, "const commitClose", "const saveDeskClosed");
    expect((body.match(/recordQueryResponse\(/g) ?? []).length).toBe(1);
    /* the desk delegates rather than keeping a second copy of the write */
    const desk = sliceBetween(page, "const saveDeskClosed", "const commitExpectedDate");
    expect(desk, "the desk grew its own close write again").not.toContain("recordQueryResponse(");
    expect(desk).toContain("commitClose(");
  });

  /* ⚠️ THE DIAL IS THE TO-DO DIAL. A second stops table here is the thing the brief forbids, and
     it is what a reader would reach for first — the ref draws three static rows. */
  it("the dial is imported, never re-rolled — no second stops table", () => {
    expect(pop).toContain('import { SnoozeDialBody } from "../todo/SnoozeDial"');
    for (const n of ["SNOOZE_STOPS", "1 week", "2 weeks", "4 weeks", "8 weeks"])
      expect(pop, `the popover restated a stop (${n})`).not.toContain(n);
  });

  it("the three reasons are the ref's, in the ref's order and words", () => {
    expect(pop).toMatch(/REJECTED[\s\S]{0,40}"They passed"/);
    expect(pop).toMatch(/WITHDRAWN[\s\S]{0,40}"I withdrew it"/);
    expect(pop).toMatch(/NO_RESPONSE[\s\S]{0,40}"No reply — gone quiet"/);
    /* the full path stays available rather than being replaced by four more controls */
    expect(pop).toContain("Open the query");
  });

  /* ⚠️ THE CHASSIS IS §1'S. A bespoke rim/frame/band here would be the second chassis the toolbar
     sections just finished removing — and the give-away is a border colour restated in this file. */
  it("it wears the toolbar's chassis rather than a second one", () => {
    expect(pop).toContain('chassis="mount"');
    const css = readFileSync(join(process.cwd(), "src/components/queries/quickAction.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const own of ["rgba(124, 58, 42, 0.28)", "linear-gradient(135deg", "border-radius: 14px"])
      expect(css, `the quick actions restated the chassis (${own})`).not.toContain(own);
  });
});

/* ══ Contact parity · §1/§2 — one header component, one count, one trial fewer ═════════════════ */
describe("Contact parity · the Query Centre wears Contact list's header", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const agl = readFileSync(join(process.cwd(), "src/components/agents/AgentList.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const trial = readFileSync(join(process.cwd(), "src/components/shell/illustratedMasthead.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  /**
   * ⚠️ THE BRIEF ASKED FOR AN EXTRACTION AND THERE WAS NOTHING TO EXTRACT. Both pages already
   * mount the shared `PageHeader`; the header was never page-local. So "assert Contact list's
   * rendered header is byte-identical before and after" is satisfied by Contact list not being
   * touched at all — which this asserts positively rather than by silence.
   */
  it("both pages mount the SAME shared component, and Contact list is untouched", () => {
    expect(page).toContain('import { PageHeader } from "./shell/PageHeader"');
    expect(agl).toContain('import { PageHeader } from "../shell/PageHeader"');
    for (const src of [page, agl]) expect(src).toContain('<PageHeader\n            variant="workspace"');
    /* Contact list still passes exactly what it passed — a per-page header would show up here */
    expect(agl).toContain('icon={rolodexIcon}');
    expect(agl).toContain('title="Contact list"');
  });

  /**
   * ⚠️ THE PICTURE IS `icon`, NOT `mark` AND NOT `illo`. The brief names the `IlloSlot`/`ArtSlot`
   * primitive and an `art` prop; neither is the masthead's left-hand picture. `mark` does not
   * render in the masthead at all, `illo` is the slot BETWEEN the text and the primary, and
   * `ArtSlot`'s real prop is `src`. `icon` is what Contact list passes, so `icon` is what parity
   * means — same prop, same `.wsh-icon`, same box.
   */
  it("the masthead picture is the icon prop, drawn as a plain img with no placeholder chrome", () => {
    expect(page).toContain("icon={qcMastheadIcon}");
    expect(page).toContain('import qcMastheadIcon from "../assets/queries/query-centre-masthead.png"');
    /* the header must NOT reach for the placeholder primitive here — that draws hatching and a
       mono caption, which is the chrome this asset exists to retire */
    /* ⚠️ THE END ANCHOR IS THE ELEMENT'S OWN CLOSE, and `sliceBetween` REFUSED my first one —
       `scrollLabel=` does not appear after this point in the file, and rather than widening the
       slice silently to the rest of the source it named the missing anchor. That is the whole
       reason the helper exists. */
    const mast = sliceBetween(page, "masthead={", "description=\"Every query");
    for (const w of ["ArtSlot", "IlloSlot", "illo="])
      expect(mast, `the masthead reached for ${w} instead of the icon prop`).not.toContain(w);
    /* `PageHeader` renders it `alt=""` — the title beside it already names the page */
    const ph = readFileSync(join(process.cwd(), "src/components/shell/PageHeader.tsx"), "utf8");
    expect(ph).toContain('<img className="wsh-icon" src={icon} alt="" />');
  });

  /**
   * ⚠️ THE HERO BAND WAS A TWO-PAGE TRIAL, and this removes ONE page from it. The file's own
   * header says deleting it reverts BOTH pages — so the hazard here is the removal that takes out
   * a rule serving two. Verified in both directions against the post-edit file: no live Query
   * Centre selector survives, and all five Packages rules do.
   */
  it("Query Centre left the illustrated-masthead trial; Packages is entirely intact", () => {
    expect(trial, "a live qc-wpg selector survived the removal").not.toContain("qc-wpg");
    for (const sel of [
      ".wpg.pkgw-wpg {",
      ".wpg.pkgw-wpg > .wpg-scroll > .wpg-chrome::after {",
      ".wpg.pkgw-wpg .wsh {",
      ".wpg.pkgw-wpg .wpg-toolband {",
    ]) expect(trial, `Packages lost ${sel}`).toContain(sel);
    expect(trial).toContain("--illo-art: url(../../assets/packages/packages.webp)");
    /* and the page no longer claims a wash it does not have */
    expect(page, "the masthead still refuses a picture on the band's behalf").not.toContain("NO MARK");
  });

  /**
   * ⚠️ ONE COUNT, AND IT IS THE SHARED `PageTally`. The figure was in the footer and is now in the
   * control row — moved, not copied, which is the difference between one fact and two that will
   * eventually disagree.
   */
  it("N of M is stated once, by the shared tally, from this page's own two figures", () => {
    expect(page).toContain("<PageTally value={`${gridRows.length} of ${mastheadScopedQueries.length}`} />");
    expect((page.match(/<PageTally/g) ?? []).length).toBe(1);
    expect(page, "the footer still states the count").not.toContain("Showing <b>{gridRows.length}</b>");
    /* Export CSV stays in the foot, and the foot holds it to the right now that it is alone */
    expect(page).toContain("Export CSV");
    expect(page).toContain('className="qcc-foot qcc-foot--export"');
    const css = readFileSync(join(process.cwd(), "src/components/queries/queryCentreGrid.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/\.qcc-foot--export \{[^}]*justify-content: flex-end/);
    expect(css, "the count's bold rule outlived the count").not.toMatch(/\.qcc-foot b\s*\{/);
  });
});
