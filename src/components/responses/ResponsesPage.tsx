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
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { buildQcRows } from "../../lib/qcSummary";
import { carouselOrder, respCounts, respItems, stillOut, type NoKind, type RespItem } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { openQueryDrawer } from "../../lib/queryActions/drawerStore";
import { openResponsePicker, responsePickerHosted } from "../../lib/queryPanelStore";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { RspHeader, RspSummaryCard } from "./RspHeader";
import { RspCarousel, cardAct } from "./RspCarousel";
import "./responses.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Query panel v2's "Record a response" door: the panel, in its acting look, at the "Who replied?" picker */
export function openRecordPicker(): void {
  if (responsePickerHosted()) openResponsePicker(); else openQueryDrawer({ mode: "resp" });
}

export const ResponsesPage: React.FC<{ onNavigate?: (tab: string, sub?: string) => void; routeActive?: boolean }> = () => {
  const { queries, activities, agents, manuscripts, collectionsReady, activitiesReady } = useScriptAllyDb();
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

  /* the answer open in the side panel (Part D) */
  const [openId, setOpenId] = useState<string | null>(null);
  const openAnswer = useCallback((i: RespItem<QcRow>) => setOpenId(i.id), []);
  /* a card's own button runs its journey (Part D runs it in the panel) */
  const act = useCallback((i: RespItem<QcRow>) => { openQueryDrawer({ mode: cardAct(i).mode, queryId: i.id }); }, []);

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
      </div>
      </div>
    </WorkspacePageGrid>
  );
};

export default ResponsesPage;
