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
 *   footer     QcFoot1581, from lib/agentCardV2 `acFoot` (the pack's table); it stays while sections are open, and the rust
 *              bar takes its place only when leaving with something unsaved (Agent card v2.1)
 *
 * ⚠️ THE QUERY CARD'S PARTS DRAW INSIDE A `.qc152` ROOT, so the query card's own stylesheets place them; the agent card's
 *    stylesheet (acv2.css) holds only what is the agent card's. Nothing of the query card's CSS is copied.
 * ⚠️ EDITING IS BY SECTION, IN PLACE (Agent card v2.1, design-refs/agent-card-v2-1/): each section opens where it is and
 *    looks like itself, with its own cross and tick; a tick saves that section's fields only, through the built save path.
 *    The fields' rules, the offers and what each field stores are as built (Contact list v26.2 C, Card offers v1, Add
 *    agent v1). Decisions: docs/decisions/agent-card.md.
 */
import { MaterialItemIcon } from "../../shared/MaterialIcon";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { StatusDot } from "../../StatusDot";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { addedLabel } from "../../../lib/contactList";
import { hrefFor } from "../../../lib/quickAdd";
import { type AgentCard24Props, useCardModel } from "./AgentCard24";
import { acColours, acFoot, acPill, acTone, askList, factBoxes, factBoxesShown, finishItems, finishShare, queryBoxLine, sectionsSavedWords, UNDONE_WORDS, type AcAct } from "../../../lib/agentCardV2";
import { NxBox, TICK } from "../../queries/centre/QcAgent158";
import { countryName, flagFor, normaliseCountry } from "../../../lib/territory";
import "flag-icons/css/flag-icons.min.css";
import { Foot, ARW } from "../../queries/centre/QcFoot1581";
import { NotesTab158, quotesOf, type NoteIn } from "../../queries/centre/QcNotes158";
import { ThreadRead } from "../../queries/centre/QcThreadRead";
import { breatheClose, breatheOpen, breatheType, bump, fadeIn, finishAll, foot, hold, LIGHT, pressAtPointer, pressBack, pressThen, reduced, release, SETTLE } from "../../queries/centre/qcMotion160";
import { NO_QUERY_RIM, STAGE_COLOURS } from "../../../lib/stageColours";
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
import { pickDraft, useAgentForm } from "../card/useAgentForm";
import { EditContact, EditGenres, EditHow, EditMaterials, EditWishlist, GuardBar, changeNames, type OfferKit } from "./AgentCard262Edit";
import type { InlineField } from "../card/InlineEdits";
import { applyPatch, cardPatch, changedFields, draftOf, problemsOf, toContactDraft, type CardDraft, type CardProblemKey } from "../../../lib/cardDraft";
import { cardOffers, offerPlan, type CardOffers, type CloseChoice, type OfferPlan, type RtChoice } from "../../../lib/cardOffers";

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
import "./acv21.css";
/* Agent card v2.2 — the query card's one way to edit, its parts imported (never copied), then this card's placing of them */
import "../../queries/centre/qcv168.css";
import "./acv22.css";
import { EditPen } from "../../queries/centre/QcEdit168";

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
/** Agent card v2.1 — the draft fields each section saves, discards and re-reads on its own (Agent fit saves from the band) */
export const SEC_FIELDS: Record<Sec262, readonly (keyof CardDraft)[]> = {
  contact: ["name", "agency", "agencyUnknown", "country", "city", "email", "website", "form", "mswl", "social"],
  how: ["weeks", "nrn", "method", "methodOther", "door", "reopens"],
  wishlist: ["wishlist"], genres: ["genres"], materials: ["mats"],
};
/** the problems a section's own fields can have (cardDraft `problemsOf`) */
export const SEC_PROBLEMS: Record<Sec262, readonly CardProblemKey[]> = {
  contact: ["name", "agency", "email", "website", "mswl", "form"], how: [], wishlist: [], genres: [], materials: ["oth", "smp"],
};
/** a section as the snackbar and the rust bar name it */
export const secName = (k: Sec262): string => ({ contact: "contact details", how: "how they work", wishlist: "the wishlist", genres: "genres", materials: "what they ask for" })[k];

