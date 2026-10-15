/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
import { answerFoot, carouselOrder, firstNameOf, respCounts, respItems, stillOut, type NoKind, type RespItem } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { openQueryDrawer } from "../../lib/queryActions/drawerStore";
import { openResponsePicker, responsePickerHosted } from "../../lib/queryPanelStore";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { RspHeader, RspSummaryCard } from "./RspHeader";
import { RspCarousel } from "./RspCarousel";
import { RspPanel, type AnswerTab } from "./RspPanel";
import { RspBanner, RspList, RspTally } from "./RspNos";
import { RspShare } from "./RspShare";
import "./responses.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Query panel v2's "Record a response" door: the panel, in its acting look, at the "Who replied?" picker */
export function openRecordPicker(): void {
  if (responsePickerHosted()) openResponsePicker(); else openQueryDrawer({ mode: "resp" });
}

export const ResponsesPage: React.FC<{ onNavigate?: (tab: string, sub?: string) => void; routeActive?: boolean }> = ({ routeActive }) => {
  const { queries, activities, agents, manuscripts, collectionsReady, activitiesReady, readQueryActivity } = useScriptAllyDb();
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
    return { nowMs, rows, items, counts: respCounts(items), more: carouselOrder(items), out: stillOut(rows) };
    /* location.key: a switch of book re-opens the route, and the book is read from storage */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries, activities, agents, ms?.id, location.key]);
  const { counts, nowMs } = model;
  const msTitle = ms?.title?.trim() || null;

  /* ── Part D · the answer open in the side panel: `?answer={queryId}`, so browser Back works ── */
  const answerParam = new URLSearchParams(location.search).get("answer");
  const openItem = ready && answerParam ? model.items.find((i) => i.id === answerParam) ?? null : null;
  const openId = openItem?.id ?? null;
  const [tab, setTab] = useState<AnswerTab>("answer");
  const go = useCallback((id: string | null, replace = false) => {
    navigate({ pathname: "/queries/responses", search: id ? `?answer=${encodeURIComponent(id)}` : "" }, { replace });
  }, [navigate]);
  const openAnswer = useCallback((i: RespItem<QcRow>) => { setTab("answer"); go(i.id, !!answerParam); }, [go, answerParam]);
  const closeAnswer = useCallback(() => go(null), [go]);
  /* the list's rows as shown (↑ ↓ walk them); a carousel card has no neighbours */
  const [visible, setVisible] = useState<string[]>([]);
  const at = openId ? visible.indexOf(openId) : -1;
  const walk = {
    prev: at > 0 ? () => go(visible[at - 1], true) : null,
    next: at >= 0 && at < visible.length - 1 ? () => go(visible[at + 1], true) : null,
  };
  /* a card's own button runs its journey IN the panel: the panel opens on that answer first, then the journey steps in */
  const [pending, setPending] = useState<string | null>(null);
  const act = useCallback((i: RespItem<QcRow>) => { setPending(i.id); openAnswer(i); }, [openAnswer]);
  useEffect(() => {
    if (!pending || openId !== pending || !openItem) return;
    setPending(null);
    const r = openItem.row, first = firstNameOf(r.agentName);
    const mode = answerFoot(openItem, model.nowMs).act;
    if (mode !== "edit") openQueryDrawer({ mode, queryId: openItem.id, panel: { name: r.agentName, agency: r.agency, first, backLabel: `Back to ${first}` } });
  }, [pending, openId, openItem, model.nowMs]);

  /* Passed / No reply: ONE state with the list's segmented control (Part C). Pressing it again clears it. */
  const [kind, setKind] = useState<NoKind | null>(null);
  const pressKind = useCallback((k: NoKind) => setKind((x) => (x === k ? null : k)), []);

  /* Asked for more scrolls its carousel band into view; "Share your wall of no" the share sheet */
  const moreRef = useRef<HTMLElement | null>(null);
  const shareRef = useRef<HTMLElement | null>(null);
  const scrollTo = (el: HTMLElement | null, block: ScrollLogicalPosition) => el?.scrollIntoView({ block, behavior: reduced() ? "auto" : "smooth" });

  return (
    <WorkspacePageGrid scrollLabel="Responses" masthead={null}>
      {/* the outer element takes the grid's gutter (`.wpg-scroll > *`); the column inside breaks out of it to the
          list width, as packages v4's `.ppv-page > .pk4-col` does */}
      <div className="rsp-page">
      <div className="rsp rsp-col" data-rsp="page">
        <RspHeader loading={!ready} answered={ready ? counts.answered : null} msTitle={msTitle}
          hasNos={ready && counts.passed + counts.noReply > 0}
          onRecord={openRecordPicker} onShare={() => scrollTo(shareRef.current, "center")}
          card={<RspSummaryCard counts={counts} kind={kind} loading={!ready}
            onMore={() => scrollTo(moreRef.current, "start")} onKind={pressKind} />} />
        {ready && counts.answered > 0 ? (
          <RspCarousel ref={moreRef} items={model.more} nowMs={nowMs} msTitle={msTitle} stillOut={model.out}
            selectedId={openId} onOpen={openAnswer} onAct={act} onRecord={openRecordPicker} />
        ) : null}
        {ready && counts.passed + counts.noReply > 0 ? (
          <>
            <RspBanner />
            <RspTally items={model.items} />
            <RspList items={model.items} nowMs={nowMs} kind={kind} onKind={setKind} selectedId={openId} onOpen={openAnswer} active={!!routeActive} onVisible={setVisible} />
            <RspShare ref={shareRef} nos={model.items.filter((i) => i.group !== "more")} title={msTitle} />
          </>
        ) : null}
      </div>
      </div>
      {openItem && routeActive ? (
        <RspPanel item={openItem} agent={agents.find((a) => a.id === openItem.row.query.agentId) ?? null} nowMs={nowMs} msTitle={msTitle}
          tab={tab} onTab={setTab} onClose={closeAnswer} walk={walk} readLog={readQueryActivity}
          onOpenInQc={() => navigate({ pathname: "/queries", search: `?q=${encodeURIComponent(openItem.id)}` })} />
      ) : null}
    </WorkspacePageGrid>
  );
};

export default ResponsesPage;
