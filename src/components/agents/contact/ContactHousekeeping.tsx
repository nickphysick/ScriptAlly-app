/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Housekeeping v2 in a floating tab and a half-screen drawer (Contact list v13 §6; HK v2 §3–§8; refs
 * design-refs/contact-list-v13.html for the tab and drawer, design-refs/agent-card-housekeeping-v7.html
 * for the fixes, the session and the check-in). Every item says three things in plain words — what to
 * add, why it helps, where to find it — and most gaps can be filled without leaving the drawer.
 *
 * ⚠️ NOTHING HERE WRITES. Every fix goes through the page's handlers, which go through the card's own
 * save path (`lib/agentCardSave`) — so a reply time's deadline fan-out, the data-quality flag and the
 * snapshot Undo are the card's, not a second copy.
 *
 * ⚠️ AN OPEN ROW LAYS OUT IN TWO COLUMNS (§6): the why and "Where to find it" on the left, the fix and
 * its actions on the right. The drawer is wide enough for both; the session's card is one column.
 *
 * ⚠️ SAVE COLLAPSES THE ROW FIRST (320ms, "Done ✓"), THEN WRITES. The write is optimistic, so writing
 * first would remove the row before it could say it was done; a refused save brings it back and the
 * foot says why.
 */
import { bookGenreHit } from "../../../lib/genreMatch";
import { AgentDisc } from "../../shared/AgentDisc";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { dayMonth } from "../../../lib/dates";
import type { Agent } from "../../../types";
import { agentInitials } from "../../../lib/agentDisplay";
import {
  GAP_LABEL, GAP_TARGET, GROUP_COPY, GROUP_ORDER, HK_EMPTY, HK_FOOT, bestPlaceToStart, firstNameOf, gapCopy, genreChips,
  lastCheckedLine, longDayLabel, reopenChips, sessionLine, tabCounts,
  type Checkin, type GapKey, type GroupKey, type HkBook, type HkItem, type HkModel, type Run,
} from "../../../lib/contactHousekeeping";
import type { HkView, WishlistEvery } from "../../../lib/contactPrefs";
import { matsOf, type CardMats } from "../../../lib/cardDraft";
import type { AgentCardTab } from "../../../lib/agentCardStore";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { MaterialsField, Stepper } from "../card/cardInputs";
import { HalfDrawer } from "../../shell/HalfDrawer";
import { FloatingTab, TabRing } from "../../shell/FloatingTab";
import { useWindowCorner } from "../../shell/useWindowCorner";
import { floatInset } from "../../shell/inkTokens";
import { createPortal } from "react-dom";
import "./housekeeping.css";

/** the head's art — the Birds-eye hawk, as the tab and the drawer share it (Contact list v13 §0) */
export const HK_HAWK = { src: "/images/qc/be-hawk-head.png", version: "0da09ac0" } as const;

/** A fix, as the drawer hands it to the page. */
export type HkFix =
  | { kind: "weeks"; weeks: number }
  | { kind: "settled" }
  | { kind: "mats"; mats: CardMats }
  | { kind: "genres"; genres: string[] }
  | { kind: "wishlist"; text: string }
  | { kind: "remind"; on: string };

export type FixResult = { ok: true; line: string; undo?: () => Promise<boolean> } | { ok: false; error: string };

export interface HkHandlers {
  onFix: (item: HkItem, fix: HkFix) => Promise<FixResult>;
  onLater: (item: HkItem) => Promise<void>;
  onShowAll: () => Promise<void>;
  /** a fix's card link — the card at the gap's tab and field, carrying what was picked */
  onCard: (item: HkItem, prefill: { weeks?: number; mats?: CardMats; genres?: string[]; wishlist?: string }) => void;
  /** by agent: the agent's card at the tab of their top gap */
  onAgentCard: (agentId: string, tab: AgentCardTab) => void;
  /** the reply fix's Also-changes lines for a live agent — the card's own dry run */
  alsoFor: (agent: Agent, weeks: number) => string[];
  onCheckinEvery: (every: WishlistEvery) => Promise<void>;
  onCheckinNext: () => Promise<void>;
  onWishlistStill: (agentId: string) => Promise<void>;
  onWishlistChanged: (agentId: string) => void;
}

