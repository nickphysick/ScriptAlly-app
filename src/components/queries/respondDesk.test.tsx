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
import { sliceBetween, sliceFrom } from "../../test/sliceBetween";
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
    expect(page).toContain("draft is copied for your mail client — QueryHawk never sends.");
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
  /* `tiles` read a file retired with v11 */

  /* ⚠️ RETIRED (Query Centre v11, 19 Sep): the five "whose court" tiles are gone — the sentence's menu states
     the same counts. The law this case held (the four courts PARTITION the set; the counts read the
     scoped set, never the filtered view) is asserted as a property in `lib/qcSummary.test.ts`. */

  /* ⚠️ RETIRED (Query Centre v11): the tiles' two-axis selection went with the tiles. "Past expected" is one of the
     sentence's filters now, and it stays agent's-turn only — `lib/qcSummary.test.ts`. */

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

  /* ⚠️ RETIRED → `queries/centre/qcCentre.test.tsx`: the view is remembered per DEVICE now (localStorage),
     the default is List, a remembered `board` maps to List, and `?view=` is still a reflection with one
     writer. Same law, new storage. */

  /* ⚠️ RETIRED: there is no Sort pill for the switch to sit beside. The switch is `QcCentre`'s own three
     segments; that it owns nothing but the view is asserted in `qcCentre.test.tsx`. */
});

/* ══ colours v2 · Phases 3–5 — List, Board, and the Calendar placeholder ══════════════════════ */
/* ⚠️ DESCRIBE RETIRED (Query Centre v11, 19 Sep) — "Phase 3–5 · three renderers over one set of rows".
   Its subjects are deleted: `QueryBoardView` (the Board view is removed) and `QueryListView` (replaced by
   `centre/QcList`). The law that mattered — every view takes the ONE derived list and re-derives nothing —
   is restated against the v11 page in `centre/qcCentre.test.tsx`; the board's own cases (no drag, seven
   columns, the band) have nothing left to describe. */

