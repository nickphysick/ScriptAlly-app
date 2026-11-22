/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ Responses v15 (route /queries/responses; 17 Nov) ═════════════════════════════════════════════════════════════
 * Ref: design-refs/responses-v15/responses-v15.html. The answers page, rebuilt around what agents said. One scroll, top
 * to bottom, with no filter panel, no toolbar and no grid of cards:
 *
 *   1 · the navy header (Workspace headers v1), its right-hand slot the reply count, the rate line and the tally
 *   2 · A word on rejections (the grey band; only when the Rejection collection has an entry)
 *   3 · the line of facts (early days: the white note in its place)
 *   4 · Agents who want to read on (the Query Centre's own grid card, in a row carousel)
 *   5 · In their words (one note at a time; no notes → no section)
 *   6 · the Rejection collection (one sortable list; Share your story opens the existing share builder under it)
 *   Nothing back yet: the header, then While you wait and the three features.
 *
 * ⚠️ EVERY FIGURE COMES FROM `lib/responses`, over the Query Centre's own rows (`buildQcRows`), so this page and the
 *    Query Centre cannot disagree about a status, a date or how far a query got (decision 7).
 * ⚠️ OPENING AN ANSWER is the existing panel (`RspPanel`) and the dimmed desk, by `?answer={id}` so Back works; a
 *    request card's own action runs its journey as today (decision 5).
 * ⚠️ `offWallIds`: a pass kept off is counted in the header and the facts and left out of the collection (decision 2).
 * ⚠️ THE BOOK IN SCOPE is the shell's (`scriptally_active_manuscript_id`, through `resolveScopedManuscript`), read on
 *    every render; a switch re-opens the route, so the memo keys on `location.key`.
 * ⚠️ ONE EVEN GAP (72px) BETWEEN SECTIONS, 30px from the header to the band (responses15.css, `--r15-sg`). Nothing
 *    inside a section moves.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { buildQcRows } from "../../lib/qcSummary";
import type { QcRow } from "../../lib/qcSummary";
import { pkgKeyOf } from "../../lib/qc138";
import {
  carouselOrder, collectionOf, firstNameOf, hasNote, headerTally, isEarlyDays, nextExpected, offWallIds, pageCounts, respCounts,
  respItems, type RespItem,
} from "../../lib/responses";
import { responsesPrefsOf, wordFoldWrite } from "../../lib/responsesPrefs";
import { openQueryDrawer, type DrawerMode } from "../../lib/queryActions/drawerStore";
import { openResponse, responseHosted } from "../../lib/queryPanelStore";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { AppFooter } from "../shell/AppFooter";
import { useOptionalToast } from "../toast/ToastProvider";
import { RspHeader, type TallyKey } from "./Rsp5Head";
import { RspWord, type WordStep } from "./RspWord";
import { RspFacts, RspReadOn } from "./RspReadOn";
import { RspWords } from "./RspWords";
import { RspCollection } from "./RspCollection";
import { RspPanel } from "./RspPanel";
import { RspEmpty } from "./RspEmpty";
import "./responses.css";
import "./responses5.css";
import "./responses15.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** "Record a response": Record a response v1's one door — the card frame at "Who replied?" */
export function openRecordPicker(): void {
  openResponse();
}

/** the page's sections, by `data-rsp5-sec` inside this page (every page stays mounted) */
export type RspSection = "more" | "words" | "wall" | "share";

export const ResponsesPage: React.FC<{ onNavigate?: (tab: string, sub?: string) => void; routeActive?: boolean }> = ({ routeActive, onNavigate }) => {
  const { queries, activities, agents, manuscripts, packages, collectionsReady, activitiesReady, readQueryActivity, currentUser, updateUserPaths } = useScriptAllyDb();
  const toast = useOptionalToast();
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
    /* v152.2 §5 — a pass whose "Add to my Rejection collection" was unticked is counted, and kept out of the collection */
    const coll = collectionOf(items, offWallIds(activities as never));
    return {
      nowMs, rows, items, counts, page, coll, tally: headerTally(page), more: carouselOrder(items),
      yourMove: items.filter((i) => i.yourMove).length, nextDueMs: nextExpected(rows, nowMs)?.expectedMs ?? null,
    };
    /* location.key: a switch of book re-opens the route, and the book is read from storage */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries, activities, agents, ms?.id, location.key]);
  const { counts, nowMs } = model;
  const msTitle = ms?.title?.trim() || null;
  const early = isEarlyDays(counts.answered);

  /* ── the answer open in the side panel: `?answer={queryId}`, so browser Back works ── */
  const answerParam = new URLSearchParams(location.search).get("answer");
  const openItem = ready && answerParam ? model.items.find((i) => i.id === answerParam) ?? null : null;
  const openId = openItem?.id ?? null;
  const go = useCallback((id: string | null, replace = false) => {
    navigate({ pathname: "/queries/responses", search: id ? `?answer=${encodeURIComponent(id)}` : "" }, { replace });
  }, [navigate]);
  /* the page's root, and the control an answer was opened from, for focus on close (P1) */
  const pageRef = useRef<HTMLDivElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openAnswer = useCallback((i: RespItem<QcRow>) => {
    const a = document.activeElement as HTMLElement | null;
    if (a && pageRef.current?.contains(a)) opener.current = a;
    go(i.id, !!answerParam);
  }, [go, answerParam]);
  const closeAnswer = useCallback(() => go(null), [go]);
  /* the collection's rows as shown (↑ ↓ walk them); a card or a note has no neighbours */
  const [visible, setVisible] = useState<string[]>([]);
  const at = openId ? visible.indexOf(openId) : -1;
  const walk = {
    prev: at > 0 ? () => go(visible[at - 1], true) : null,
    next: at >= 0 && at < visible.length - 1 ? () => go(visible[at + 1], true) : null,
  };
  /* ⚠️ FOCUS COMES BACK ONCE THE PAGE IS LIVE AGAIN. The panel's leaving ghost keeps `#root` inert for a few frames
     after it closes, and a focus() into an inert page does nothing: the panel's own restore and the shared hook's both
     ran inside that window and focus fell to <body> (P1's trace). So the page waits for the seal to lift, then gives
     focus back to the control the answer came from, unless something else has taken it. */
  const wasOpen = useRef<string | null>(null);
  useEffect(() => {
    const was = wasOpen.current;
    wasOpen.current = openId;
    if (!was || openId) return undefined;
    let raf = 0, n = 0;
    const tick = () => {
      const root = document.getElementById("root");
      /* this page's panel only (`.rsp5-layer`): another page's closed panel can stay in the DOM */
      if ((root?.inert || document.querySelector(".spanel.rsp5-layer")) && n++ < 90) { raf = requestAnimationFrame(tick); return; }
      const a = document.activeElement;
      if (a && a !== document.body) return;
      const back = opener.current?.isConnected ? opener.current : pageRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(was)}"]`) ?? null;
      back?.focus({ preventScroll: true });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [openId]);

  /* a card's own action runs its journey IN the panel: the panel opens on that answer first, then the journey steps in */
  const [pending, setPending] = useState<{ id: string; mode: DrawerMode } | null>(null);
  const act = useCallback((i: RespItem<QcRow>, mode: DrawerMode) => {
    /* Record a response v1 — a response is that query's card and its composer (the card takes the answer panel's place) */
    if (mode === "resp" && responseHosted()) { openResponse({ queryId: i.id, from: "other" }); return; }
    setPending({ id: i.id, mode }); openAnswer(i);
  }, [openAnswer]);
  useEffect(() => {
    if (!pending || openId !== pending.id || !openItem) return;
    setPending(null);
    const r = openItem.row, first = firstNameOf(r.agentName);
    openQueryDrawer({ mode: pending.mode, queryId: openItem.id, panel: { name: r.agentName, agency: r.agency, first, backLabel: `Back to ${first}` } });
  }, [pending, openId, openItem]);

  /* the package a card names (the Query Centre's own lookup: `pkgKeyOf`, then the stored package's name) */
  const packageNameOf = useCallback((r: QcRow) => { const k = pkgKeyOf(r as never); return k ? packages.find((p) => p.id === k)?.packageName ?? null : null; }, [packages]);

  /* ── the sections a label, a step or a button goes to (pageRef is declared above, with the opener) ── */
  const goSection = useCallback((id: RspSection) => {
    /* ⚠️ COMPUTED, NOT scrollIntoView: clear of the collapsed bar (Workspace headers v1), which is shown wherever a section
       lands (its sticky top + its height, read off the bar itself), then 20 */
    const el = pageRef.current?.querySelector<HTMLElement>(`[data-rsp5-sec="${id}"]`);
    const sc = el?.closest<HTMLElement>(".wpg-scroll");
    if (!el || !sc) return;
    const bar = pageRef.current?.querySelector<HTMLElement>("[data-wsnh='slim']");
    const cover = bar ? (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight : 0;
    sc.scrollTo({ top: sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - cover - 20, behavior: reduced() ? "auto" : "smooth" });
  }, []);
  /* the tally's labels: asked for more → the carousel, passed → the collection, no answer yet → the Query Centre */
  const pressKey = useCallback((k: TallyKey) => {
    if (k === "w") navigate("/queries"); else goSection(k === "a" ? "more" : "wall");
  }, [goSection, navigate]);
  /* the grey band's three steps: the collection, In their words (when there is a note), Analytics */
  const hasNotes = model.items.some(hasNote);
  const pressStep = useCallback((k: WordStep) => {
    if (k === "shape") navigate("/queries/analytics");
    else if (k === "keep") goSection("wall");
    else if (hasNotes) goSection("words");
    else toast?.showToast({ message: "No notes recorded yet" });
  }, [goSection, navigate, hasNotes, toast]);
  /* Share your story (both buttons): the existing share builder, opened under the collection (decision 3) */
  const [sharing, setSharing] = useState(false);
  const share = useCallback(() => { setSharing(true); requestAnimationFrame(() => goSection("share")); }, [goSection]);
  const toggleShare = useCallback(() => setSharing((x) => !x), []);

  const empty = ready && counts.answered === 0;
  return (
    <WorkspacePageGrid scrollLabel="Responses" masthead={null} className="rsp5-wpg">
      {/* the outer element takes the grid's gutter (`.wpg-scroll > *`); the column inside breaks out of it to the
          list width, as packages v4's `.ppv-page > .pk4-col` does */}
      <div className="rsp-page">
      <div className="rsp rsp5 rsp15" data-rsp="page" data-rsp15-state={!ready ? "loading" : empty ? "none" : early ? "early" : "full"} ref={pageRef}>
        <RspHeader msTitle={msTitle} loading={!ready} noReplies={model.tally.replies === 0} tally={model.tally}
          early={early} nextDueMs={model.nextDueMs} nowMs={nowMs} canShare={ready && model.coll.length > 0}
          more={model.page.more} yourMove={model.yourMove}
          onRecord={openRecordPicker} onShare={share} onKey={pressKey} />
        {/* Nothing back yet: the empty page, and none of the populated page's parts. It switches to the populated page
            the moment the first answer is recorded, with no reload. */}
        {!ready ? null : empty ? (
          <RspEmpty rows={model.rows} nowMs={nowMs}
            weeksOf={(r) => { const a = agents.find((x) => x.id === r.query.agentId); return a?.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null; }} />
        ) : (
          <div className="rsp15-body" data-rsp15="body">
            {model.coll.length ? (
              <RspWord n={model.coll.length} folded={responsesPrefsOf(currentUser).wordFolded}
                onFold={currentUser ? (f) => updateUserPaths(wordFoldWrite(f)) : undefined} onStep={pressStep} />
            ) : null}
            <RspFacts items={model.items} early={early ? { out: model.page.waiting, queried: model.tally.queried, replies: model.tally.replies } : null}
              onAnalytics={() => navigate("/queries/analytics")} />
            <RspReadOn items={model.more} nowMs={nowMs} selectedId={openId} packageNameOf={packageNameOf} onOpen={openAnswer} onAct={act} />
            <RspWords items={model.items} nowMs={nowMs} msTitle={msTitle} selectedId={openId} panelOpen={!!openItem} onOpen={openAnswer} />
            <RspCollection coll={model.coll} nowMs={nowMs} msTitle={msTitle} selectedId={openId} sharing={sharing}
              onShare={toggleShare} onOpen={openAnswer} onVisible={setVisible} active={!!routeActive} />
          </div>
        )}
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