export interface HousekeepingProps extends HkHandlers {
  model: HkModel;
  checkin: Checkin;
  every: WishlistEvery;
  book: HkBook;
  today: Date;
  /** every agent — for the reply fix's colleagues and the genre chips' pool */
  agents: readonly Agent[];
  open: boolean;
  /** v17.1 — the floating tab shows only with gaps and while no dismissal stands (lib/contactHealth) */
  tabShown: boolean;
  onDismissTab: () => void;
  /** v17.1 — the 6s note left in the tab's place after a dismissal, with Undo; null when not showing */
  tabNote: { onUndo: () => void } | null;
  onOpen: () => void;
  onClose: () => void;
  view: HkView;
  onView: (v: HkView) => void;
  /** is the Contact list the page on screen — the tab is portalled */
  routeActive: boolean;
  /** the H key's hint on the tab (shortcuts land in Phase 7; the tab says so now) */
  keyHint?: string;
}

/* ── small pieces ───────────────────────────────────────────────────────────────────────────── */

const RunsText: React.FC<{ runs: Run[] }> = ({ runs }) => (
  <>{runs.map((r, i) => (typeof r === "string" ? <React.Fragment key={i}>{r}</React.Fragment>
    : "em" in r ? <em key={i}>{r.em}</em> : <b key={i}>{r.b}</b>))}</>
);

const PENCIL = (
  <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M9.5 2l2.5 2.5L5 11.5 2 12l.5-3z" /></svg>
);

const colleagueAvg = (a: Agent, agents: readonly Agent[]): number | null => {
  const k = (a.agency ?? "").trim().toLowerCase();
  if (!k) return null;
  const ws = agents.filter((x) => x.id !== a.id && (x.agency ?? "").trim().toLowerCase() === k)
    .map((x) => x.responseTimeWeeks).filter((w): w is number => typeof w === "number" && w > 0);
  return ws.length ? Math.round(ws.reduce((s, w) => s + w, 0) / ws.length) : null;
};

const matsOk = (m: CardMats) => (m.ql || m.syn.on || m.smp.on || m.oth.on) && !(m.oth.on && !m.oth.text.trim());

/* ── one item's fix, with its own draft ─────────────────────────────────────────────────────── */

interface FixProps {
  item: HkItem;
  book: HkBook;
  today: Date;
  agents: readonly Agent[];
  h: HkHandlers;
  /** "row" in the drawer, "ses" in the one-at-a-time session (Save & next / Skip) */
  where: "row" | "ses";
  onSave: (fix: HkFix) => void;
  onLater: () => void;
  busy: boolean;
}