const IC = {
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

const XI = <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>;
const OK = <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 10.5l3.6 3.6 7.4-8" /></svg>;
/**
 * Agent card v2.1 — AN OPEN SECTION LOOKS LIKE ITSELF: its place, its heading and its type, its contents live. A 1.5px navy
 * outline 9px outside it shows it is open (no tinted box, no header bar, no "Close"). At the right of its heading: the cross
 * (discard, outlined) and the tick (save, navy).
 */
const OpenSec: React.FC<{ k: Sec262; heading: React.ReactNode; label: string; err?: string; busy: boolean; onCross: () => void; onTick: () => void; onTickDown?: () => void; className?: string; children: React.ReactNode }> = ({ k, heading, label, err, busy, onCross, onTick, onTickDown, className, children }) => (
  <section className={`acv2-sec ag-sec live${className ? ` ${className}` : ""}`} data-cl262="sec" data-k={k} data-editing="" data-acv21="open">
    <h4>{heading}
      <span className="ag-sx" data-acv21="sx">
        <button type="button" className="ag-no" data-acv21="cross" data-k={k} aria-label={`Discard changes to ${label}`} title="Discard changes" onClick={onCross}>{XI}</button>
        <button type="button" className="ag-ok" data-acv21="tick" data-k={k} aria-label={`Save ${label}`} title="Save" disabled={busy} onPointerDown={onTickDown} onClick={onTick}>{OK}</button>
      </span>
    </h4>
    {err ? <p className="acv21-err" role="alert" data-acv21="err">{err}</p> : null}
    {/* the editor's own field styles live under its `.ac` root (box-sizing and face inheritance only) */}
    <div className="ac acv21-body">{children}</div>
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
/* Agent card v2.1 — the head's contact line: the mail glyph, the copy glyph, the globe */
const MAIL15 = <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="m2.5 4.5 5.5 4 5.5-4" /></svg>;
const COPY = <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /></svg>;
const GLOBE15 = <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>;
/** a website as the writer reads it: no scheme, no trailing slash */
const siteWords = (s: string) => s.replace(/^https?:\/\//i, "").replace(/\/$/, "");
/** Agent card v2.1 — the head's values: the agent as stored, or the Contact details draft while it is open */
export interface HeadValues { name: string; agency: string; agencyUnknown: boolean; country: string; city: string; email: string; website: string }
/** the place line: the city, or the country's name when there is no city; the flag comes from the country alone */
export function placeOf(v: Pick<HeadValues, "country" | "city">): { flag: string | null; iso: string | null; text: string } {
  const iso = normaliseCountry(v.country) ?? null;
  return { flag: iso ? flagFor(iso) ?? null : null, iso, text: v.city.trim() || countryName(v.country) || "" };
}
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
/**
 * Agent card v2.1 Phase 4 — WHAT CHANGED SETTLES (it retires v2's tint-only flash): each changed part eases from the query
 * card's settle scale (`SETTLE.from`) to 1 over `SETTLE.ms`, and holds the saved tint, fading to its own colour over 1.8s.
 * Made paused, so they play with the rest of the landing (`release`); returned so a second save can end them at once.
 */
function settleParts(root: HTMLElement, parts: readonly string[]): Animation[] {
  const made: Animation[] = [];
  for (const k of new Set(parts)) {
    for (const el of root.querySelectorAll<HTMLElement>(`[data-acv2-part='${k}']`)) {
      const cs = getComputedStyle(el);
      const own = { backgroundColor: cs.backgroundColor, boxShadow: cs.boxShadow === "none" ? "inset 0 0 0 0 rgba(0, 0, 0, 0)" : cs.boxShadow };
      const on = { backgroundColor: SAVED_TINT.fill, boxShadow: `inset 0 0 0 1.5px ${SAVED_TINT.edge}` };
      const t = el.animate([{ ...on }, { ...on, offset: SAVED_TINT.hold }, own], { duration: SAVED_TINT.ms, easing: "ease-out" });
      t.id = "acv2-saved";
      const sc = el.animate([{ scale: String(SETTLE.from) }, { scale: "1" }], { duration: SETTLE.ms, easing: SETTLE.ease });
      sc.id = "acv21-settle";
      for (const a of [t, sc]) { a.pause(); made.push(a); }
    }
  }
  return made;
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
  /* ── Agent card v2.1 · EDITING BY SECTION, IN PLACE ────────────────────────────────────────────────────────────────
     One draft (the editor's own form) under any number of open sections; each open section saves (its tick) or discards
     (its cross) ITS OWN fields through the built save path, and every other open section keeps its draft. There is no save
     bar; the rust bar appears only when leaving with something unsaved. */
  const kit = p.edit?.form ?? null;
  const [open, setOpen] = useState<Sec262[]>([]);
  const openRef = useRef<Sec262[]>([]);
  openRef.current = open;
  /* Agent card v2 — the frame the bump moves (the white mat), and what a save lands on */
  const cardRef = useRef<HTMLDivElement>(null);
  /* ══ Agent card v2.1 Phase 4 · the query card's motion, from its own code (qcMotion160), on this card's frame ══════
     The frame is the white mat (`cardRef`): its ::before draws the paper and the shadow, so the breath swells that and
     nothing inside the card moves. The border's colour is the frame's `data-qc163-rim` (the query's stage, slate with no
     query): v163's tint and light read it through `rimColours`. */
  const settling = useRef<Animation[]>([]);
  const footWas = useRef<{ text: string; h: number } | null>(null);
  /** a landing: the frame pops from where the press left it (and, after a section's save, v163's light runs once round),
   *  what changed settles, the footer's words fade and rise if they changed — all held until the page has gone quiet and
   *  played together */
  const land = useCallback((parts: readonly string[], o: { light?: boolean; kind?: "save" | "undo" } = {}) => {
    const frame = cardRef.current;
    if (!frame || reduced()) { if (frame) pressBack(frame); return; }
    const kind = o.kind ?? "save", light = o.light !== false;
    /* the closed sections draw their parts first, then the landing is made held and played on the first quiet frame */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const f = cardRef.current;
      if (!f) return;
      hold(f);
      bump(f, f, kind, { light });
      const made = kind === "save" ? settleParts(f, parts) : [];
      if (kind === "undo") for (const k of new Set(parts)) for (const el of f.querySelectorAll<HTMLElement>(`[data-acv2-part='${k}']`)) fadeIn(f, el);
      settling.current = made;
      const ft = f.querySelector<HTMLElement>("[data-acv2='foot']"), was = footWas.current;
      footWas.current = null;
      if (ft && was && (ft.textContent ?? "") !== was.text) foot(f, ft, was.h);
      afterQuiet(() => {
        release(f);
        for (const a of made) { try { a.play(); } catch { /* removed with its element */ } }
        /* other sections still open: the border breathes again once the light has gone round */
        if (openRef.current.length) window.setTimeout(() => { if (openRef.current.length && cardRef.current) breatheOpen(cardRef.current); }, light ? LIGHT.ms : 0);
      });
    }));
  }, []);
  /** a save is starting: a running landing ends at once (it never stacks), and the footer's words are noted */
  const landStart = useCallback(() => {
    const f = cardRef.current;
    if (!f) return;
    finishAll(f);
    for (const a of settling.current) { try { a.finish(); } catch { a.cancel(); } }
    settling.current = [];
    const ft = f.querySelector<HTMLElement>("[data-acv2='foot']");
    footWas.current = ft ? { text: ft.textContent ?? "", h: ft.offsetHeight } : null;
  }, []);
  const editing = open.length > 0;
  /* Card offers v1 — the panel deepens its scrim while anything is being edited (and lets it go when the card goes) */
  useEffect(() => {
    if (p.preview) return undefined;
    window.dispatchEvent(new CustomEvent(CARD_EDITING_EVENT, { detail: editing }));
    return () => { if (editing) window.dispatchEvent(new CustomEvent(CARD_EDITING_EVENT, { detail: false })); };
  }, [editing, p.preview]);
  const form = useAgentForm({
    mode: "edit", agent: a, personal: kit?.personal ?? [], agents: kit?.agents ?? [],
    alsoFor: kit?.alsoFor ?? (() => []),
    /* the whole-draft save is not offered on the card (each section saves its own fields: `saveSec`) */
    onSave: async () => ({ ok: false, error: "Save a section with its tick." }),
    onLeave: () => setOpen([]),
  });
  const resetRef = useRef(form.reset);
  resetRef.current = form.reset;
  const formRef = useRef(form);
  formRef.current = form;
  /** what a section's fields differ by now */
  const secChanged = (k: Sec262, f = form) => f.changed.filter((c) => SEC_FIELDS[k].includes(c));
  const dirtySecs = open.filter((k) => secChanged(k).length > 0);
  const dirty = dirtySecs.length > 0;
  /* ── Card offers v1 · what an edit of "How {first} works" does to the queries already out, asked as a choice ──────
     The two choices live while that section is open: they start on Update and on the close offer's suggestion, and reset
     when it closes. While the slider is dragged the offer holds still and settles on release. Only the section's own
     fields make the offer (a part draft: the base with How's fields from the draft). */
  const howOpen = open.includes("how");
  const [rtChoice, setRtChoice] = useState<RtChoice>("update");
  const [closeChoice, setCloseChoice] = useState<CloseChoice | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => { if (!howOpen) { setRtChoice("update"); setCloseChoice(null); setDragging(false); } }, [howOpen]);
  const partOf = useCallback((k: Sec262, f: typeof form): CardDraft => ({ ...f.base, ...pickDraft(f.d, SEC_FIELDS[k]) }), []);
  const settled = useRef<CardOffers | null>(null);
  const howPart = partOf("how", form);
  const howDirty = howOpen && changedFields(form.base, howPart).length > 0;
  const offersNow = useMemo<CardOffers | null>(() => {
    if (!howDirty || !kit) return null;
    return cardOffers(a, toContactDraft(a, form.base, howPart), p.queries, p.nowMs, { close: closeChoice, titleOf: p.titleOf });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- howPart is derived from form.base and form.d
  }, [howDirty, kit, form.base, form.d, a, p.queries, p.nowMs, closeChoice, p.titleOf]);
  if (!dragging) settled.current = offersNow;
  const offers = dragging ? settled.current : offersNow;
  const plan = offers ? offerPlan(offers, rtChoice, closeChoice) : null;
  const planRef = useRef<OfferPlan | null>(null);
  planRef.current = plan;
  /* while How is open there is always a kit, so a press on the slider holds the offer even before the draft differs */
  const offerKit: OfferKit | null = howOpen ? {
    o: offers ?? { quiet: [] }, rt: rtChoice, close: closeChoice, setRt: setRtChoice, setClose: setCloseChoice, onDrag: setDragging,
    weeks: form.d.weeks ?? null, nrn: form.d.nrn === true,
  } : null;
  /* the city offer's "Keep" answers, while Contact details is open */
  const [geoKept, setGeoKept] = useState<ReadonlySet<string>>(() => new Set());
  const contactOpen = open.includes("contact");
  useEffect(() => { if (!contactOpen) setGeoKept(new Set()); }, [contactOpen]);
  /* a problem a section's tick met (its own fields' problems, or a refused save), shown under its heading */
  const [secErr, setSecErr] = useState<Partial<Record<Sec262, string>>>({});
  const [busy, setBusy] = useState<Sec262 | "all" | null>(null);
  /* a new agent: nothing open, a fresh draft */
  /* Add agent v1 — only on a REAL change of agent (paging): a mount re-run (StrictMode runs mount effects twice) must not
     close the sections a door's ask has just opened */
  const shownId = useRef(a.id);
  useEffect(() => {
    if (shownId.current === a.id) return;
    shownId.current = a.id;
    setOpen([]); setSecErr({}); resetRef.current(a);
  }, [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /** open one section in place (beside any already open), its fields re-read from the agent as it is now; focus goes to
   *  its first control, or to the field asked for */
  const openSec = (k: Sec262, field?: string, focus?: "website" | "email") => {
    if (!kit) { p.onEdit(undefined, SEC_FOCUS[k]); return; }
    opened.current = { k, field, focus };
    setRevealSeq((n) => n + 1);
    setTab("profile");
    const cur = openRef.current;
    if (cur.includes(k)) return;
    if (!cur.length) resetRef.current(a);
    else form.rebase(SEC_FIELDS[k], draftOf(a, kit.personal));
    setSecErr((e) => ({ ...e, [k]: undefined }));
    setOpen([...cur, k]);
  };
  /** Contact details, from the name's pencil, + Add email / + Add a website, and every door that asks for "who" */
  const openAll = (focus?: "website" | "email") => openSec("contact", undefined, focus);
  /* Add agent v1 Phase 5 — a door's ask: open at its section (Contact details for "who"), or the Notes tab, once per seq */
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
    /* answers carried over (Housekeeping's "Edit on {first}'s card") land on the fresh draft, unsaved, and open the
       sections they belong to */
    if (ask0.prefill && Object.keys(ask0.prefill).length) {
      const pf = ask0.prefill;
      window.setTimeout(() => {
        for (const k of SEC_ORDER) if (Object.keys(pf).some((f) => SEC_FIELDS[k].includes(f as keyof CardDraft))) openSec(k);
        window.setTimeout(() => formRef.current.set(pf), 0);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per ask (its seq)
  }, [ask0?.seq, kit, a.id]);
  const isOpen = (k: Sec262) => open.includes(k);

  /** a section's tick: its own fields through the built save path (its offer's choice with it), then it closes; the other
   *  open sections keep their drafts. Nothing changed: it just closes. Returns what was saved, or null. */
  const saveSec = async (k: Sec262, silent = false): Promise<{ parts: string[]; undo?: () => Promise<boolean>; plan: OfferPlan | null } | "none" | null> => {
    const f = formRef.current;
    if (!kit) return null;
    const part = partOf(k, f);
    const ch = changedFields(f.base, part);
    if (!ch.length) { setOpen((cur) => cur.filter((x) => x !== k)); return "none"; }
    const probs = problemsOf(part);
    const bad = SEC_PROBLEMS[k].map((q) => probs[q]).find(Boolean) ?? (k === "contact" && f.dup ? `${f.dup.name} is already on your list` : null);
    if (bad) { setSecErr((e) => ({ ...e, [k]: bad })); return null; }
    const secPlan = k === "how" ? planRef.current : null;
    const parts = ch.map((c) => PART_OF[c]).filter((x): x is string => !!x);
    const r = await kit.onSave(part, f.base, secPlan, { n: changeCount(ch), section: secName(k), silent, onUndo: () => landUndo(parts) });
    if ("error" in r) { setSecErr((e) => ({ ...e, [k]: `Couldn’t save: ${r.error}` })); return null; }
    formRef.current.commit(SEC_FIELDS[k], part);
    setSecErr((e) => ({ ...e, [k]: undefined }));
    setOpen((cur) => cur.filter((x) => x !== k));
    return { parts, undo: r.undo, plan: secPlan };
  };
  /** an Undo of a saved section (or a Save all): v163's undo — the card sinks back and the light runs round the other way;
   *  the values going back fade in */
  const landUndo = (parts: readonly string[] = []) => { landStart(); land(parts, { kind: "undo" }); };
  /** a tick: the frame has pressed in at the pointer's press (`pressAtPointer`); the save runs at the click (`pressThen`);
   *  it pops when the save lands, and eases back with no pop when it fails or nothing changed (`pressBack`) */
  const tick = async (k: Sec262) => {
    if (busy) { pressBack(cardRef.current); return; }
    landStart();
    setBusy(k);
    const r = await saveSec(k);
    setBusy(null);
    if (r && r !== "none") land(r.parts);
    else pressBack(cardRef.current);
  };
  const tickPress = (k: Sec262) => ({
    onPointerDown: () => pressAtPointer(cardRef.current),
    onTick: () => pressThen(cardRef.current, () => void tick(k)),
  });
  /** a section's cross: its changes go, it closes; no question, and the snackbar's Undo brings the draft back */
  const cross = (k: Sec262) => {
    const f = formRef.current;
    const had = secChanged(k, f);
    const prev = pickDraft(f.d, SEC_FIELDS[k]);
    f.revert(SEC_FIELDS[k]);
    setSecErr((e) => ({ ...e, [k]: undefined }));
    setOpen((cur) => cur.filter((x) => x !== k));
    if (had.length) {
      showToast({ message: `Changes to ${secName(k)} discarded`, undo: async () => {
        opened.current = { k };
        setRevealSeq((n) => n + 1);
        setTab("profile");
        setOpen((cur) => (cur.includes(k) ? cur : [...cur, k]));
        window.setTimeout(() => formRef.current.set(prev), 0);
      } });
    }
  };
  /** Save all: each changed section in turn; one snackbar for them all, whose Undo puts every snapshot back */
  const saveAll = async (): Promise<boolean> => {
    const ks = openRef.current.filter((k) => secChanged(k, formRef.current).length > 0);
    const saved: { k: Sec262; undo?: () => Promise<boolean>; parts: string[]; plan: OfferPlan | null }[] = [];
    landStart();
    setBusy("all");
    for (const k of ks) {
      const r = await saveSec(k, true);
      if (r === null) { setBusy(null); pressBack(cardRef.current); return false; }
      if (r !== "none") saved.push({ k, ...r });
    }
    setBusy(null);
    setOpen([]);
    if (!saved.length) pressBack(cardRef.current);
    if (saved.length) {
      const allParts = saved.flatMap((s) => s.parts);
      land(allParts);
      const undos = saved.map((s) => s.undo);
      const plan0 = saved.find((s) => s.plan)?.plan ?? null;
      const message = sectionsSavedWords(saved.map((s) => secName(s.k)), m.first, plan0);
      showToast({ message, ...(undos.every(Boolean) ? { undo: async () => {
        let ok = true;
        for (const u of [...undos].reverse()) ok = (await u!()) && ok;
        if (ok) landUndo(allParts);
        showToast({ message: UNDONE_WORDS });
      } } : {}) });
    }
    return true;
  };
  const closeAll = useCallback(() => { setOpen([]); setSecErr({}); }, []);

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

  /* revealing and focus: a section opened scrolls into view only by what it needs (plus 90px of air), or its heading
     comes to 70px below the band when it was hidden; focus goes to its first control (or the field asked for) without
     scrolling */
  const opened = useRef<{ k: Sec262; focus?: "website" | "email"; field?: string } | null>(null);
  /* a reveal asked for while the section is already open changes no state: this makes it a new ask */
  const [revealSeq, setRevealSeq] = useState(0);
  useEffect(() => {
    const o = opened.current;
    const sc = scrollRef.current;
    if (!o || !sc) return;
    opened.current = null;
    const el = secEl(sc, o.k);
    if (!el) return;
    /* Agent card v2 — a fact box's "Add" lands in that field of "How {first} works" */
    const field = o.focus ? el.querySelector<HTMLInputElement>(`input[data-ae='${o.focus}']`)
      : o.field ? el.querySelector<HTMLInputElement>(`[data-f='${o.field}'] input, [data-f='${o.field}'] button`)
      : el.querySelector<HTMLInputElement | HTMLTextAreaElement>(".acv21-body textarea, .acv21-body input:not([type='hidden']), .acv21-body button");
    if (field) { field.focus({ preventScroll: true }); const n = field.value?.length ?? 0; try { field.setSelectionRange(n, n); } catch { /* not a text field */ } }
    /* Card offers v1 — + Website / + Email: the field itself, brought into view in the card's scroller */
    if (o.focus && field) {
      const fr = field.getBoundingClientRect(), b = sc.getBoundingClientRect();
      if (fr.top < b.top + 70 || fr.bottom > b.bottom - 90) sc.scrollTop += fr.top - b.top - Math.max(70, (b.height - fr.height) / 2);
      return;
    }
    const r = el.getBoundingClientRect(), b = sc.getBoundingClientRect();
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let by = 0;
    /* a heading flush with the top (to within a pixel: layout lands on fractions) is in view, not hidden */
    if (r.top < b.top - 1) by = r.top - b.top - 70;
    else if (r.bottom > b.bottom) by = Math.min(r.bottom - b.bottom + 90, r.top - b.top - 70);
    if (by) sc.scrollBy({ top: by, behavior: reduce ? "auto" : "smooth" });
  }, [open, revealSeq]);

  /* THE RUST BAR: ✕, Esc, paging, a tab, another row and leaving the page all ask; with unsaved changes the rust bar takes
     the footer's place and nothing else happens until Keep editing, Discard or Save all. With nothing unsaved, leaving
     just closes the open sections. */
  const [guard, setGuard] = useState<{ run: () => void } | null>(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const bypass = useRef(false);
  const ask = useCallback((run: () => void): boolean => {
    if (bypass.current) return true;
    if (!dirtyRef.current) { if (openRef.current.length) closeAll(); return true; }
    setGuard({ run });
    return false;
  }, [closeAll]);
  const discardThen = (run: () => void) => {
    setGuard(null);
    bypass.current = true;
    for (const k of openRef.current) formRef.current.revert(SEC_FIELDS[k]);
    closeAll();
    run();
    window.setTimeout(() => { bypass.current = false; }, 0);
  };
  const saveAllThen = async (run: () => void) => {
    if (!(await saveAll())) return;
    setGuard(null);
    bypass.current = true;
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
    l.current = dirty ? () => { if (ask(() => kit!.resumePick())) kit!.resumePick(); } : null;
    return () => { if (l.current) l.current = null; };
  }, [kit, dirty, ask]);
  /* leaving the page (the tab or the window) */
  useEffect(() => {
    if (!dirty) return undefined;
    const on = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", on);
    return () => window.removeEventListener("beforeunload", on);
  }, [dirty]);
  const goStep = (d: -1 | 1) => { if (ask(() => p.onStep(d))) p.onStep(d); };
  const goTab = (t: Tab) => { if (t === tab) return; if (ask(() => setTab(t))) setTab(t); };
  /* ⌘/Ctrl + Enter saves the section the cursor is in */
  const tickRef = useRef(tick);
  tickRef.current = tick;
  useEffect(() => {
    const frame = scrollRef.current?.closest<HTMLElement>("[data-apc='frame']");
    if (!frame) return undefined;
    const on = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
      const k = (e.target as Element | null)?.closest?.<HTMLElement>("[data-cl262='sec'][data-editing]")?.dataset.k as Sec262 | undefined;
      if (!k) return;
      e.preventDefault();
      void tickRef.current(k);
    };
    frame.addEventListener("keydown", on);
    return () => frame.removeEventListener("keydown", on);
  }, []);
  /* Agent card v2.1 Phase 4 — THE BREATH: a section opening straightens the card, and the rim breathes (breatheOpen: 300ms
     after the straightening) on the frame's ::before, with v163's tint in the border's colour; a keystroke in an open
     section rests it (breatheType); the last section closing eases it to rest (breatheClose). Nothing inside moves. */
  useEffect(() => {
    const f = cardRef.current;
    if (!f || p.preview) return undefined;
    if (editing) breatheOpen(f); else breatheClose(f);
    return undefined;
  }, [editing, p.preview]);
  useEffect(() => () => { if (cardRef.current) breatheClose(cardRef.current); }, []);
  useEffect(() => {
    const f = cardRef.current;
    if (!f || p.preview) return undefined;
    const onKey = (e: KeyboardEvent) => { if ((e.target as Element | null)?.closest?.("[data-acv21='open']")) breatheType(f); };
    /* a star and Add note press in at the pointer as a tick does; they hold no colour unless a section is open */
    const PRESSED = "[data-cl262='stars'] [data-star], [data-qc158='add-note']";
    const tint = () => openRef.current.length > 0;
    const onDown = (e: PointerEvent) => { const t = (e.target as Element | null)?.closest?.<HTMLButtonElement>(PRESSED); if (t && !t.disabled) pressAtPointer(f, { tint: tint() }); };
    const onClick = (e: MouseEvent) => { const t = (e.target as Element | null)?.closest?.<HTMLButtonElement>(PRESSED); if (t && !t.disabled) pressThen(f, () => undefined, false, { tint: tint() }); };
    f.addEventListener("keydown", onKey, true);
    f.addEventListener("pointerdown", onDown, true);
    f.addEventListener("click", onClick, true);
    return () => { f.removeEventListener("keydown", onKey, true); f.removeEventListener("pointerdown", onDown, true); f.removeEventListener("click", onClick, true); };
  }, [p.preview]);
  /* Esc while editing: the rust bar up means Keep editing; changes ask; no changes closes the open sections */
  useEscapeLayer(editing || !!guard, () => {
    if (guard) { setGuard(null); return; }
    if (dirtyRef.current) { setGuard({ run: () => {} }); return; }
    closeAll();
  }, ESC_LEVEL.card);

  /* ══ Agent card v2 · the face ══════════════════════════════════════════════════════════════════════════════════ */
  const tone = acTone(x);
  const col = acColours(tone);
  /* Agent card v2.1 — the border breathes and lights in the colour of the agent's query (v163's rim for its stage), and in
     slate when there is no query */
  const rim = tone === "nq" ? NO_QUERY_RIM : { rim: STAGE_COLOURS[tone].rim, rimHi: STAGE_COLOURS[tone].rimHi };
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
    landStart();
    /* Agent card v2.1 — a star pops with no light (it is not a section's save); the colour it held, if a section is open, fades */
    void p.edit.save({ rating: n }).then((ok) => { if (ok) land(["band"], { light: false }); else pressBack(cardRef.current); });
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
      {/* Agent card v2.1 — editing is by section only: the band has no pencil */}
      {p.preview ? null : <>
        <span className="ag-pos" data-cl24="pos" data-acv2="pos">{p.index + 1} / {p.total}</span>
        <button type="button" className="qc152-x" data-cl262="prev" data-cl24="prev" aria-label="Previous agent" title="Previous agent" disabled={p.index <= 0} onClick={() => goStep(-1)}>{IC.l}</button>
        <button type="button" className="qc152-x" data-cl262="next-agent" data-cl24="next" aria-label="Next agent" title="Next agent" disabled={p.index >= p.total - 1} onClick={() => goStep(1)}>{IC.r}</button>
        <button type="button" className="qc152-x" data-cl262="close" data-cl24="close" aria-label="Close the agent" title="Close" onClick={() => (p.onClose ?? requestCardClose)()}>✕</button>
      </>}
    </div>
  );
  /* Agent card v2.1 Phase 1 — the head: the name, the agency, the place (its flag from the stored country, never the city),
     and the contact line under it (the email as its address with a quiet copy button; the website as its address).
     Phase 2 — while Contact details is open the head shows the draft as it changes, flag included. */
  const cd = contactOpen ? form.d : null;
  const hv: HeadValues = cd
    ? { name: cd.name, agency: cd.agency, agencyUnknown: cd.agencyUnknown, country: cd.country, city: cd.city, email: cd.email, website: cd.website }
    : { name: a.name ?? "", agency: a.agency ?? "", agencyUnknown: a.agencyUnknown === true, country: a.country ?? "", city: a.city ?? "", email, website: site };
  const hName = hv.name.trim() || hv.agency.trim() || (cd ? "Name not added" : name);
  const hAgency = hv.name.trim() ? (hv.agency.trim() || (hv.agencyUnknown ? "Agency unknown" : "")) : "";
  const place = placeOf(hv);
  const hEmail = hv.email.trim(), hSite = hv.website.trim();
  const copyEmail = () => { void navigator.clipboard?.writeText(hEmail).then(() => showToast({ message: "Email address copied" }), () => {}); };
  const quiet = p.preview || !!cd;
  const head = (
    <div className="ag-head" data-acv2="head" data-acv2-part="head" data-live={cd ? "" : undefined} data-qc168-host={quiet ? undefined : ""}>
      <div className="qc152-agent" data-acv2="head-row">
        <span className={`qc152-disc acv2-disc${tone === "nq" ? " nq" : tone === "closed" ? " cl" : ""}`} data-acv2="disc" data-tone={tone} aria-hidden="true"
          style={tone === "nq" ? undefined : { boxShadow: `0 0 0 2.5px #fff, 0 0 0 4.5px ${col.edge}` }}>{initials}</span>
        <div className="qc152-who">
          <div className="ag-nmrow"><h2 className="qc152-nm qcv-open-nm" data-apc="name" data-acv2="name">{hName}</h2>
            {quiet ? null : <EditPen label={`${m.first}’s name and contact details`} onOpen={() => openSec("contact")} data={{ "data-cl262": "pen", "data-k": "contact" }} />}</div>
          {hAgency ? <div className="qc152-ag" data-acv2="agency">{hAgency.toUpperCase()}</div> : null}
          {place.text ? (
            <div className="ag-loc" data-acv2="loc">
              {place.flag ? <span className={`ag-flag ${place.flag}`} data-acv21="flag" data-country={place.iso ?? ""} role="img" aria-label={countryName(place.iso) ?? ""} /> : null}
              <span data-acv21="place">{place.text}</span>
            </div>
          ) : null}
        </div>
        <span className={`qc152-pill${tone === "nq" ? " nq" : ""}`} data-qc152="pill" data-acv2="pill" data-stage={tone === "nq" ? undefined : tone} data-tone={tone}>
          <span className="qc152-cap">{pill.status ? <StatusDot status={pill.status} overrideSize={17} tone="ink" decorative /> : NQ16}</span><span>{pill.word}</span>
        </span>
      </div>
      {hEmail || hSite || !quiet ? (
        <div className="ag-contact" data-acv2="contact" data-acv2-part="contact">
          {hEmail ? (
            <span className="ag-mail" data-acv21="mail">{MAIL15}<span data-acv21="email">{hEmail}</span>
              {cd ? null : <button type="button" className="ag-copy" data-acv21="copy" aria-label={`Copy ${m.first}’s email address`} title="Copy the email address" onClick={copyEmail}>{COPY}</button>}</span>
          ) : quiet ? null : <button type="button" className="ag-addc" data-acv2="add-email" data-k="email" onClick={() => openAll("email")}>+ Add email</button>}
          {hSite ? (
            cd ? <span className="ag-web" data-acv21="web">{GLOBE15}<span>{siteWords(hSite)}</span></span>
              : <a className="ag-web" data-acv21="web" href={hrefFor(hSite) ?? undefined} target="_blank" rel="noreferrer">{GLOBE15}<span>{siteWords(hSite)}</span></a>
          ) : quiet ? null : <button type="button" className="ag-addc" data-acv2="add-website" data-k="website" onClick={() => openAll("website")}>+ Add a website</button>}
        </div>
      ) : null}
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
        <button key={t} type="button" role="tab" data-cl262="tab" data-cl24="tab" data-tab={t} aria-selected={tab === t} onClick={() => goTab(t)}>
          {t === "profile" ? "Profile" : t === "history" ? "History" : "Notes"}
        </button>
      ))}
    </div>
  );

  /* ── Profile: QcAgent158's parts, in v2.1's order (how they work, wishlist, genres, what they ask for); a section with
     nothing in it is not drawn until it is opened ── */
  const gaps = p.gaps && p.gaps.n > 0 ? p.gaps : null;
  const fin = gaps ? finishItems(gaps.keys ?? []) : [];
  const SEC_PEN: Record<Sec262, string> = { contact: `${m.first}’s name and contact details`, how: `how ${m.first} works`, wishlist: "the wishlist", genres: "genres", materials: `what ${m.first} asks for` };
  /* Agent card v2.2 — each section's pencil is the query card's (QcEdit168 EditPen): a 26px disc at the right end of the
     heading (the fact boxes': their top-right corner), shown on hover and on keyboard focus within; it moves nothing */
  const penFor = (k: Sec262) => (p.preview ? null : <EditPen label={SEC_PEN[k]} onOpen={() => openSec(k)} data={{ "data-cl262": "pen", "data-k": k }} />);
  /* the value itself opens its section (a faint edge on hover); a button or link inside a value keeps its own action */
  const doorOf = (k: Sec262): Record<string, unknown> => (p.preview || !kit ? {} : {
    "data-door": k,
    onClick: (e: React.MouseEvent) => { if ((e.target as Element).closest("button, a, input, textarea, [role='button']")) return; openSec(k); },
  });
  const sec = (k: Sec262) => { const t = tickPress(k); return { k, label: secName(k), err: secErr[k], busy: busy != null, onCross: () => cross(k), onTick: t.onTick, onTickDown: t.onPointerDown }; };
  const factsShown = factBoxesShown(boxes);
  /* the fact boxes over the draft while How is open: the draft through the save's own patch, read by the same boxes */
  const draftBoxes = howOpen ? factBoxes(applyPatch(a, cardPatch(a, form.base, howPart, new Date(p.nowMs).toISOString())), (howPart.door ?? x.door) as typeof x.door) : boxes;
  const boxRow = (list: typeof boxes, live: boolean) => (
    <div className="nx-boxes" data-qc158="boxes" data-acv2="facts" data-acv2-part="facts" {...(live ? {} : doorOf("how"))}>
      {list.map((b) => <NxBox key={b.k} k={b.k} label={b.label} value={b.value ?? "Not known yet"}
        /* Agent card v2 ruling 3 — an unknown box carries a small "Add" to that field of "How {first} works" */
        sub={b.value ? b.sub : p.preview || live ? null : <button type="button" className="nx-lk acv2-boxadd" data-acv2="box-add" data-k={b.k}
          onClick={() => (kit ? openSec("how", BOX_FIELD[b.k]) : p.onEdit("work", b.k === "method" ? "method" : b.k === "door" ? "door" : "reply"))}>Add</button>}
        extra={b.value ? undefined : { "data-unknown": "" }} />)}
    </div>
  );
  const profile = (
    <div className="nx acv2-pro" data-cl262="profile" data-cl24="pane" data-acv2="profile">
      {isOpen("contact") && kit ? (
        <OpenSec {...sec("contact")} heading="Contact details">
          <EditContact form={form} agent={a} kit={kit} geo={{ kept: geoKept, keep: (key) => setGeoKept((s) => new Set([...s, key])) }} />
        </OpenSec>
      ) : null}
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
      {isOpen("how") && kit ? (
        <OpenSec {...sec("how")} heading={<>How {m.first} works</>}>
          {boxRow(draftBoxes, true)}
          <div className="ag-ctl"><EditHow form={form} agent={a} kit={kit} first={m.first} offers={offerKit} /></div>
        </OpenSec>
      ) : factsShown ? (
        <section className="acv2-sec ag-sec" data-cl262="sec" data-k="how" data-acv2="facts-sec" data-qc168-host="">
          {penFor("how")}
          {boxRow(boxes, false)}
        </section>
      ) : null}
      {isOpen("wishlist") ? (
        <OpenSec {...sec("wishlist")} heading={<>Wishlist <em>in {m.first}’s words</em></>}><EditWishlist form={form} /></OpenSec>
      ) : wish ? (
        <section className="acv2-sec ag-sec" data-cl262="sec" data-k="wishlist" data-qc158="wishlist" data-acv2="wishlist" data-acv2-part="wishlist" data-qc168-host="">
          <h4>Wishlist <em>in {m.first}’s words</em>{penFor("wishlist")}</h4>
          <p className="nx-quote" data-cl262="wishlist" {...doorOf("wishlist")}>{wish}</p>
        </section>
      ) : null}
      {isOpen("genres") && kit ? (
        <OpenSec {...sec("genres")} heading={<>Genres {m.first} takes</>}><EditGenres form={form} kit={kit} isHit={p.genreHit} /></OpenSec>
      ) : genres.length ? (
        <section className="acv2-sec ag-sec" data-cl262="sec" data-k="genres" data-acv2="genres" data-acv2-part="genres" data-qc168-host="">
          <h4>Genres {m.first} takes{genres.some((g) => p.genreHit(g)) ? <span className="r" data-acv2="yours">includes yours</span> : null}{penFor("genres")}</h4>
          <div className="nx-chips" data-cl262="genres" {...doorOf("genres")}>
            {[...genres.filter((g) => p.genreHit(g)), ...genres.filter((g) => !p.genreHit(g))].map((g) => (
              p.genreHit(g)
                ? <span key={g} className="nx-chip" data-cl262="genre" data-hit=""><span className="nx-tick" aria-hidden="true">{TICK}</span>{p.genreWord(g)}</span>
                : <span key={g} className="nx-chip no" data-cl262="genre">{p.genreWord(g)}</span>
            ))}
          </div>
        </section>
      ) : null}
      {isOpen("materials") ? (
        <OpenSec {...sec("materials")} heading={<>What {m.first} asks for <em data-acv21="tick-all">tick all that apply</em></>}><EditMaterials form={form} /></OpenSec>
      ) : asks.length ? (
        <section className="acv2-sec ag-sec" data-cl262="sec" data-k="materials" data-qc158="asks" data-acv2="asks" data-acv2-part="asks" data-qc168-host="">
          <h4>What {m.first} asks for{penFor("materials")}</h4>
          <ul className="nx-list" {...doorOf("materials")}>{asks.map((c) => (
            <li key={c.label} data-acv2="ask"><MaterialItemIcon kind={c.icon} size={20} />{c.label}{c.qty ? <span className="r">{c.qty}</span> : null}</li>
          ))}</ul>
        </section>
      ) : null}
      <div className="nx-foot" data-acv2="profile-foot">
        <span className="ag-added" data-cl262="added">{added ? `Added ${added}` : "Added"}</span>
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
        onAdd={(text) => { landStart(); void onAddNote(text).then((ok) => { if (ok) { land([], { light: false }); showToast({ message: `Noted on ${m.first}’s card` }); } else { pressBack(cardRef.current); showToast({ message: "Couldn’t save that note. Try again." }); } }); }}
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
      primary={ft.button ? { label: ft.button.label, tone: ft.button.tone, act: ft.button.act.kind, run: () => { const b = ft.button!.act; if (ask(() => runAct(b))) runAct(b); }, hook: { "data-acv2": "foot-btn", "data-cl24": "call-btn" } } : null}
      others={[ft.link ? { label: ft.link.label, act: ft.link.act.kind, run: () => { const l = ft.link!.act; if (ask(() => runAct(l))) runAct(l); }, hook: { "data-acv2": "foot-link" } } : null]}
      outer={{ "data-acv2": "foot", "data-row": ft.row }} />
  );
  return (
    <div ref={cardRef} className={`cl262-card apc acv2${editing ? " is-editing" : ""}${p.preview ? " is-preview" : ""}`} data-cl262="card" data-apc="card" data-acv2="card"
      data-tone={tone} data-stand={x.stand} data-agent-id={a.id} data-qc163-rim={rim.rim} data-qc163-rim-hi={rim.rimHi}>
      <div className="apc-frame acv2-frame" data-apc="frame" data-acv2="frame">
        <div className="qc149c qcv-legacy qc152 acv2-qc" data-acv2="qc"
          style={{ ["--band" as string]: col.band, ["--tint" as string]: col.tint, ["--edge" as string]: col.edge, ["--mark" as string]: col.mark, ["--fdisc" as string]: tone === "nq" ? "#f3f6f9" : col.band } as React.CSSProperties}>
          <div className="qc152-in">
            {band}
            {head}
            {qbox}
            {tabs}
            <div ref={scrollRef} className="qc152-body" role="tabpanel" data-qc152="body" data-apc="scroll" data-cl262="scroll" data-acv2="body" data-tab={tab}>{body}</div>
            {/* Agent card v2.1 — no save bar: the footer stays in view while sections are open, and the rust bar takes its
                place only when leaving with something unsaved */}
            {guard ? (
              <div className="ag-savewrap" data-acv2="save">
                <GuardBar names={dirtySecs.map(secName)} busy={busy === "all"} problem={Object.values(secErr).find(Boolean) ?? null}
                  onKeep={() => setGuard(null)} onDiscard={() => { const g = guard; discardThen(g.run); }}
                  onSaveAllDown={() => pressAtPointer(cardRef.current)} onSaveAll={() => { const g = guard; pressThen(cardRef.current, () => void saveAllThen(g.run)); }} />
              </div>
            ) : footer}
          </div>
        </div>
      </div>
    </div>
  );
};