/* ══ views pass 4 (v14) — the row, the verbs, the scrim and the motion ════════════════════════ */
describe("v14 §2–§4 · one predicate, one history, one ground", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  /* `list` read a file retired with v11 */
  const panel = readFileSync(join(process.cwd(), "src/components/queries/QueryPanel.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const pcss = readFileSync(join(process.cwd(), "src/components/queries/queryPanel.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  /* `lcss` read a file retired with v11 */

  /* ⚠️ RETIRED (v11): rows carry no verbs. `queryVerbs` is still the ONE predicate — read by the drawer and by the
     docked card (`centre/qcList.test.tsx`: "only what `queryVerbs` offers"). */

  /* ⚠️ RETIRED (v11) with `QueryListView` and its sheet. */

  /* ⚠️ RETIRED (v11) with `QueryListView`: the v11 row's date tile is the send date, on the row's state colour. */

  /* ⚠️ RETIRED (v11) with `QueryListView`: the v11 row has no "since then" column; the card's Tracking tab is the timeline. */

  /* ⚠️ RETIRED (v11): there is no row action grid. */

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
/* ⚠️ DESCRIBE RETIRED (v11) — "§3 (sand band…) · the header is separated by its GROUND, and it drives THE sort".
   It locked `QueryListView`'s sortable header and its sheet, both deleted. The v11 list's head names four
   columns and sorts nothing (the sentence sorts); its template, floors and ceilings are locked in
   `centre/qcList.test.tsx` and measured in tests/e2e/qcV11.measure.ts. */

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

  it("Sort is six keys plus ONE footer control, and the labels name what each direction does", () => {
    const at = page.indexOf("const SORT_KEYS");
    const keys = [...page.slice(at, page.indexOf("SORT_IS_NAME", at)).matchAll(/key: "([^"]+)"/g)].map((m) => m[1]);
    /* ⚠️ SIX SINCE §4 — `attention` leads, and it is the grid's default. */
    expect(keys).toEqual(["attention", "last_activity", "date_newest", "due_soonest", "agent_az", "agency_az"]);
/* ⚠️ THREE WORDINGS NOW, ONE STATE. "Newest" is nonsense over a register ladder — reversing
       an attention sort gives the calm ones first, not older ones — so the segment names what the
       direction does for the key in hand. The same law that made A–Z replace Newest for a surname. */
    expect(page).toContain('["Needs me first", "Needs me last"]');
    expect(page).toContain('["A–Z", "Z–A"]');
    expect(page).toContain('["Newest", "Oldest"]');
    /* ⚠️ A KEY THE MENU OFFERS IS A KEY THE SORT CAN DO — `agency_az` came with its own case, or
       it would have fallen through and ordered by something else under an honest-looking label. */
    expect(page).toMatch(/case "agency_az": \{/);
    /* the same guard for the new key: a key the menu offers is a key the sort can do */
    expect(page).toMatch(/case "attention": \{/);
  });
});

/* ══ toolbar v2 · §2 — Group actually groups ══════════════════════════════════════════════════ */
/* ⚠️ DESCRIBE RETIRED (v11) — "§2 (toolbar v2) · one partition, three views, and a board that says why not".
   Group is gone from the page, so neither view partitions and there is no heading to rule or to keep
   un-sticky. `lib/queryCentreGrid`'s grouping functions keep their own unit tests. */

/* ══ quick actions · §4 — snooze and close are one decision each ══════════════════════════════ */
describe("§4 (quick actions) · no drawer, no desk, no selection — and one component for all of it", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const pop = readFileSync(join(process.cwd(), "src/components/queries/QuickActionPopover.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  /* `list` read a file retired with v11 */
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
    /* ⚠️ RETARGETED 11 Sep (Grid pass §5): the list's inline closure became `handleRowVerb`, the ONE
       handler both views mount. The claim is unchanged — the quick pair returns before anything
       opens — and is asserted on that function; that both views mount it is asserted below. */
    /* ⚠️ RETARGETED AGAIN (Query Centre v11, 19 Sep): rows carry no verbs, so the quick pair is reached
       from the open card's ⋯. The claim is unchanged — Snooze and Mark closed open a one-answer
       popover and NOTHING else: no desk, no selection change, no navigation — and it is asserted on
       the card's `onAction`, where only Nudge goes to the desk. */
    const at = page.indexOf("onAction={(action, anchor) => {");
    expect(at, "the card's action handler is missing").toBeGreaterThan(-1);
    const body = page.slice(at, page.indexOf("}}", at));
    expect(body).toContain('if (action === "nudge") openDeskVerb("nudge", anchor);');
    expect(body).toContain('else openQuick(action === "snooze" ? "snooze" : "close", activeQuery.id, anchor);');
    for (const opener of ["setSelectedQueryId(", "onOpenQuery?.(", "openRecord("]) {
      expect(body, `the quick pair now reaches ${opener}`).not.toContain(opener);
    }
  });

  /* ⚠️ ONE COMPONENT, NOT THREE. The copy law is measured on the rendered popover from each
     anchor; here we prove there is only one thing to render. */
  it("every anchor mounts the SAME component — the page has exactly one QuickActionPopover", () => {
    expect((page.match(/<QuickActionPopover/g) ?? []).length).toBe(1);
    /* the v11 list and grid carry no controls at all, so neither can grow one */
    for (const f of ["QcList.tsx", "QcGrid.tsx"]) expect(readFileSync(join(process.cwd(), "src/components/queries/centre", f), "utf8"), `${f} grew its own popover`).not.toContain("QuickActionPopover");
    expect(panel, "the drawer grew its own popover").not.toContain("QuickActionPopover");
    /* the drawer hands the page its BUTTON rather than opening anything; so does the docked card's ⋯ */
    expect(panel).toContain("onSnooze(e.currentTarget)");
    const card = readFileSync(join(process.cwd(), "src/components/queries/centre/QcOpenCard.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(card, "the docked card grew its own popover").not.toContain("QuickActionPopover");
    expect(card).toContain("onAction(k as OpenAction, moreRef.current)");
  });

  /**
   * ⚠️ THE THIRD ANCHOR, AND IT IS DRIVEN BY THE FACTS RATHER THAN BY THE PROSE. Which caption
   * clause is the reminder comes from `nudgePartIndex`; a view testing `part.startsWith("Nudge
   * agent in")` would stop being a control the day the wording changed, silently. This file
   * already records the same lesson from the other direction — the drawer's tray used to REGEX
   * the caption for a figure and went on labelling a true number with a false label.
   */
  /* ⚠️ RETIRED (v11): the list's reminder clause is gone with the row's controls; Snooze is reached from the card's ⋯
     and from the drawer's own clause (narrow column), both through the page's one `openQuick`. */

  /* ⚠️ THE DASHED UNDERLINE IS THE PANE'S "edit in place", NOT THE TIMELINE'S "provisional".
     Two grammars live three inches apart on this page and the repo already paid for diluting
     one; both anchors wear the same one, and it is asserted so a restyle cannot split them. */
  /* ⚠️ RETIRED (v11): one of the two clauses (the list's) no longer exists. */

  /**
   * ⚠️ SNOOZE WRITES NO ACTIVITY — the claim its own sub-line makes to the reader. Asserted over
   * the write's body, and it names the activity primitives rather than counting calls, because
   * "one call fewer" is not the claim: the claim is that NONE of them is reachable from here.
   *
   * ⚠️ AND IT WAS GREEN THROUGHOUT A BUG THAT MADE THE CLAIM FALSE (repaired 21 Sep). Sweeping
   * THIS body for activity primitives asks whether the CALL SITE writes an activity; the claim is
   * about the snooze. `db.dismissTask` special-cased `nudge_overdue` and wrote a `NUDGE_SENT`
   * activity — "Nudge sent to {agent} at {agency}" — before it touched the flag, so every snooze
   * recorded a nudge the writer never sent, and nothing here could see it. A property of the part
   * standing in for the whole, which is the failure this repo keeps rebuilding.
   *
   * The delegate's own half now has its own file (`lib/dismissTask.test.ts`). What is added here
   * is the JOIN: this body writes no activity AND the one writer it hands off to is named, so the
   * two cases cannot both be satisfied while the composed path writes one.
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
    /* ⚠️ THE UNDO LIFTS THE SUPPRESSION, IT DOES NOT RE-SNOOZE BY ZERO. `("fixed snooze", 0)` read
       as KEEP, so the board went on hiding a card this page had just restored — and the two lines
       above, asserting the date comes back, were satisfied the whole time. */
    expect(body).toContain('dismissTask("nudge_overdue", q.id, "lift")');
    /* the other half of the claim: what the delegate itself may do (lib/dismissTask.test.ts) */
    const dismiss = sliceBetween(
      readFileSync(join(process.cwd(), "src/lib/db.tsx"), "utf8"),
      "const dismissTask = async", "  // Log a nudge —", "dismissTask",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const w of ["ActivityType", "activityType", "setDoc"])
      expect(dismiss, `the snooze's delegate writes an activity again (${w})`).not.toContain(w);
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
  /* ⚠️ RETIRED: the Query Centre DECLINES the shared masthead (v11, 19 Sep) — its head is its own, on the
     page's cream. Contact list still mounts `PageHeader`; the opted-out set is named in
     `workspacePageGrid.test.tsx` and CLAUDE.md. */

  /**
   * ⚠️ THE PICTURE IS `icon`, NOT `mark` AND NOT `illo`. The brief names the `IlloSlot`/`ArtSlot`
   * primitive and an `art` prop; neither is the masthead's left-hand picture. `mark` does not
   * render in the masthead at all, `illo` is the slot BETWEEN the text and the primary, and
   * `ArtSlot`'s real prop is `src`. `icon` is what Contact list passes, so `icon` is what parity
   * means — same prop, same `.wsh-icon`, same box.
   */
  /* ⚠️ RETIRED with the masthead: there are no illustrations on this page in this pass. */

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
  /* ⚠️ RETIRED: the count is stated once by the SENTENCE ("All 26 queries", "4 with you"), and the shared
     tally is no longer mounted here. Asserted in `qcCentre.test.tsx`. */
});

/* ══ the well round · §1–§5 ═══════════════════════════════════════════════════════════════════ */
describe("the well round · a recess, a toolbar in its head, bones, and one entrance", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const css = readFileSync(join(process.cwd(), "src/components/queries/queryCentreGrid.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const cardCss = readFileSync(join(process.cwd(), "src/components/queries/queryCard.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const btn = readFileSync(join(process.cwd(), "src/components/shared/ToolbarButton.tsx"), "utf8");

  /* §1 — the recess */
  /* ⚠️ RETARGETED BECAUSE THE WELL IS GONE (§1), AND WHAT SURVIVES IS THE CLAIM UNDERNEATH IT.
     The recess was the subject of five assertions — its fill, its radius, its inset shadow, its
     ground token and its lack of overflow. Four described a box that no longer exists and are
     deleted rather than re-pointed at `.qcc-plain`, which would be a lock inventing a subject.

     The fifth is the real law and it never was about the well: the sticky control row must COVER
     the cards scrolling beneath it, so it paints the ground it sits on. That is asserted here, and
     the `overflow` clause travels with it — an overflow on the wrapper turns the sticky toolbar
     into a clamp, which is a fact about stickiness rather than about a recess. */
  it("the sticky row covers with the ground it sits on, and the wrapper never clips", () => {
    const css = readFileSync(join(process.cwd(), "src/components/queries/queryCentreGrid.css"), "utf8");
    expect(css, "the wrapper stopped declaring the row's cover").toMatch(/\.qcc-plain \{[^}]*--qcc-well-bg:/);
    expect(css, "the control row paints something other than its ground")
      .toMatch(/\.qcc-controls \{[^}]*background: var\(--qcc-well-bg/);
    expect(css, "the wrapper grew an overflow — the sticky toolbar will clamp")
      .not.toMatch(/\.qcc-plain \{[^}]*overflow/);
    /* the recess itself is gone from the sheet, not emptied */
    expect(css.replace(/\/\*[\s\S]*?\*\//g, ""), "the retired well still has a rule")
      .not.toMatch(/\.qcc-well\s*\{/);
  });

  it("the card's shadow is warm, and stays the page's own ink", () => {
    const shadow = (cardCss.match(/\.qcc \{[^}]*box-shadow:([^;]*);/) ?? [])[1] ?? "";
    expect(shadow).toContain("rgba(58, 28, 20");
    /* no blue-biased cast: every rgb triple in the shadow must be warm (r > b) */
    for (const m of shadow.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g))
      expect(Number(m[1]), `cool shadow stop ${m[0]}`).toBeGreaterThan(Number(m[3]));
  });

  /* ⚠️ THE WELL WRAPS EVERY VIEW — asserted as ORDER, because the claim is containment and a
     "the class exists" check cannot see it. The well opens before the toolbar and closes after
     the last view branch, so all four renderers are inside it. */
  /* ⚠️ RETARGETED AGAIN, AND THE LAW IS NOW SIMPLER THAN THE ONE IT REPLACES. This case has been
     through three shapes: the well wrapped every view, then grid and list only, and now there is
     no well. What has never changed is the claim it exists for — ONE wrapper holds the toolbar and
     the body, so the toolbar lands on the same coordinates whichever view is open. A conditional
     className was how that could come apart; there is no condition left to get wrong. */
  it("⚠️ one wrapper, unconditional — the toolbar cannot move between views", () => {
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
    expect(page, "the wrapper chooses a ground again").not.toContain('gridView === "board" || gridView === "calendar" ? "qcc-plain"');
    expect(page, "the retired well is emitted again").not.toMatch(/["'`]qcc-well["'`]/);
    const open = page.indexOf('className="qcc-plain"');
    expect(open, "the wrapper is gone").toBeGreaterThan(-1);
  });

  /* §2 — the toolbar's three tracks */
  /* ⚠️ RETIRED: the toolbar and the page's own search field are removed (v11). */

  /* §3 — the chip pill, and the two pages it must not reach */
  it("the chip pill is scoped to this page's toolbar, not to the shared button", () => {
    expect(css).toMatch(/\.qcc-tb \.qcc-tb-btn \{[^}]*border-radius: 99px/);
    expect(css).toMatch(/\.qcc-tb \.qcc-tb-lab \{[^}]*background: var\(--parchment/);
    /* ⚠️ THE BASE RULE MUST NOT CARRY IT. `.qcc-tb-btn` is mounted by the To-do page and by
       Contact list's AgentToolbar; a bare restyle moves three pages on a brief naming one. */
    const base = (css.match(/(?:^|\n)\.qcc-tb-btn \{[^}]*\}/) ?? [""])[0];
    expect(base, "the base pill took the chip radius — To-do and Contact list moved with it")
      .not.toMatch(/border-radius: 99px/);
    /* the label is an element now, and that change is additive */
    expect(btn).toContain('<span className="qcc-tb-lab">{label}</span>');
  });

  /* §4 — the bones */
  /* ⚠️ RETIRED → `qcCentre.test.tsx`: the law (the loading branch answers before ANY empty branch can,
     and there is no spinner) is restated against the v11 page's body. */

  /* ⚠️ RETIRED (v11) with `QueryGridSkeleton`. The v11 placeholders borrow the REAL components' classes (`qcv-row`,
     `qcv-tile`, `qcv-cal-lane`) — `centre/qcList.test.tsx` — and the held-versus-loaded frames are measured. */

  /* §5 — one entrance, and it is taken off */
  /* ⚠️ RETIRED: the old entrance (`qc-wpg--enter`, tiles stepped 40ms) is off with the tiles it moved. The
     v11 entrance and its removal-by-timer are locked where they are built. */
});