const Fix: React.FC<FixProps> = ({ item, book, today, agents, h, where, onSave, onLater, busy }) => {
  const a = item.agent;
  const f = firstNameOf(a);
  const peer = useMemo(() => colleagueAvg(a, agents), [a, agents]);
  const [weeks, setWeeks] = useState<number>(peer ?? 6);
  const [mats, setMats] = useState<CardMats>(() => matsOf([]));
  const [picked, setPicked] = useState<string[]>([]);
  const [wish, setWish] = useState("");
  const chips = useMemo(() => genreChips(book.genre, agents.flatMap((x) => x.genres ?? [])), [book.genre, agents]);
  const saveLabel = where === "ses" ? "Save & next" : "Save";

  const prefill = () => (item.gap === "reply" ? { weeks } : item.gap === "materials" ? (matsOk(mats) ? { mats } : {})
    : item.gap === "genres" ? (picked.length ? { genres: picked } : {}) : item.gap === "wishlist" ? (wish.trim() ? { wishlist: wish.trim() } : {}) : {});

  const acts = (save: React.ReactNode) => (
    <div className="hkv-acts" data-hkv="acts">
      <button type="button" className="hkv-card" data-hkv="card-link" onClick={() => h.onCard(item, prefill())}>{PENCIL}Edit on {f}’s card</button>
      <span className="hkv-sp" />
      <button type="button" className="hkv-ln" data-hkv="later" title="Hide this for 30 days" onClick={onLater} disabled={busy}>{where === "ses" ? "Skip" : "Later"}</button>
      {save}
    </div>
  );
  const save = (fix: HkFix, ok: boolean) => (
    <button type="button" className="hkv-sv" data-hkv="save" disabled={!ok || busy} onClick={() => onSave(fix)}>{saveLabel}</button>
  );

  switch (item.gap) {
    case "reply": {
      const also = item.live ? h.alsoFor(a, weeks) : [];
      return (
        <div className="hkv-fx" data-hkv="fix" data-gap="reply">
          <Stepper ae="hk-weeks" text={`${weeks} week${weeks === 1 ? "" : "s"}`} dec={weeks > 1} inc={weeks < 26}
            onStep={(d) => setWeeks((w) => Math.max(1, Math.min(26, w + d)))} />
          {also.length > 0 && (
            <ul className="hkv-also" data-hkv="also">{also.map((l, i) => <li key={i}>{l}</li>)}</ul>
          )}
          <p className="hkv-hint">
            {peer ? `Other agents at ${(a.agency ?? "").trim()} reply in about ${peer} weeks, so we’ve started there. ` : ""}
            Can’t find it anywhere? <button type="button" data-hkv="not-stated" disabled={busy} onClick={() => onSave({ kind: "settled" })}>Say it’s not stated</button> and this will stop asking.
          </p>
          {acts(save({ kind: "weeks", weeks }, true))}
        </div>
      );
    }
    case "materials":
      return (
        <div className="hkv-fx" data-hkv="fix" data-gap="materials">
          <MaterialsField mats={mats} onMats={setMats} />
          {acts(save({ kind: "mats", mats }, matsOk(mats)))}
        </div>
      );
    case "genres":
      return (
        <div className="hkv-fx" data-hkv="fix" data-gap="genres">
          <div className="hkv-chips">
            {chips.map((g) => {
              const on = picked.includes(g);
              /* v14 (Q5): a chip is the book's when it matches the main genre or any subGenre */
              const hit = bookGenreHit(book.genres.length ? book.genres : book.genre ? [book.genre] : [])(g);
              return (
                <button key={g} type="button" className={`hkv-ch${on ? " on" : ""}${hit ? " hit" : ""}`} aria-pressed={on} data-hkv="genre-chip"
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== g) : [...p, g]))}>
                  {g}{hit ? " · your book" : ""}
                </button>
              );
            })}
          </div>
          <p className="hkv-hint">Not listed here? Edit on {f}’s card to search every genre.</p>
          {acts(save({ kind: "genres", genres: picked }, picked.length > 0))}
        </div>
      );
    case "wishlist":
      return (
        <div className="hkv-fx" data-hkv="fix" data-gap="wishlist">
          <textarea className="hkv-ta" data-hkv="wish" maxLength={400} value={wish}
            placeholder="e.g. Twisty thrillers set outside London; strong women at the centre."
            onChange={(e) => setWish(e.target.value)} aria-label={`What ${f} is hoping to find`} />
          {acts(save({ kind: "wishlist", text: wish.trim() }, wish.trim().length > 0))}
        </div>
      );
    case "reopen":
      return (
        <div className="hkv-fx" data-hkv="fix" data-gap="reopen">
          <div className="hkv-chips">
            {reopenChips(today).map((c) => (
              <button key={c.label} type="button" className="hkv-ch" data-hkv="remind-chip" data-on={c.value} disabled={busy}
                onClick={() => onSave({ kind: "remind", on: c.value })}>{c.label}</button>
            ))}
          </div>
          <p className="hkv-hint">Got an exact date? Set it on their card.</p>
          {acts(null)}
        </div>
      );
    default: {
      const unhandled: never = item.gap;
      return unhandled;
    }
  }
};

/* ── a row ──────────────────────────────────────────────────────────────────────────────────── */

interface RowProps {
  item: HkItem;
  feat?: boolean;
  open: boolean;
  leaving: boolean;
  onToggle: () => void;
  book: HkBook;
  today: Date;
  agents: readonly Agent[];
  h: HkHandlers;
  onSave: (item: HkItem, fix: HkFix) => void;
  onLater: (item: HkItem) => void;
  busy: boolean;
}

