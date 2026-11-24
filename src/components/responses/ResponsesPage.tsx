/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ Responses v6 (4 Nov; ref design-refs/responses-v6/responses-v6.html): v5's page in the Query Centre v151.2 /
 *    Contact list v26 / Dashboard v2 dress. Top to bottom: the navy header, two stat cards (replies only), the request
 *    row of standard query cards, the navy insights card, the oat timing card, In their words, the wall (tabs, a
 *    Showing row, a grey-banded sheet per month, the oat end card). Nothing back yet: While you wait and three previews.
 *    v5's derivations, `RspPanel`, `?answer=` and the journeys stand.
 *
 * ══ Responses v2 (route /queries/responses; 15 Oct) ═════════════════════════════════════════════════════════════
 * Ref: design-refs/responses-v4/responses-v4.html. The third Queries tab: every agent answer for the book in scope.
 *
 *   A · the centred light header (no illustration) and its card: the answer counts and the Reply rate ring
 *   B · Asked for more, as a carousel of large request cards on a paper-white band
 *   C · the nos: the blush banner, the hand-drawn tally, and the list sheet
 *   D · the side panel (query panel v2's container): a card or a row opens the answer; acting dims the page
 *   E · the share-image builder
 *   F · the empty page, and the zero-nos sheet
 *
 * ⚠️ EVERY FIGURE COMES FROM `lib/responses`, over the Query Centre's own rows (`buildQcRows`), so this page and the
 *    Query Centre cannot disagree about a status, a date or how far a query got.
 * ⚠️ THE BOOK IN SCOPE is the shell's (`scriptally_active_manuscript_id`, through `resolveScopedManuscript`), read on
 *    every render; a switch re-opens the route, so the memo keys on `location.key`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { buildQcRows } from "../../lib/qcSummary";
import { carouselOrder, firstNameOf, goneQuiet, isEarlyDays, pageCounts, respCounts, respDate, respItems, stillOut, waitingItem, waitingRows, type NoKind, type PanelItem, type RespItem } from "../../lib/responses";
import { bookChips, storySteps } from "../../lib/qcCardStory";
import { sentView } from "../queryActions/SentHow";
import type { StandardCardStep } from "../shared/StandardQueryCard";
import type { QcRow } from "../../lib/qcSummary";
import { openQueryDrawer, type DrawerMode } from "../../lib/queryActions/drawerStore";
import { openResponsePicker, responsePickerHosted } from "../../lib/queryPanelStore";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { Rsp6Header, Rsp6Stats } from "./Rsp6Head";
import { Rsp6Requests } from "./Rsp6Requests";
import { Rsp6Insights, Rsp6Wall } from "./Rsp6Sections";
import { Rsp6Empty } from "./Rsp6Empty";
import { Rsp5Timing } from "./Rsp5Timing";
import { Rsp5Words } from "./Rsp5Words";
import { RspPanel } from "./RspPanel";
import type { AgentFacts } from "./RspNos";
import { STEP_WORD } from "./RspCarousel";
import { AppFooter } from "../shell/AppFooter";
import "./responses.css";
import "./responses5.css";
import "./responses6.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Query panel v2's "Record a response" door: the panel, in its acting look, at the "Who replied?" picker */
export function openRecordPicker(): void {
  if (responsePickerHosted()) openResponsePicker(); else openQueryDrawer({ mode: "resp" });
}

export const ResponsesPage: React.FC<{ onNavigate?: (tab: string, sub?: string) => void; routeActive?: boolean }> = ({ routeActive, onNavigate }) => {
  const { queries, activities, agents, manuscripts, packages, collectionsReady, activitiesReady, readQueryActivity } = useScriptAllyDb();
  const navigate = useNavigate();
  const location = useLocation();
  const storedMs = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const ms = resolveScopedManuscript(manuscripts, storedMs);
  const ready = collectionsReady && activitiesReady;

  /* ⚠️ ONE CLOCK per derivation, so every figure on the page agrees about what today is */
  const model = useMemo(() => {
    const nowMs = Date.now();
    const own = ms ? queries.filter((q) => q.manuscriptId === ms.id) : [];
    const rows = buildQcRows(own, agents, activities, nowMs);
    const items = respItems(rows);
    const counts = respCounts(items), page = pageCounts(items, rows);
    /* the timing line's "gone past the reply time the agent gives": the gone-quiet queries that HAVE a reply date */
    const quietDated = goneQuiet(rows, nowMs).filter((r) => r.expectedMs != null).length;
    return { nowMs, rows, items, counts, page, quietDated, more: carouselOrder(items), out: stillOut(rows) };
    /* location.key: a switch of book re-opens the route, and the book is read from storage */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries, activities, agents, ms?.id, location.key]);
  const { counts, nowMs } = model;
  const msTitle = ms?.title?.trim() || null;

  /* ── Part D · the answer open in the side panel: `?answer={queryId}`, so browser Back works ── */
  const answerParam = new URLSearchParams(location.search).get("answer");
  /* an answer, or (v6) a query still waiting, opened from the empty page's timeline */
  const openItem: PanelItem<QcRow> | null = ready && answerParam
    ? (model.items.find((i) => i.id === answerParam) as PanelItem<QcRow> | undefined)
      ?? (() => { const w = waitingRows(model.rows).find((r) => r.id === answerParam); return w ? waitingItem(w) : null; })()
    : null;
  const openId = openItem?.id ?? null;
  const go = useCallback((id: string | null, replace = false) => {
    navigate({ pathname: "/queries/responses", search: id ? `?answer=${encodeURIComponent(id)}` : "" }, { replace });
  }, [navigate]);
  const openAnswer = useCallback((i: { id: string }) => { go(i.id, !!answerParam); }, [go, answerParam]);
  const closeAnswer = useCallback(() => go(null), [go]);
  /* the list's rows as shown (↑ ↓ walk them); a carousel card has no neighbours */
  const [visible, setVisible] = useState<string[]>([]);
  const at = openId ? visible.indexOf(openId) : -1;
  const walk = {
    prev: at > 0 ? () => go(visible[at - 1], true) : null,
    next: at >= 0 && at < visible.length - 1 ? () => go(visible[at + 1], true) : null,
  };
  /* a card's own button runs its journey IN the panel: the panel opens on that answer first, then the journey steps in */
  const [pending, setPending] = useState<{ id: string; mode: DrawerMode } | null>(null);
  const act = useCallback((i: RespItem<QcRow>, mode: DrawerMode) => { setPending({ id: i.id, mode }); openAnswer(i); }, [openAnswer]);
  useEffect(() => {
    if (!pending || openId !== pending.id || !openItem) return;
    setPending(null);
    const r = openItem.row, first = firstNameOf(r.agentName);
    openQueryDrawer({ mode: pending.mode, queryId: openItem.id, panel: { name: r.agentName, agency: r.agency, first, backLabel: `Back to ${first}` } });
  }, [pending, openId, openItem]);

  /* the agent's own facts the wall reads (the reply time they give; whether no reply means no) */
  const agentFacts = useCallback((i: RespItem<QcRow>): AgentFacts => {
    const a = agents.find((x) => x.id === i.row.query.agentId);
    return { weeks: a?.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null, nrmn: !!a?.noResponseMeansNo };
  }, [agents]);

  /* Passed / No reply: ONE state with the list's segmented control (Part C). Pressing it again clears it. */
  const [kind, setKind] = useState<NoKind | null>(null);

  /* v5 · the sections a glance card or a "→" link goes to, by id inside this page (every page stays mounted) */
  const pageRef = useRef<HTMLDivElement | null>(null);
  const goSection = useCallback((id: "more" | "timing" | "wall" | "words") => {
    /* ⚠️ COMPUTED, NOT scrollIntoView: the wall's pin sets the scroller's scroll-padding for keyboard row-walking, and
       scrollIntoView adds it, so a section landed ~146px down instead of 20 (RS5 A2 found it). */
    const el = pageRef.current?.querySelector<HTMLElement>(`[data-rsp5-sec="${id}"]`);
    const sc = el?.closest<HTMLElement>(".wpg-scroll");
    if (!el || !sc) return;
    sc.scrollTo({ top: sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 20, behavior: reduced() ? "auto" : "smooth" });
  }, []);
  const weeksOf = useCallback((r: QcRow) => { const a = agents.find((x) => x.id === r.query.agentId); return a?.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null; }, [agents]);
  /* the request card's timeline: the Query Centre's own story (`storySteps`) over the row's dated stages */
  const stepsOf = useCallback((i: RespItem<QcRow>): StandardCardStep[] => {
    const q = i.row.query;
    const sent = sentView(q, packages).pieces.map((pc) => (pc.key === "sample" && pc.value ? pc.value.split(" · ")[0].replace(/^./, (c) => c.toUpperCase()) : pc.label));
    const ledger = i.row.history.spans.map((sp, k) => ({ key: `${sp.status}-${k}`, status: sp.status, timeMs: sp.startMs, title: STEP_WORD[sp.status] ?? "" }));
    return storySteps({ rows: ledger, query: q, manuscript: ms ?? null, sentWithQuery: sent }).map((st) => ({
      key: st.key, status: st.status, title: st.title, qualifier: st.qualifier, date: st.ms != null ? respDate(st.ms, nowMs) : null,
      chips: st.chips.map((c) => ({ label: c.label })), note: st.note,
    }));
  }, [packages, ms, nowMs]);
  const chips = useMemo(() => bookChips(ms ?? null), [ms]);
  const empty = ready && counts.answered === 0;

  return (
    <WorkspacePageGrid scrollLabel="Responses" masthead={null} className="rsp5-wpg">
      {/* the outer element takes the grid's gutter (`.wpg-scroll > *`); the column inside breaks out of it to the
          list width, as packages v4's `.ppv-page > .pk4-col` does */}
      <div className="rsp-page">
      <div className="rsp rsp5 rsp6" data-rsp="page" ref={pageRef}>
        <Rsp6Header msTitle={msTitle} counts={ready ? model.page : null} empty={empty} loading={!ready} onRecord={openRecordPicker}
          onSecond={() => (empty ? navigate("/queries") : goSection("wall"))} />
        {/* Nothing back yet: While you wait and the previews, and none of the populated page's parts. It switches to the
            populated page the moment the first answer is recorded, with no reload. */}
        {empty ? (
          <Rsp6Empty rows={model.rows} nowMs={nowMs} weeksOf={weeksOf} onOpen={(r) => openAnswer(r)} onTodo={() => navigate("/todo")} />
        ) : ready ? (
          <>
            <Rsp6Stats items={model.items} counts={model.page} onMore={() => goSection("more")}
              onPassed={() => { setKind("passed"); goSection("wall"); }} onWall={() => goSection("wall")} />
            {model.page.more > 0 ? (
              <Rsp6Requests items={model.more} nowMs={nowMs} msTitle={msTitle} bookChips={chips} stepsOf={stepsOf}
                keysOn={!!routeActive && !openId} onOpen={openAnswer} onAct={act} />
            ) : null}
            <Rsp6Insights counts={model.page} items={model.items} few={isEarlyDays(counts.answered)} nowMs={nowMs} onGo={goSection} />
            <Rsp5Timing items={model.items} waiting={model.page.waiting} quiet={model.quietDated} />
            <Rsp5Words items={model.items} nowMs={nowMs} onOpen={openAnswer} />
            <Rsp6Wall items={model.items} nowMs={nowMs} msTitle={msTitle} kind={kind} onKind={setKind} selectedId={openId}
              onOpen={openAnswer} active={!!routeActive} agentFacts={agentFacts} onVisible={setVisible} />
          </>
        ) : null}
        {ready ? <div className="rsp-foot"><AppFooter onNavigate={(t, sub) => onNavigate?.(t, sub)} /></div> : null}
      </div>
      </div>
      {openItem && routeActive ? (
        <RspPanel item={openItem} agent={agents.find((a) => a.id === openItem.row.query.agentId) ?? null} nowMs={nowMs}
          onClose={closeAnswer} walk={walk} readLog={readQueryActivity}
          onOpenInQc={() => navigate({ pathname: "/queries", search: `?q=${encodeURIComponent(openItem.id)}` })} />
      ) : null}
    </WorkspacePageGrid>
  );
};

export default ResponsesPage;
