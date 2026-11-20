/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2 (design-refs/agent-card-v2/) — THE AGENT CARD, BROUGHT UP TO THE QUERY CARD BY REUSING ITS BUILT PARTS,
 * inside the agent card's own frame (the #a5837b line, the 10px white mat, 580 wide, the −1.2° lean).
 *
 *   height     always the slide-out query card's (`--qc-card-h`, qcv152card.css): the band, head, query box, tabs and footer
 *              hold still, and the body scrolls
 *   band       slate #5e7189 on every agent, in the query card's band layout: Agent fit and its stars at the left; "{i} / {n}",
 *              ‹ ›, the pencil and ✕ as the query card's 26px round buttons at the right
 *   head       the query card's: a 40px disc (its outer ring the live query's stage Edge), the name, the agency in the caps
 *              line, the location, and the status pill (StatusDot and word, the stage's Tint)
 *   query box  the live query for the active manuscript: one button to the query card ("← Back to {first}")
 *   tabs       Profile (QcAgent158's parts) · History (the query card's thread, read-only) · Notes (QcNotes158)
 *   footer     QcFoot1581, from lib/agentCardV2 `acFoot` (the pack's table); while editing, the save bar takes its place
 *
 * ⚠️ THE QUERY CARD'S PARTS DRAW INSIDE A `.qc152` ROOT, so the query card's own stylesheets place them; the agent card's
 *    stylesheet (acv2.css) holds only what is the agent card's. Nothing of the query card's CSS is copied.
 * ⚠️ EDITING IS AS BUILT (Contact list v26.2 C, Card offers v1, Add agent v1): the sections, the pencils, "also changes",
 *    the offers and the discard guard. The face round them is new.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { StatusDot } from "../../StatusDot";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { addedLabel } from "../../../lib/contactList";
import { hrefFor } from "../../../lib/quickAdd";
import { type AgentCard24Props, useCardModel } from "./AgentCard24";
import { acColours, acFoot, acPill, acTone, askList, factBoxes, factBoxesShown, finishItems, finishShare, queryBoxLine, type AcAct } from "../../../lib/agentCardV2";
import { NxBox, NxCopyEmail, NxSite, TICK } from "../../queries/centre/QcAgent158";
import { Foot, ARW } from "../../queries/centre/QcFoot1581";
import { NotesTab158, quotesOf, type NoteIn } from "../../queries/centre/QcNotes158";
import { ThreadRead } from "../../queries/centre/QcThreadRead";
import { bump, reduced } from "../../queries/centre/qcMotion160";
import { useAgentThreads } from "../card/useAgentThreads";
import { useAgentNotes } from "../card/useAgentNotes";
import { useScriptAllyDb } from "../../../lib/db";
import { db as firestoreDb } from "../../../lib/firebase";
import { commitAgentEdits } from "../../../lib/saveAgentEdits";
import { agentBack, openQueryPanelFromAgent } from "../../../lib/queryPanelStore";
import { useToast } from "../../toast/ToastProvider";
import { committedNotes, computeNotePreview, effectiveNotes, emptyNotesDraft, FLAT_NOTE_ID } from "../../../lib/agentNotes";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import { FIT_TIP, FitStars, InfoTip } from "../card/agentPills";
import { CARD_EDITING_EVENT, requestCardClose } from "./AgentCardPanel262";
import { useAgentForm } from "../card/useAgentForm";
import { EditContact, EditGenres, EditHow, EditMaterials, EditWishlist, SaveBar, changeNames, type OfferKit } from "./AgentCard262Edit";
import type { InlineField } from "../card/InlineEdits";
import { toContactDraft, type CardDraft } from "../../../lib/cardDraft";
import { cardOffers, offerPlan, saveExtras, type CardOffers, type CloseChoice, type OfferPlan, type RtChoice } from "../../../lib/cardOffers";

/** changes are counted by the names the writer reads ("how they take queries" is one change, method and words alike) */
const changeCount = (changed: readonly (keyof CardDraft)[]) => changeNames(changed).length;
/** an inline field's ask, as a field the card opens at */
const INLINE_FOCUS: Record<InlineField, AgentCardField> = { wishlist: "wishlist", genres: "genres", replies: "reply", email: "email", website: "website", form: "website", social: "mswl" };
import "./contactV262.css";
import "./contactPrinciples.css";
/* Agent card v2 — the query card's own stylesheets, for the parts it lends (imported, never copied), then the agent card's */
import "../../queries/centre/qcv152card.css";
import "../../queries/centre/qcv1522card.css";
import "../../queries/centre/qcv153thread.css";
import "../../queries/centre/sc1card.css";
import "../../queries/centre/qcv158.css";
import "./acv2.css";

/** the band's slate, for every agent (v26.2 ruling) */
export const CARD262_BAND = "#5e7189";

export type Sec262 = "contact" | "genres" | "wishlist" | "materials" | "how";
/** Add agent v1 — the family a section's edit wears: Contact details in powder, genres and wishlist in blush, materials
 *  and how they work in sand */
export const SEC_FAM: Record<Sec262, "who" | "want" | "query"> = { contact: "who", genres: "want", wishlist: "want", materials: "query", how: "query" };
export const SEC_ORDER: Sec262[] = ["contact", "genres", "wishlist", "materials", "how"];

/**
 * Add agent v1 Phase 5 — WHERE A DOOR'S EDIT OPENS ON THE CARD: a field's own section; "who" with no field (Edit agent,
 * the band's pencil) is every section with Contact details at the top; "want" / "work" the sections of that tab;
 * "notes" the Notes tab.
 */
export function secsFor(tab?: AgentCardTab, focus?: AgentCardField): Sec262[] | "all" | "notes" {
  switch (focus) {
    case "genres": return ["genres"];
    case "wishlist": return ["wishlist"];
    case "materials": return ["materials"];
    case "reply": case "nrmn": case "method": case "door": case "reopen": return ["how"];
    case "name": case "agency": case "country": case "city": case "email": case "website": case "mswl": return "all";
    default: break;
  }
  if (tab === "notes") return "notes";
  if (tab === "want") return ["genres", "wishlist"];
  if (tab === "work") return ["materials", "how"];
  return "all";
}
/** a door's ask: its seq makes a second ask for the same place a new ask */
export interface OpenAt { seq: number; tab?: AgentCardTab; focus?: AgentCardField; prefill?: Partial<import("../../../lib/cardDraft").CardDraft> }

/** where a section's edit opens in the editor (the field it starts at) */
export const SEC_FOCUS: Record<Sec262, AgentCardField> = { contact: "name", genres: "genres", wishlist: "wishlist", materials: "materials", how: "reply" };

const IC = {
  pen: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13.5 3.5l3 3L7 16l-4 1 1-4z" /></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></svg>,
  l: <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l-6 6 6 6" /></svg>,
  r: <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4l6 6-6 6" /></svg>,
  tile: {
    reply: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
    door: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 21V4h12v17M3 21h18M14 12h.01" /></svg>,
    method: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5l8.5 6 8.5-6" /></svg>,
    policy: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z" /></svg>,
  },
};

type Tab = "profile" | "history" | "notes";

export interface AgentCard262Props extends AgentCard24Props {
  /** a section's edit (Part C opens it on the card) */
  onEditSection?: (k: Sec262) => void;
  /** Add agent v1 — the add journey's finish screen: the real face, read-only (no ✕, no pencils, no pager; its gap
   *  links hand off to `onEdit`) */
  preview?: boolean;
  /** Add agent v1 Phase 5 — open the card in edit mode at a door's section */
  openAt?: OpenAt;
}

/** a section: heading (with its pencil on hover), then its content or its ghost lines and one "+ Add …" */
const Section: React.FC<{ k: Sec262; title: string; onEdit?: () => void; onDone?: () => void; editing?: React.ReactNode; children?: React.ReactNode }> = ({ k, title, onEdit, onDone, editing, children }) => (
  <section className={`apc-sec cl262-sec${editing ? " is-edit" : ""}`} data-cl262="sec" data-k={k} data-fam={SEC_FAM[k]} data-editing={editing ? "" : undefined}>
    <h5>{title}{onEdit && !editing ? <button type="button" className="cl262-pen" data-cl262="pen" data-k={k} aria-label={`Edit ${title.toLowerCase()}`} onClick={onEdit}>{IC.pen}</button> : null}
      {editing && onDone ? <button type="button" className="cl262-done" data-cl262="sec-close" data-k={k} onClick={onDone}>Close</button> : null}</h5>
    {/* the editor's own field styles live under its `.ac` root (box-sizing and face inheritance only) */}
    {editing ? <div className="ac cl262-fx">{editing}</div> : children}
  </section>
);
/** Agent card v2 — the query box's door back: the tab the writer left, for this agent, read once when the card returns */
let returnTo: { agentId: string; tab: Tab } | null = null;
/** the parts a changed field lives in (the saved tint) */
const PART_OF: Partial<Record<keyof CardDraft, string>> = {
  name: "head", agency: "head", agencyUnknown: "head", country: "head", city: "head", email: "contact", website: "contact",
  genres: "genres", wishlist: "wishlist", mats: "asks", weeks: "facts", nrn: "facts", method: "facts", methodOther: "facts", door: "facts", reopens: "facts", rating: "band",
};
/** a fact box's "Add": the field of "How {first} works" it lands in (AaField `data-f`) */
const BOX_FIELD: Record<"reply" | "method" | "door", string> = { reply: "weeks", method: "method", door: "door" };
/** the dotted "not queried" ring, at the size the query card's footer disc holds */
const NQ16 = <svg viewBox="0 0 14 14" width="16" height="16" aria-hidden="true"><circle cx="7" cy="7" r="5.6" fill="none" stroke="#2a3a52" strokeWidth="1.5" strokeDasharray="1.6 2" /></svg>;
const BOOK = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5f5a53" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 5.5c2.8-1.3 5.8-1.3 8.5.6 2.7-1.9 5.7-1.9 8.5-.6v13c-2.8-1.3-5.8-1.3-8.5.6-2.7-1.9-5.7-1.9-8.5-.6z" /><path d="M12 6.1v13" /></svg>;
const LETTER = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="m2.5 4.5 5.5 4 5.5-4" /></svg>;
const PAGE = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M4 2h6l2.5 2.5V14H4z" /><path d="M6 7h4M6 9.5h4" /></svg>;
const PAGES = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M5 2.5h7v10H5z" /><path d="M3.5 4.5v10h7" /></svg>;
/** the completion ring: navy over blush, the share of Housekeeping's details that are in */
const Ring: React.FC<{ share: number }> = ({ share }) => {
  const r = 16, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#f0d9d2" strokeWidth="5" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="#2a3a52" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c * share).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 20 20)" />
    </svg>
  );
};
/** run once the page has gone quiet (three short frames in a row), or after 1.5s: v161's rule for when the bump starts */
function afterQuiet(run: () => void): void {
  let last = performance.now(), calm = 0, done = false;
  const cap = window.setTimeout(() => { if (!done) { done = true; run(); } }, 1500);
  const tick = (t: number) => {
    if (done) return;
    calm = t - last < 34 ? calm + 1 : 0;
    last = t;
    if (calm >= 3) { done = true; window.clearTimeout(cap); run(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
/** the saved tint: the part holds #dfe7f0 with a #9db4cf edge, then fades to its own colour over 1.8s */
export const SAVED_TINT = { fill: "#dfe7f0", edge: "#9db4cf", ms: 1800, hold: 0.3 } as const;
function tintParts(root: HTMLElement, parts: readonly string[]): void {
  for (const k of new Set(parts)) {
    for (const el of root.querySelectorAll<HTMLElement>(`[data-acv2-part='${k}']`)) {
      const cs = getComputedStyle(el);
      const own = { backgroundColor: cs.backgroundColor, boxShadow: cs.boxShadow === "none" ? "inset 0 0 0 0 rgba(0, 0, 0, 0)" : cs.boxShadow };
      const on = { backgroundColor: SAVED_TINT.fill, boxShadow: `inset 0 0 0 1.5px ${SAVED_TINT.edge}` };
      el.animate([{ ...on }, { ...on, offset: SAVED_TINT.hold }, own], { duration: SAVED_TINT.ms, easing: "ease-out" }).id = "acv2-saved";
    }
  }
}

export const AgentCard262: React.FC<AgentCard262Props> = (p) => {
  const m = useCardModel(p);
  const { x } = p;
  const a = m.a;
  const [tab, setTab] = useState<Tab>(() => {
    /* the query box's way back: the tab the writer left */
    const r = returnTo && returnTo.agentId === a.id ? returnTo.tab : "profile";
    returnTo = null;
    return r;
  });
  const firstId = useRef(a.id);
  useEffect(() => { if (firstId.current === a.id) return; firstId.current = a.id; setTab("profile"); }, [a.id]);
  const scrollRef = useRef<HTMLDivElement>(null);
  /* ── Part C · editing on the card: one draft (the editor's own form), any number of open sections ── */
  const kit = p.edit?.form ?? null;
  const [open, setOpen] = useState<Sec262[]>([]);
  /* Agent card v2 — the frame the bump moves (the white mat), and what a save lands on */
  const cardRef = useRef<HTMLDivElement>(null);
  const changedRef = useRef<readonly (keyof CardDraft)[]>([]);
  const land = useCallback((parts: readonly string[]) => {
    const frame = cardRef.current;
    if (!frame || reduced()) return;
    /* the tint as soon as the closed sections have drawn their parts; the bump on the first quiet frame after */
    requestAnimationFrame(() => requestAnimationFrame(() => { if (cardRef.current) tintParts(cardRef.current, parts); }));
    afterQuiet(() => bump(cardRef.current));
  }, []);
  const editing = open.length > 0;
  /* Card offers v1 — the panel deepens its scrim while anything is being edited (and lets it go when the card goes) */
  useEffect(() => {
    if (p.preview) return undefined;
    window.dispatchEvent(new CustomEvent(CARD_EDITING_EVENT, { detail: editing }));
    return () => { if (editing) window.dispatchEvent(new CustomEvent(CARD_EDITING_EVENT, { detail: false })); };
  }, [editing, p.preview]);
  const closeAll = useCallback(() => setOpen([]), []);
  /* Card offers v1 — what the save does with the queries already out: the plan at the moment Save is pressed (set below,
     every render; declared here so the save's closure never reads it before it exists) */
  const planRef = useRef<OfferPlan | null>(null);
  const form = useAgentForm({
    mode: "edit", agent: a, personal: kit?.personal ?? [], agents: kit?.agents ?? [],
    alsoFor: kit?.alsoFor ?? (() => []),
    onSave: async (d, base) => {
      if (!kit) return { ok: false, error: "Nothing to save to." };
      const changed = changedRef.current;
      const r = await kit.onSave(d, base, planRef.current, { n: changeCount(changed) });
      if ("error" in r) return r;
      /* Agent card v2 — the sections close in place, the card leans back and bumps once (the query card's bump), and the
         parts that changed hold the saved tint (the `is-saved` outline flash is retired) */
      closeAll();
      land(changed.map((k) => PART_OF[k]).filter((x): x is string => !!x));
      return r;
    },
    onLeave: closeAll,
  });
  const resetRef = useRef(form.reset);
  resetRef.current = form.reset;
  changedRef.current = form.changed;
  /* ── Card offers v1 · what this edit does to the queries already out, asked as a choice ──────────────────────────
     The two choices live for one edit session: they start on Update and on the close offer's suggestion, and reset
     whenever the sections close (a save, Cancel, a discard). While the slider is dragged the offer holds still and
     settles on release. */
  const [rtChoice, setRtChoice] = useState<RtChoice>("update");
  const [closeChoice, setCloseChoice] = useState<CloseChoice | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => { if (!editing) { setRtChoice("update"); setCloseChoice(null); setDragging(false); } }, [editing]);
  const settled = useRef<CardOffers | null>(null);
  const offersNow = useMemo<CardOffers | null>(() => {
    if (!editing || !kit || !form.dirty) return null;
    return cardOffers(a, toContactDraft(a, form.base, form.d), p.queries, p.nowMs, { close: closeChoice, titleOf: p.titleOf });
  }, [editing, kit, form.dirty, form.base, form.d, a, p.queries, p.nowMs, closeChoice, p.titleOf]);
  if (!dragging) settled.current = offersNow;
  const offers = dragging ? settled.current : offersNow;
  const plan = offers ? offerPlan(offers, rtChoice, closeChoice) : null;
  planRef.current = plan;
  /* while editing there is always a kit, so a press on the slider holds the offer even before the draft differs */
  const offerKit: OfferKit | null = editing ? {
    o: offers ?? { quiet: [] }, rt: rtChoice, close: closeChoice, setRt: setRtChoice, setClose: setCloseChoice, onDrag: setDragging,
    weeks: form.d.weeks ?? null, nrn: form.d.nrn === true,
  } : null;
  /* a new agent: nothing open, a fresh draft */
  /* Add agent v1 — only on a REAL change of agent (paging): a mount re-run (StrictMode runs mount effects twice) must not
     close the sections a door's ask has just opened */
  const shownId = useRef(a.id);
  useEffect(() => {
    if (shownId.current === a.id) return;
    shownId.current = a.id;
    setOpen([]); resetRef.current(a);
  }, [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /** open one section (adding it to any already open); the first opening starts a fresh draft */
  const openSec = (k: Sec262, field?: string) => {
    if (!kit) { p.onEdit(undefined, SEC_FOCUS[k]); return; }
    opened.current = { k, all: false, field };
    setTab("profile");
    setOpen((cur) => {
      if (cur.includes(k)) return cur;
      if (!cur.length) resetRef.current(a);
      return [...cur, k];
    });
  };
  /** the band's pencil: every section, and Contact details at the top — or, from + Website / + Email (Card offers v1),
   *  every section with the cursor in that field, scrolled into view */
  const openAll = (focus?: "website" | "email") => {
    if (!kit) { p.onEdit("who", focus); return; }
    opened.current = { k: "contact", all: true, focus };
    setRevealSeq((n) => n + 1);
    setTab("profile");
    setOpen((cur) => { if (!cur.length) resetRef.current(a); return ["contact", "genres", "wishlist", "materials", "how"]; });
  };
  const cancel = () => { if (form.dirty) { setGuard({ n: changeCount(form.changed), run: () => {} }); return; } setGuard(null); closeAll(); form.reset(a); };
  /** a section's Close: it folds; the last one folding with unsaved changes asks first */
  const closeSec = (k: Sec262) => {
    if (open.length === 1 && open[0] === k && form.dirty) { setGuard({ n: changeCount(form.changed), run: () => {} }); return; }
    setOpen((cur) => cur.filter((x) => x !== k));
  };
  /* Add agent v1 Phase 5 — a door's ask: open at its section (or every section, or the Notes tab), once per seq */
  const applyAsk = (tab?: AgentCardTab, focus?: AgentCardField) => {
    const w = secsFor(tab, focus);
    if (w === "notes") { setTab("notes"); return; }
    if (w === "all") {
      /* Card offers v1 — a door at a contact link lands in it: whichever of website and email is missing first */
      const site0 = !(a.website ?? "").trim(), mail0 = !(a.email ?? "").trim();
      const f = focus === "website" || focus === "email" ? (site0 ? "website" : mail0 ? "email" : focus) : undefined;
      openAll(f);
      return;
    }
    for (const k of w) openSec(k);
  };
  const askSeq = useRef(0);
  const ask0: OpenAt | null = p.openAt ?? (p.edit?.request?.edit ? { seq: p.edit.request.seq, focus: p.edit.request.edit.focus, prefill: p.edit.request.edit.prefill } : p.edit?.request?.inline ? { seq: p.edit.request.seq, focus: INLINE_FOCUS[p.edit.request.inline] } : null);
  useEffect(() => {
    if (!ask0 || !kit || ask0.seq === askSeq.current) return;
    askSeq.current = ask0.seq;
    applyAsk(ask0.tab, ask0.focus);
    /* answers carried over (Housekeeping's "Edit on {first}'s card") land on the fresh draft, unsaved */
    if (ask0.prefill && Object.keys(ask0.prefill).length) { const pf = ask0.prefill; window.setTimeout(() => form.set(pf), 0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per ask (its seq)
  }, [ask0?.seq, kit, a.id]);
  const edit = openSec;
  const isOpen = (k: Sec262) => open.includes(k);
  const all = open.includes("contact");

  /* ══ Part D · keeping your place ══════════════════════════════════════════════════════════════════════════════
     EDITING NEVER MOVES THE CARD UNDER YOU. The card, its frame and its scroller are never replaced (every change is a
     re-render of the same elements), and THE ANCHOR RULE holds the section you are in: before an update the section
     acted in (or, failing that, the first one visible below the band) is noted with its distance from the scroller's
     top, and after every render `scrollTop` is corrected so it is the same distance again (±1px). A section growing or
     shrinking above you never moves the one you're in. */
  const anchor = useRef<{ k: string; off: number } | null>(null);
  const secEl = (sc: HTMLElement, k: string) => sc.querySelector<HTMLElement>(`[data-cl262='sec'][data-k='${k}']`);
  const offOf = (sc: HTMLElement, el: HTMLElement) => el.getBoundingClientRect().top - sc.getBoundingClientRect().top;
  const firstVisible = (sc: HTMLElement): HTMLElement | null => {
    const top = sc.getBoundingClientRect().top;
    return [...sc.querySelectorAll<HTMLElement>("[data-cl262='sec']")].find((e) => e.getBoundingClientRect().bottom > top + 1) ?? null;
  };
  const pick = useCallback((target: EventTarget | null) => {
    const sc = scrollRef.current;
    if (!sc) return;
    const el = (target instanceof Element ? target.closest<HTMLElement>("[data-cl262='sec']") : null) ?? firstVisible(sc);
    anchor.current = el?.dataset.k ? { k: el.dataset.k, off: offOf(sc, el) } : null;
  }, []);
  const adjusting = useRef(false);
  useEffect(() => {
    const sc = scrollRef.current;
    const frame = sc?.closest<HTMLElement>("[data-apc='frame']");
    if (!sc || !frame) return undefined;
    const onAct = (e: Event) => pick(e.target);
    /* the user's own scroll re-notes the anchor: the first section visible */
    const onScroll = () => { if (adjusting.current) { adjusting.current = false; return; } pick(null); };
    frame.addEventListener("pointerdown", onAct, true);
    frame.addEventListener("keydown", onAct, true);
    frame.addEventListener("focusin", onAct, true);
    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      frame.removeEventListener("pointerdown", onAct, true);
      frame.removeEventListener("keydown", onAct, true);
      frame.removeEventListener("focusin", onAct, true);
      sc.removeEventListener("scroll", onScroll);
    };
  }, [pick]);
  /* every render: the anchored section back to its distance from the top */
  useLayoutEffect(() => {
    const sc = scrollRef.current, an = anchor.current;
    if (!sc || !an) return;
    const el = secEl(sc, an.k);
    if (!el) return;
    const delta = offOf(sc, el) - an.off;
    if (Math.abs(delta) > 0.5) { adjusting.current = true; sc.scrollTop += delta; }
  });

  /* revealing and focus: a section opened on its own scrolls into view only by what it needs (plus 90px of air), or its
     heading comes to 70px below the band when it was hidden; its first text field takes focus without scrolling */
  const opened = useRef<{ k: Sec262; all: boolean; focus?: "website" | "email"; field?: string } | null>(null);
  /* a reveal asked for while every section is already open changes no state: this makes it a new ask */
  const [revealSeq, setRevealSeq] = useState(0);
  useEffect(() => {
    const o = opened.current;
    const sc = scrollRef.current;
    if (!o || !sc) return;
    opened.current = null;
    const el = secEl(sc, o.all ? "contact" : o.k);
    if (!el) return;
    /* Agent card v2 — a fact box's "Add" lands in that field of "How {first} works" */
    const field = o.focus ? el.querySelector<HTMLInputElement>(`input[data-ae='${o.focus}']`)
      : o.field ? el.querySelector<HTMLInputElement>(`[data-f='${o.field}'] input, [data-f='${o.field}'] button`)
      : el.querySelector<HTMLInputElement | HTMLTextAreaElement>("textarea, input[data-ae='name']");
    if (field) { field.focus({ preventScroll: true }); const n = field.value.length; try { field.setSelectionRange(n, n); } catch { /* not a text field */ } }
    /* Card offers v1 — + Website / + Email: the field itself, brought into view in the card's scroller */
    if (o.focus && field) {
      const fr = field.getBoundingClientRect(), b = sc.getBoundingClientRect();
      if (fr.top < b.top + 70 || fr.bottom > b.bottom - 90) sc.scrollTop += fr.top - b.top - Math.max(70, (b.height - fr.height) / 2);
      return;
    }
    /* Add agent v1 — the band pencil (every section) brings Contact details to the top */
    if (o.all) { sc.scrollTop = 0; return; }
    const r = el.getBoundingClientRect(), b = sc.getBoundingClientRect();
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let by = 0;
    /* a heading flush with the top (to within a pixel: layout lands on fractions) is in view, not hidden */
    if (r.top < b.top - 1) by = r.top - b.top - 70;
    else if (r.bottom > b.bottom) by = Math.min(r.bottom - b.bottom + 90, r.top - b.top - 70);
    if (by) sc.scrollBy({ top: by, behavior: reduce ? "auto" : "smooth" });
  }, [open, revealSeq]);

  /* THE DISCARD GUARD: ✕, Esc, paging, another row and leaving the page all ask the draft; with unsaved changes the save
     bar turns rust and nothing else happens until Keep editing or Discard is chosen */
  const [guard, setGuard] = useState<{ n: number; run: () => void } | null>(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = form.dirty;
  const bypass = useRef(false);
  const ask = useCallback((run: () => void): boolean => {
    if (bypass.current || !dirtyRef.current) return true;
    setGuard({ n: changeCount(form.changed), run });
    return false;
  }, [form.changed]);
  const discardThen = (run: () => void) => {
    setGuard(null);
    bypass.current = true;
    closeAll();
    resetRef.current(a);
    run();
    window.setTimeout(() => { bypass.current = false; }, 0);
  };
  /* the host's ✕ and Esc */
  useEffect(() => {
    const g = kit?.closeGuardRef;
    if (!g) return undefined;
    g.current = () => ask(() => requestCardClose());
    return () => { g.current = null; };
  }, [kit, ask]);
  /* another row picked on the list, while there are unsaved changes */
  useEffect(() => {
    const l = kit?.leaveRef;
    if (!l) return undefined;
    l.current = form.dirty ? () => { if (ask(() => kit!.resumePick())) kit!.resumePick(); } : null;
    return () => { if (l.current) l.current = null; };
  }, [kit, form.dirty, ask]);
  /* leaving the page (the tab or the window) */
  useEffect(() => {
    if (!form.dirty) return undefined;
    const on = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", on);
    return () => window.removeEventListener("beforeunload", on);
  }, [form.dirty]);
  const goStep = (d: -1 | 1) => { if (ask(() => p.onStep(d))) p.onStep(d); };
  /* ⌘/Ctrl + Enter saves when there are changes */
  const saveRef = useRef(form.save);
  saveRef.current = form.save;
  useEffect(() => {
    const frame = scrollRef.current?.closest<HTMLElement>("[data-apc='frame']");
    if (!frame) return undefined;
    const on = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey) || !dirtyRef.current) return;
      e.preventDefault();
      void saveRef.current();
    };
    frame.addEventListener("keydown", on);
    return () => frame.removeEventListener("keydown", on);
  }, []);
  /* Esc while editing: the guard up means Keep editing; changes ask; no changes closes the open sections */
  useEscapeLayer(editing || !!guard, () => {
    if (guard) { setGuard(null); return; }
    if (form.dirty) { setGuard({ n: changeCount(form.changed), run: () => {} }); return; }
    closeAll();
  }, ESC_LEVEL.card);

  /* ══ Agent card v2 · the face ══════════════════════════════════════════════════════════════════════════════════ */
  const tone = acTone(x);
  const col = acColours(tone);
  const pill = acPill(x);
  const ft = acFoot(x, m.first, m.call, p.nowMs);
  const boxes = factBoxes(a, x.door);
  const asks = askList(a);
  const genres = a.genres ?? [];
  const wish = (a.mswlNotes ?? "").trim();
  const site = (a.website ?? "").trim();
  const email = (a.email ?? "").trim();
  const added = addedLabel(a);
  const name = agentPrimary(a);
  const agency = (a.name ?? "").trim() ? ((a.agency ?? "").trim() || (a.agencyUnknown ? "Agency unknown" : "")) : "";
  const initials = agentInitials(a).slice(0, 2);
  const { showToast } = useToast();
  const db = useScriptAllyDb();

  /* the query card for this agent's live query, with "← Back to {first}"; the card comes back at the tab it left */
  const openQuery = (queryId: string) => {
    if (!ask(() => openQuery(queryId))) return;
    returnTo = { agentId: a.id, tab };
    openQueryPanelFromAgent(queryId, agentBack(a));
  };
  const runAct = (act: AcAct) => {
    if (act.kind === "journey") p.onJourney(act.mode, act.queryId);
    else if (act.kind === "log") p.onLog();
    else if (act.kind === "open") openQuery(act.queryId);
    else {
      /* Make it a task: the offer's answer, on today's to-do list */
      const q = p.queries.find((y) => y.id === act.queryId);
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      void db.addUserTask({ text: `Answer ${m.first}’s offer`, queryId: act.queryId, agentId: a.id, manuscriptId: q?.manuscriptId, dueDate: today })
        .then(() => showToast({ message: "On your to-do list for today" }));
    }
  };

  /* Agent fit: a star saves at once; the chosen one pressed again clears it. The bump and the app's snackbar confirm it. */
  const rate = (n: number | null) => {
    if (!p.edit) return;
    void p.edit.save({ rating: n }).then((ok) => { if (ok) land(["band"]); });
  };

  const band = (
    <div className="qc152-band dk agb" data-qc152="band" data-acv2="band" data-acv2-part="band">
      {p.preview ? (
        <span className="cl262-stars cl262-fitro ag-fit" data-cl262="stars" aria-label={`Agent fit: ${a.starRating ? `${a.starRating} of 5` : "not rated"}`}>
          <small className="aap-fitw">Agent fit</small>{[1, 2, 3, 4, 5].map((i) => <i key={i} data-on={i <= (a.starRating ?? 0) ? "" : undefined}>★</i>)}
        </span>
      ) : (
        <span className="cl262-fitwrap ag-fit" data-cl262="fit">
          <span data-cl262="stars"><FitStars variant="band" value={a.starRating ?? null} onPick={rate} /></span>
          <InfoTip tone="light">{FIT_TIP}</InfoTip>
        </span>
      )}
      {p.preview ? null : <>
        <span className="ag-pos" data-cl24="pos" data-acv2="pos">{p.index + 1} / {p.total}</span>
        <button type="button" className="qc152-x" data-cl262="prev" data-cl24="prev" aria-label="Previous agent" title="Previous agent" disabled={p.index <= 0} onClick={() => goStep(-1)}>{IC.l}</button>
        <button type="button" className="qc152-x" data-cl262="next-agent" data-cl24="next" aria-label="Next agent" title="Next agent" disabled={p.index >= p.total - 1} onClick={() => goStep(1)}>{IC.r}</button>
        {all ? <span className="cl262-editing" data-cl262="editing-chip">Editing</span>
          : <button type="button" className="qc152-x" data-cl262="edit-all" aria-label={`Edit everything about ${m.first}`} title={`Edit everything about ${m.first}`} onClick={() => openAll()}>{IC.pen}</button>}
        <button type="button" className="qc152-x" data-cl262="close" data-cl24="close" aria-label="Close the agent" title="Close" onClick={() => (p.onClose ?? requestCardClose)()}>✕</button>
      </>}
    </div>
  );
  const head = (
    <div className="qc152-agent" data-acv2="head" data-acv2-part="head">
      <span className={`qc152-disc acv2-disc${tone === "nq" ? " nq" : tone === "closed" ? " cl" : ""}`} data-acv2="disc" data-tone={tone} aria-hidden="true"
        style={tone === "nq" ? undefined : { boxShadow: `0 0 0 2.5px #fff, 0 0 0 4.5px ${col.edge}` }}>{initials}</span>
      <div className="qc152-who">
        <h2 className="qc152-nm qcv-open-nm" data-apc="name" data-acv2="name">{name}</h2>
        {agency ? <div className="qc152-ag" data-acv2="agency">{agency.toUpperCase()}</div> : null}
        {x.loc ? <div className="ag-loc" data-acv2="loc">{x.loc}</div> : null}
      </div>
      <span className={`qc152-pill${tone === "nq" ? " nq" : ""}`} data-qc152="pill" data-acv2="pill" data-stage={tone === "nq" ? undefined : tone} data-tone={tone}>
        <span className="qc152-cap">{pill.status ? <StatusDot status={pill.status} overrideSize={17} tone="ink" decorative /> : NQ16}</span><span>{pill.word}</span>
      </span>
    </div>
  );
  const q = x.q;
  const qbox = q ? (
    <button type="button" className={`ag-q${tone === "offer" ? " foil" : ""}`} data-acv2="qbox" data-tone={tone} data-query={q.id}
      aria-label={`Open your query to ${m.first}`} onClick={() => openQuery(q.id)}>
      <span className="bk" aria-hidden="true">{BOOK}</span>
      <span className="t"><b data-acv2="qbox-title">{p.titleOf(q.manuscriptId)}</b><i data-acv2="qbox-line">{queryBoxLine(q, p.nowMs)}</i></span>
      <span className="go">Open the query{ARW}</span>
    </button>
  ) : null;
  const tabs = (
    <div className="qc152-tabs" role="tablist" aria-label="The agent" data-acv2="tabs">
      {(["profile", "history", "notes"] as const).map((t) => (
        <button key={t} type="button" role="tab" data-cl262="tab" data-cl24="tab" data-tab={t} aria-selected={tab === t} onClick={() => setTab(t)}>
          {t === "profile" ? "Profile" : t === "history" ? "History" : "Notes"}
        </button>
      ))}
    </div>
  );

  /* ── Profile: QcAgent158's parts, in the pack's order; a section with nothing in it is not drawn ── */
  const gaps = p.gaps && p.gaps.n > 0 ? p.gaps : null;
  const fin = gaps ? finishItems(gaps.keys ?? []) : [];
  const penFor = (k: Sec262) => (p.preview ? null : <button type="button" className="cl262-pen" data-cl262="pen" data-k={k} aria-label={`Edit ${k === "how" ? `how ${m.first} works` : k}`} onClick={() => edit(k)}>{IC.pen}</button>);
  const show = (k: Sec262, title: string, view: React.ReactNode, editor: React.ReactNode | undefined) => (isOpen(k) && editor
    ? <Section key={k} k={k} title={title} onDone={() => closeSec(k)} editing={editor} />
    : view);
  const factsShown = factBoxesShown(boxes);
  const profile = (
    <div className="nx acv2-pro" data-cl262="profile" data-cl24="pane" data-acv2="profile">
      {all && kit ? <Section k="contact" title="Contact details" onDone={() => closeSec("contact")} editing={<EditContact form={form} agent={a} kit={kit} />} /> : null}
      {gaps && !editing ? (
        <div className="ag-fin" data-acv2="finish" data-n={gaps.n}>
          <div className="top"><Ring share={finishShare(gaps.n)} /><div><b>Finish {m.first}’s profile</b>
            <span data-acv2="finish-count">{gaps.n} {gaps.n === 1 ? "detail" : "details"} to add. The more you add, the better your reminders and suggestions.</span></div></div>
          <div className="adds">{fin.map((g) => (
            <button key={g.key} type="button" className="nx-btn gh" data-acv2="finish-add" data-k={g.key}
              onClick={() => (kit ? applyAsk(g.tab, g.focus as AgentCardField) : p.onEdit(g.tab, g.focus as AgentCardField))}>{g.label}</button>
          ))}</div>
        </div>
      ) : null}
      {show("how", `How ${m.first} works`, factsShown ? (
        <section className="acv2-sec" data-cl262="sec" data-k="how" data-acv2="facts-sec">
          {penFor("how")}
          <div className="nx-boxes" data-qc158="boxes" data-acv2="facts" data-acv2-part="facts">
            {boxes.map((b) => <NxBox key={b.k} k={b.k} label={b.label} value={b.value ?? "Not known yet"}
              /* Agent card v2 ruling 3 — an unknown box carries a small "Add" to that field of "How {first} works" */
              sub={b.value ? b.sub : p.preview ? null : <button type="button" className="nx-lk acv2-boxadd" data-acv2="box-add" data-k={b.k}
                onClick={() => (kit ? openSec("how", BOX_FIELD[b.k]) : p.onEdit("work", b.k === "method" ? "method" : b.k === "door" ? "door" : "reply"))}>Add</button>}
              extra={b.value ? undefined : { "data-unknown": "" }} />)}
          </div>
        </section>
      ) : null, kit ? <EditHow form={form} agent={a} kit={kit} first={m.first} offers={offerKit} /> : undefined)}
      {email || site || !p.preview ? (
        <div className="nx-reach" data-qc158="contact" data-acv2="contact" data-acv2-part="contact">
          {email ? <NxCopyEmail email={email} onCopy={() => { void navigator.clipboard?.writeText(email).then(() => showToast({ message: `Copied ${m.first}’s email` }), () => {}); }} />
            /* Agent card v2 ruling 3 — the query card's quiet button; Contact details with the cursor in the field */
            : p.preview ? null : <button type="button" className="nx-btn gh" data-qc158="add" data-acv2="add-email" data-k="email" onClick={() => openAll("email")}>+ Add email</button>}
          {site ? <NxSite label="Website" href={hrefFor(site) ?? null} />
            : p.preview ? null : <button type="button" className="nx-btn gh" data-qc158="add" data-acv2="add-website" data-k="website" onClick={() => openAll("website")}>+ Add a website</button>}
        </div>
      ) : null}
      {show("materials", "What they ask for", asks.length ? (
        <section className="acv2-sec" data-cl262="sec" data-k="materials" data-qc158="asks" data-acv2="asks" data-acv2-part="asks">
          <h4>What {m.first} asks for{penFor("materials")}</h4>
          <ul className="nx-list">{asks.map((c) => (
            <li key={c.label} data-acv2="ask">{c.kind === "letter" ? LETTER : c.kind === "pages" ? PAGES : PAGE}{c.label}{c.qty ? <span className="r">{c.qty}</span> : null}</li>
          ))}</ul>
        </section>
      ) : null, <EditMaterials form={form} />)}
      {show("wishlist", "Manuscript wishlist", wish ? (
        <section className="acv2-sec" data-cl262="sec" data-k="wishlist" data-qc158="wishlist" data-acv2="wishlist" data-acv2-part="wishlist">
          <h4>Wishlist <em>in {m.first}’s words</em>{penFor("wishlist")}</h4>
          <p className="nx-quote" data-cl262="wishlist">{wish}</p>
        </section>
      ) : null, <EditWishlist form={form} />)}
      {show("genres", "Genres sought", genres.length ? (
        <section className="acv2-sec" data-cl262="sec" data-k="genres" data-acv2="genres" data-acv2-part="genres">
          <h4>Genres {m.first} takes{genres.some((g) => p.genreHit(g)) ? <span className="r" data-acv2="yours">includes yours</span> : null}{penFor("genres")}</h4>
          <div className="nx-chips" data-cl262="genres">
            {[...genres.filter((g) => p.genreHit(g)), ...genres.filter((g) => !p.genreHit(g))].map((g) => (
              p.genreHit(g)
                ? <span key={g} className="nx-chip" data-cl262="genre" data-hit=""><span className="nx-tick" aria-hidden="true">{TICK}</span>{p.genreWord(g)}</span>
                : <span key={g} className="nx-chip no" data-cl262="genre">{p.genreWord(g)}</span>
            ))}
          </div>
        </section>
      ) : null, kit ? <EditGenres form={form} kit={kit} isHit={p.genreHit} /> : undefined)}
      <div className="nx-foot" data-acv2="profile-foot">
        <span className="ag-added" data-cl262="added">{added ? `Added ${added}` : "Added"}</span>
        {p.preview ? null : <button type="button" className="nx-lk" data-acv2="edit-details" onClick={() => openAll()}>Edit these details</button>}
      </div>
    </div>
  );

  /* ── History: the query card's thread for each query to the agent; a heading per query only when there is more than one ── */
  const threads = useAgentThreads(a.id, p.queries, p.titleOf, p.nowMs);
  const history = (
    <div className="ag-hist" data-cl262="history" data-cl24="pane" data-acv2="history" data-n={threads.length}>
      {threads.length === 0 ? (
        <div className="nx-nempty" data-acv2="history-empty"><b>No history yet</b><span>When you query {m.first}, every step lands here.</span></div>
      ) : threads.map((t) => (
        <React.Fragment key={t.queryId}>
          {threads.length > 1 ? (
            <div className="ag-hq" data-acv2="history-head" data-query={t.queryId}><b>{t.title}</b>
              <button type="button" className="nx-lk" onClick={() => openQuery(t.queryId)}>Open the query</button></div>
          ) : null}
          <ThreadRead {...t} first={m.first} initials={initials} />
        </React.Fragment>
      ))}
    </div>
  );

  /* ── Notes: QcNotes158 — the agent's own words from this agent's queries, and the writer's notes (the agent's notes
     subcollection, dated). The old `agent.notes` string is shown as one undated note at the top and never rewritten. ── */
  const uid = db.currentUser?.id ?? null;
  const writeAgent = useCallback(async (id: string, patch: Parameters<typeof commitAgentEdits>[3]) => {
    if (!uid) return { ok: false as const, error: "Not signed in" };
    return commitAgentEdits(firestoreDb, uid, id, patch);
  }, [uid]);
  const { storedNotes, onAddNote, onEditNote, onDeleteNote, onRestoreNote } = useAgentNotes(p.preview ? null : a, uid, writeAgent);
  /* the old string is shown as written (never trimmed into a new value): it is edited and deleted as the one field it is */
  const flat = a.notes ?? "";
  const pinnedId = a.pinnedNoteId ?? null;
  const noteList: NoteIn[] = [
    ...(flat.trim() ? [{ id: FLAT_NOTE_ID, text: flat, ms: null, pinned: pinnedId === FLAT_NOTE_ID, top: true }] : []),
    ...storedNotes.map((n) => { const t = Date.parse(n.createdAt); return { id: n.id, text: n.text, ms: Number.isFinite(t) ? t : null, pinned: pinnedId === n.id }; }),
  ];
  /* Agent card v2 ruling 1 — Pin as the query card's notes pin: one pinned note, first in the list; pinning another moves the
     pin. Stored as the agent's `pinnedNoteId`, with the card cache (`notePreview`) recomputed in the same write. */
  const pinNote = (id: string | null) => {
    const list = committedNotes(effectiveNotes(storedNotes, emptyNotesDraft(), { flatNote: a.notes, dateAdded: a.dateAdded }));
    void writeAgent(a.id, { pinnedNoteId: id, notePreview: computeNotePreview(list, id ?? undefined) })
      .then((r) => { if (!r.ok) showToast({ message: "Couldn’t pin that note. Try again." }); });
  };
  /* Agent card v2 ruling 4 — Edit and Delete on every note of the writer's. The old string writes back to its own field
     through the card's notes save (`onNotes`); Delete clears it, and Undo writes the same bytes back. */
  const editNote = async (id: string, text: string): Promise<boolean> => (id === FLAT_NOTE_ID ? p.onNotes(text) : onEditNote(id, text));
  const deleteNote = (id: string) => {
    if (id === FLAT_NOTE_ID) {
      const was = a.notes ?? "";
      void p.onNotes("").then((ok) => {
        if (!ok) { showToast({ message: "Couldn’t delete that note. Try again." }); return; }
        showToast({ message: "Note deleted", undo: async () => { if (await p.onNotes(was)) showToast({ message: "Note restored" }); } });
      });
      return;
    }
    const n = storedNotes.find((x) => x.id === id);
    if (!n) return;
    void onDeleteNote(n).then((ok) => {
      if (!ok) { showToast({ message: "Couldn’t delete that note. Try again." }); return; }
      showToast({ message: "Note deleted", undo: async () => { if (await onRestoreNote(n)) showToast({ message: "Note restored" }); } });
    });
  };
  const quotes = threads.flatMap((t) => quotesOf(t.steps));
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const notes = (
    <div className="qc152-notes acv2-notes" data-cl262="notes" data-cl24="pane" data-acv2="notes">
      <NotesTab158 first={m.first} nowMs={p.nowMs} notes={noteList} quotes={quotes} resetKey={a.id}
        placeholder={`Add a note about ${m.first}`} emptySub={`This is the place for where you met ${m.first}, and anything worth remembering before you query.`}
        onAdd={(text) => { void onAddNote(text).then((ok) => { if (ok) { land([]); showToast({ message: `Noted on ${m.first}’s card` }); } else showToast({ message: "Couldn’t save that note. Try again." }); }); }}
        onPin={p.preview ? null : (id, on) => pinNote(on ? id : null)}
        onEdit={p.preview ? null : editNote}
        onDelete={p.preview ? null : deleteNote}
        onTask={p.preview ? null : (text) => { void db.addUserTask({ text, agentId: a.id, dueDate: todayIso() }).then(() => showToast({ message: "On your to-do list for today" })); }}
        onCork={p.preview ? null : (text) => { void db.addUserTask({ text, agentId: a.id }).then(() => showToast({ message: "Pinned to your Corkboard" })); }} />
    </div>
  );

  const body = tab === "profile" ? profile : tab === "history" ? history : notes;
  const icon = ft.icon.k === "nq" ? { k: "node" as const, node: NQ16 } : ft.icon;
  const footer = (
    <Foot late={false} icon={icon} lead={ft.lead} sub={ft.sub}
      primary={ft.button ? { label: ft.button.label, tone: ft.button.tone, act: ft.button.act.kind, run: () => runAct(ft.button!.act), hook: { "data-acv2": "foot-btn", "data-cl24": "call-btn" } } : null}
      others={[ft.link ? { label: ft.link.label, act: ft.link.act.kind, run: () => runAct(ft.link!.act), hook: { "data-acv2": "foot-link" } } : null]}
      outer={{ "data-acv2": "foot", "data-row": ft.row }} />
  );
  return (
    <div ref={cardRef} className={`cl262-card apc acv2${editing ? " is-editing" : ""}${p.preview ? " is-preview" : ""}`} data-cl262="card" data-apc="card" data-acv2="card"
      data-tone={tone} data-stand={x.stand} data-agent-id={a.id}>
      <div className="apc-frame acv2-frame" data-apc="frame" data-acv2="frame">
        <div className="qc149c qcv-legacy qc152 acv2-qc" data-acv2="qc"
          style={{ ["--band" as string]: col.band, ["--tint" as string]: col.tint, ["--edge" as string]: col.edge, ["--mark" as string]: col.mark, ["--fdisc" as string]: tone === "nq" ? "#f3f6f9" : col.band } as React.CSSProperties}>
          <div className="qc152-in">
            {band}
            {head}
            {qbox}
            {tabs}
            <div ref={scrollRef} className="qc152-body" role="tabpanel" data-qc152="body" data-apc="scroll" data-cl262="scroll" data-acv2="body" data-tab={tab}>{body}</div>
            {editing ? (
              <div className="ag-savewrap" data-acv2="save">
                <SaveBar form={form} first={m.first} guard={guard} onCancel={cancel} onSave={() => void form.save()} onKeep={() => setGuard(null)}
                  onDiscard={() => { const g = guard; discardThen(g ? g.run : () => {}); }} extras={plan ? saveExtras(plan) : []} />
              </div>
            ) : footer}
          </div>
        </div>
      </div>
    </div>
  );
};