const Row: React.FC<RowProps> = ({ item, feat, open, leaving, onToggle, book, today, agents, h, onSave, onLater, busy }) => {
  const cp = gapCopy(item, book);
  const rowRef = useRef<HTMLDivElement>(null);
  /* the collapse runs from the row's own height, so it is the row that closes rather than a jump */
  useEffect(() => {
    const el = rowRef.current;
    if (!leaving || !el) return;
    el.style.height = `${el.offsetHeight}px`;
    void el.offsetHeight;
    el.style.height = "0px";
  }, [leaving]);
  return (
    <div ref={rowRef} className={`hkv-row${feat ? " feat" : ""}${open ? " open" : ""}${leaving ? " out" : ""}`}
      data-hkv="row" data-key={item.key} data-gap={item.gap}>
      <div className="hkv-rh" data-hkv="rh" role="button" tabIndex={0} aria-expanded={open}
        onClick={onToggle} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onToggle(); } }}>
        <AgentDisc initials={agentInitials(item.agent)} standing="none" className="hkv-av" />
        <span className="hkv-nm">
          <b data-hkv="title">{leaving ? "Done ✓" : cp.title}</b>
          <small>{(item.agent.agency ?? "").trim() || (item.agent.name ?? "").trim()}</small>
          {item.live && <span className="hkv-tag" data-hkv="queried">You’ve queried them</span>}
        </span>
        <span className="hkv-add" data-hkv="add">{item.gap === "reopen" ? "Remind me" : "Add"}</span>
      </div>
      {open && !leaving && (
        <div className="hkv-hb" data-hkv="body">
          <div className="hkv-hbl" data-hkv="why-col">
            <p className="hkv-why" data-hkv="why"><RunsText runs={cp.why} /></p>
            <p className="hkv-find" data-hkv="where"><em>Where to find it</em>{cp.where}</p>
          </div>
          <Fix item={item} book={book} today={today} agents={agents} h={h} where="row" busy={busy}
            onSave={(fix) => onSave(item, fix)} onLater={() => onLater(item)} />
        </div>
      )}
    </div>
  );
};

/* ── the one-at-a-time session, and the wishlist check-in (§6, §7) ───────────────────────────── */

export type Session =
  | { mode: "gaps"; list: HkItem[]; i: number; done: number }
  | { mode: "wl"; list: Agent[]; i: number; done: number };

export const SessionModal: React.FC<{
  ses: Session;
  onClose: () => void;
  onNext: (filled: boolean) => void;
  model: HkModel;
  book: HkBook;
  today: Date;
  agents: readonly Agent[];
  h: HkHandlers;
  saveFix: (item: HkItem, fix: HkFix) => Promise<boolean>;
  later: (item: HkItem) => Promise<void>;
  nextOn: string | null;
}> = ({ ses, onClose, onNext, model, book, today, agents, h, saveFix, later, nextOn }) => {
  useEscapeLayer(true, onClose, ESC_LEVEL.pageModal);
  const [busy, setBusy] = useState(false);
  const atEnd = ses.i >= ses.list.length;
  const ticks = (
    <div className="hkv-prog" data-hkv="prog">
      {ses.list.map((_, i) => <i key={i} className={i < ses.i ? "d" : undefined} />)}
    </div>
  );
  let title = ses.mode === "wl" ? "Wishlist check-in" : "Fill in the gaps";
  let count = atEnd ? "" : ses.mode === "wl" ? `${ses.i + 1} of ${ses.list.length}` : `${ses.i + 1} of ${ses.list.length} · ${ses.done} done`;
  let body: React.ReactNode;
  if (atEnd) {
    const left = model.items.length;
    body = (
      <div className="hkv-done" data-hkv="ses-end">
        {ses.mode === "wl" ? (
          <>
            <b>{ses.done} wishlist{ses.done === 1 ? "" : "s"} checked.</b>
            <p>{nextOn ? `We’ll remind you again on ${longDayLabel(nextOn)}.` : "We’ll remind you again next time."}</p>
          </>
        ) : (
          <>
            <b>{ses.done ? `Done: ${ses.done} filled in.` : "All caught up."}</b>
            <p>{model.complete} of {model.total} agents complete. {left ? `${left} left for another time.` : "Every agent is complete."}</p>
          </>
        )}
        <div className="hkv-acts hkv-center"><button type="button" className="hkv-sv" data-hkv="ses-back" onClick={onClose}>Back to your list</button></div>
      </div>
    );
  } else if (ses.mode === "wl") {
    const a = ses.list[ses.i];
    title = "Wishlist check-in";
    body = (
      <>{ticks}
        <div className="hkv-scard" data-hkv="ses-card">
          <div className="hkv-k">{lastCheckedLine(a.mswlCheckedAt)}</div>
          <h4>{(a.name ?? "").trim() || (a.agency ?? "").trim()}</h4>
          <div className="hkv-sag">{(a.agency ?? "").trim()}</div>
          <p className="hkv-why hkv-quote">“{(a.mswlNotes ?? "").trim()}”</p>
          <p className="hkv-find"><em>Where to look</em>Their agency profile or MSWL page. Does it still say this?</p>
          <div className="hkv-acts">
            <button type="button" className="hkv-ln" data-hkv="wl-skip" onClick={() => onNext(false)}>Skip</button>
            <span className="hkv-sp" />
            <button type="button" className="hkv-ghost" data-hkv="wl-changed" onClick={() => { onClose(); h.onWishlistChanged(a.id); }}>It’s changed</button>
            <button type="button" className="hkv-sv" data-hkv="wl-still" disabled={busy}
              onClick={async () => { setBusy(true); try { await h.onWishlistStill(a.id); onNext(true); } finally { setBusy(false); } }}>Still the same</button>
          </div>
        </div>
      </>
    );
  } else {
    const it = ses.list[ses.i];
    const cp = gapCopy(it, book);
    body = (
      <>{ticks}
        <div className="hkv-scard" data-hkv="ses-card" data-key={it.key}>
          <div className="hkv-k">{GROUP_COPY[it.group].heading}</div>
          <h4>{cp.title}</h4>
          <div className="hkv-sag">{(it.agent.name ?? "").trim() || (it.agent.agency ?? "").trim()}{it.agent.agency && it.agent.name ? ` · ${it.agent.agency.trim()}` : ""}{it.live ? " · you’ve queried them" : ""}</div>
          <p className="hkv-why"><RunsText runs={cp.why} /></p>
          <p className="hkv-find"><em>Where to find it</em>{cp.where}</p>
          <Fix key={it.key} item={it} book={book} today={today} agents={agents} where="ses" busy={busy}
            h={{ ...h, onCard: (item, pre) => { onClose(); h.onCard(item, pre); } }}
            onSave={async (fix) => { setBusy(true); try { if (await saveFix(it, fix)) onNext(true); } finally { setBusy(false); } }}
            onLater={() => onNext(false)} />
        </div>
      </>
    );
    count = `${ses.i + 1} of ${ses.list.length} · ${ses.done} done`;
  }
  return (
    <div className="hkv-ses" data-hkv="session" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hkv-box">
        <div className="hkv-fr">
          <div className="hkv-bh"><b>{title}</b><span data-hkv="ses-count">{count}</span>
            <button type="button" className="hkv-x" data-hkv="ses-close" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="hkv-bb">{body}</div>
        </div>
      </div>
    </div>
  );
};

/* ── the whole ──────────────────────────────────────────────────────────────────────────────── */

/** v17.1 — the note left in the tab's place for 6s after it is hidden. */
export const TabNote: React.FC<{ onUndo: () => void }> = ({ onUndo }) => {
  const place = useWindowCorner(floatInset());
  if (typeof document === "undefined" || !place) return null;
  return createPortal(
    <div className="hkv-tnote" data-hkv="tab-note" role="status" style={{ right: place.right, bottom: place.bottom }}>
      Hidden. <b>List health</b> at the top of the page opens Housekeeping, and the tab comes back when something new
      is missing.{" "}
      <button type="button" className="hkv-tnote-u" data-hkv="tab-undo" onClick={onUndo}>Undo</button>
    </div>,
    document.body,
  );
};

/* ⚠️ RETIRED (Contact list v18 §F): the old drawer — its list views, "Start here" and the segmented toggle. The drawer
   is `HousekeepingDrawer`; the fix controls, the session (the wishlist check-in) and the tab note stay here. */

/** The drawer's body alone, for the empty state's exhibit (a picture of the list, never live). */
export const HousekeepingPreview: React.FC<{ model: HkModel; book: HkBook }> = ({ model, book }) => {
  const first = model.items[0];
  const noop = async () => {};
  const h: HkHandlers = {
    onFix: async () => ({ ok: false, error: "preview" }), onLater: noop, onShowAll: noop, onCard: () => {}, onAgentCard: () => {},
    alsoFor: () => [], onCheckinEvery: noop, onCheckinNext: noop, onWishlistStill: noop, onWishlistChanged: () => {},
  };
  const today = new Date();
  const start = bestPlaceToStart(model.items, book);
  return (
    <div className="hkv-db hkv-preview" aria-hidden="true">
      {start && (
        <div className="hkv-start"><span className="hkv-star">★</span><div><em>Best place to start</em><p><RunsText runs={start} /></p></div></div>
      )}
      {first && (
        <>
          <div className="hkv-lab">Start here</div>
          {model.items.slice(0, 4).map((it, i) => (
            <Row key={it.key} item={it} feat={i === 0} open={false} leaving={false} onToggle={() => {}} book={book} today={today}
              agents={[]} h={h} onSave={() => {}} onLater={() => {}} busy={false} />
          ))}
        </>
      )}
    </div>
  );
};
