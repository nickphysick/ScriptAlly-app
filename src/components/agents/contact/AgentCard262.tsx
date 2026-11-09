/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 (design-refs/contact-list-v26-2/, screens 01–03, 09) — THE AGENT CARD AS THE LANDING PAGE'S CARD:
 * `AgentPaperCard`'s panel variant, filled with the Contact list's agent.
 *
 *   band       the status chip ("Your move · Offer"), the stars (click to set), edit and ✕ — #5e7189 for every agent
 *   head       the 60px disc by who it's with, the name, the agency, "{City} · replies in about {n} weeks", Website and
 *              Email (a missing one is a small outlined "+ Website" / "+ Email")
 *   next step  the one coloured thing on the card: the existing call box's words and verbs, toned by who it's with
 *   tabs       Profile (the landing sections and the four "How {first} works" tiles) · History (as built) · Notes
 *   gaps       ghost lines and one outlined "+ Add …" per empty section; never the dashed `apc-add`
 *   foot       "Added {d Mon yyyy}" and ‹ i / n ›
 *
 * ⚠️ IT DRAWS FROM THE PAGE'S OWN MODEL (`AgentCard24Props`, `useCardModel`): the call box, the gaps, the story and the
 *    edit kit are the ones the v25 card read, so nothing is derived twice.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { StatusDot } from "../../StatusDot";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { addedLabel } from "../../../lib/contactList";
import { hrefFor } from "../../../lib/quickAdd";
import { AgentPaperCard, PaperIcon, type PaperCardData } from "../../shared/AgentPaperCard";
import { bandWords, howTiles, materialChips, metaLine, nextStep, type NextStep } from "../../../lib/contactCard262";
import { NQ_RING } from "./ContactSheet24";
import { Notes, type AgentCard24Props, useCardModel } from "./AgentCard24";
import { YouAndStory } from "./AgentCardParts255";
import type { AgentCardField } from "../../../lib/agentCardStore";
import { requestCardClose } from "./AgentCardPanel262";
import { useAgentForm } from "../card/useAgentForm";
import { EditContact, EditGenres, EditHow, EditMaterials, EditWishlist, SaveBar } from "./AgentCard262Edit";
import "./contactV262.css";

/** the band's slate, for every agent (v26.2 ruling) */
export const CARD262_BAND = "#5e7189";

export type Sec262 = "contact" | "genres" | "wishlist" | "materials" | "how";
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
}

/** the 60px disc, coloured by who it's with */
export const Disc262: React.FC<{ stand: string; initials: string }> = ({ stand, initials }) => (
  <span className={`cl262-dsc cl262-dsc--${stand}`} data-cl262="disc" data-k={stand} aria-hidden="true">
    {initials}{stand === "you" ? <i className="cl262-bang">!</i> : null}
  </span>
);

/** the next-step box: the card's one coloured thing */
export const NextBox: React.FC<{ s: NextStep; p: AgentCard24Props }> = ({ s, p }) => {
  const run = () => {
    const a = s.button?.act;
    if (!a) return;
    if (a.kind === "journey") p.onJourney(a.mode, a.queryId);
    else if (a.kind === "log") p.onLog();
    else p.onOpenQuery(a.queryId);
  };
  return (
    <div className="cl262-next" data-cl262="next" data-tone={s.tone} data-cl24="call" data-kind={s.tone}>
      <span className="cl262-ndisc" aria-hidden="true">{s.status ? <StatusDot status={s.status} overrideSize={18} /> : NQ_RING}</span>
      <p><b data-cl262="next-bold">{s.bold}</b><i data-cl262="next-sub">{s.sub}</i></p>
      {s.button ? <button type="button" data-cl262="next-btn" data-cl24="call-btn" onClick={run}>{s.button.label}</button> : null}
    </div>
  );
};

/** a section: heading (with its pencil on hover), then its content or its ghost lines and one "+ Add …" */
const Section: React.FC<{ k: Sec262; title: string; onEdit?: () => void; editing?: React.ReactNode; children?: React.ReactNode }> = ({ k, title, onEdit, editing, children }) => (
  <section className={`apc-sec cl262-sec${editing ? " is-edit" : ""}`} data-cl262="sec" data-k={k} data-editing={editing ? "" : undefined}>
    <h5>{title}{onEdit && !editing ? <button type="button" className="cl262-pen" data-cl262="pen" data-k={k} aria-label={`Edit ${title.toLowerCase()}`} onClick={onEdit}>{IC.pen}</button> : null}</h5>
    {/* the editor's own field styles live under its `.ac` root (box-sizing and face inheritance only) */}
    {editing ? <div className="ac cl262-fx">{editing}</div> : children}
  </section>
);
const Ghost: React.FC<{ kind: "chips" | "lines"; add: string; k: Sec262; onAdd?: () => void }> = ({ kind, add, k, onAdd }) => (
  <div className="cl262-ghost" data-cl262="ghost" data-k={k}>
    <span className={`cl262-gb ${kind}`} aria-hidden="true">
      {kind === "chips" ? <><i style={{ width: 88 }} /><i style={{ width: 72 }} /><i style={{ width: 96 }} /></> : <><i style={{ width: "92%" }} /><i style={{ width: "70%" }} /></>}
    </span>
    {onAdd ? <button type="button" className="cl262-addb" data-cl262="add" data-k={k} onClick={onAdd}>{add}</button> : null}
  </div>
);

export const AgentCard262: React.FC<AgentCard262Props> = (p) => {
  const m = useCardModel(p);
  const { x } = p;
  const a = m.a;
  const [tab, setTab] = useState<Tab>("profile");
  useEffect(() => { setTab("profile"); }, [a.id]);
  const scrollRef = useRef<HTMLDivElement>(null);
  /* ── Part C · editing on the card: one draft (the editor's own form), any number of open sections ── */
  const kit = p.edit?.form ?? null;
  const [open, setOpen] = useState<Sec262[]>([]);
  const [flash, setFlash] = useState(false);
  const editing = open.length > 0;
  const closeAll = useCallback(() => setOpen([]), []);
  const form = useAgentForm({
    mode: "edit", agent: a, personal: kit?.personal ?? [], agents: kit?.agents ?? [],
    alsoFor: kit?.alsoFor ?? (() => []),
    onSave: async (d, base) => {
      if (!kit) return { ok: false, error: "Nothing to save to." };
      const r = await kit.onSave(d, base);
      if ("error" in r) return r;
      /* the sections close in place, the card leans back, and the frame flashes sage */
      closeAll();
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1200);
      return r;
    },
    onLeave: closeAll,
  });
  const resetRef = useRef(form.reset);
  resetRef.current = form.reset;
  /* a new agent: nothing open, a fresh draft */
  useEffect(() => { setOpen([]); resetRef.current(a); }, [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /** open one section (adding it to any already open); the first opening starts a fresh draft */
  const openSec = (k: Sec262) => {
    if (!kit) { p.onEdit(undefined, SEC_FOCUS[k]); return; }
    opened.current = { k, all: false };
    setTab("profile");
    setOpen((cur) => {
      if (cur.includes(k)) return cur;
      if (!cur.length) resetRef.current(a);
      return [...cur, k];
    });
  };
  /** the band's pencil: every section, and Contact details at the top */
  const openAll = () => {
    if (!kit) { p.onEdit("who"); return; }
    opened.current = { k: "contact", all: true };
    setTab("profile");
    setOpen((cur) => { if (!cur.length) resetRef.current(a); return ["contact", "genres", "wishlist", "materials", "how"]; });
  };
  const cancel = () => { setGuard(null); closeAll(); form.reset(a); };
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
  const opened = useRef<{ k: Sec262; all: boolean } | null>(null);
  useEffect(() => {
    const o = opened.current;
    const sc = scrollRef.current;
    if (!o || !sc) return;
    opened.current = null;
    const el = secEl(sc, o.all ? "contact" : o.k);
    if (!el) return;
    const field = el.querySelector<HTMLInputElement | HTMLTextAreaElement>("textarea, input[data-ae='name']");
    if (field) { field.focus({ preventScroll: true }); const n = field.value.length; try { field.setSelectionRange(n, n); } catch { /* not a text field */ } }
    if (o.all) return;
    const r = el.getBoundingClientRect(), b = sc.getBoundingClientRect();
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let by = 0;
    if (r.top < b.top) by = r.top - b.top - 70;
    else if (r.bottom > b.bottom) by = Math.min(r.bottom - b.bottom + 90, r.top - b.top - 70);
    if (by) sc.scrollBy({ top: by, behavior: reduce ? "auto" : "smooth" });
  }, [open]);

  /* THE DISCARD GUARD: ✕, Esc, paging, another row and leaving the page all ask the draft; with unsaved changes the save
     bar turns rust and nothing else happens until Keep editing or Discard is chosen */
  const [guard, setGuard] = useState<{ n: number; run: () => void } | null>(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = form.dirty;
  const bypass = useRef(false);
  const ask = useCallback((run: () => void): boolean => {
    if (bypass.current || !dirtyRef.current) return true;
    setGuard({ n: form.changed.length, run });
    return false;
  }, [form.changed.length]);
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
    if (form.dirty) { setGuard({ n: form.changed.length, run: () => {} }); return; }
    closeAll();
  }, ESC_LEVEL.card);

  const genres = a.genres ?? [];
  const wish = (a.mswlNotes ?? "").trim();
  const mats = materialChips(a);
  const tiles = howTiles(a, x.door);
  const meta = metaLine(a, x.loc);
  const step = nextStep(x, m.first, m.call, p.nowMs);
  const site = (a.website ?? "").trim();
  const email = (a.email ?? "").trim();
  const added = addedLabel(a);

  const data: PaperCardData = {
    status: x.stand === "agent" ? "querying" : x.stand, statusLabel: bandWords(x), stars: a.starRating ?? 0,
    initials: agentInitials(a).slice(0, 2), name: agentPrimary(a), agency: (a.name ?? "").trim() ? (a.agency ?? "").trim() : "",
    genres: [], materials: [],
  };
  const rate = (n: number) => { if (p.edit) void p.edit.save({ rating: n }); };

  const bandRight = (
    <span className="apc-bandr cl262-bandr">
      <span className="cl262-stars" data-cl262="stars" role="radiogroup" aria-label="Agent fit">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={(a.starRating ?? 0) === i} data-on={i <= (a.starRating ?? 0) ? "" : undefined}
            aria-label={`${i} ${i === 1 ? "star" : "stars"}`} onClick={() => rate(i)}>★</button>
        ))}
      </span>
      {all ? <span className="cl262-editing" data-cl262="editing-chip">Editing</span>
        : <button type="button" className="cl262-rb" data-cl262="edit-all" aria-label={`Edit everything about ${m.first}`} onClick={openAll}>{IC.pen}</button>}
      <button type="button" className="cl262-rb" data-cl262="close" data-cl24="close" aria-label="Close the agent" onClick={() => requestCardClose()}><span aria-hidden="true">×</span></button>
    </span>
  );
  const links = (
    <span className="cl262-links" data-cl262="links">
      {site ? <a href={hrefFor(site) ?? "#"} target="_blank" rel="noopener noreferrer" data-cl262="website"><PaperIcon kind="web" />Website</a>
        : <button type="button" className="cl262-lk" data-cl262="add-website" onClick={openAll}>+ Website</button>}
      {email ? <a href={`mailto:${email}`} data-cl262="email"><PaperIcon kind="mail" />Email</a>
        : <button type="button" className="cl262-lk" data-cl262="add-email" onClick={openAll}>+ Email</button>}
    </span>
  );
  const gaps = p.gaps && p.gaps.n > 0 ? p.gaps : null;
  const firstGap = (): Sec262 => (!genres.length ? "genres" : !wish ? "wishlist" : !mats.length ? "materials" : "how");
  const tabs = (
    <div className="cl262-tabs" role="tablist" aria-label="The agent">
      {(["profile", "history", "notes"] as const).map((t) => (
        <button key={t} type="button" role="tab" className="cl262-tab" data-cl262="tab" data-cl24="tab" data-tab={t} aria-selected={tab === t} onClick={() => setTab(t)}>
          {t === "profile" ? "Profile" : t === "history" ? "History" : "Notes"}
        </button>
      ))}
      {tab === "profile" && gaps ? (
        <span className="cl262-gapl" data-cl262="gap-line" data-n={gaps.n}>
          {gaps.n} {gaps.n === 1 ? "detail" : "details"} missing · <button type="button" data-cl262="gap-fill" onClick={() => edit(firstGap())}>Fill them in →</button>
        </span>
      ) : null}
    </div>
  );
  const profile = (
    <div className="cl262-body" data-cl262="profile" data-cl24="pane">
      {all && kit ? <Section k="contact" title="Contact details" editing={<EditContact form={form} agent={a} kit={kit} />} /> : null}
      <Section k="genres" title="Genres sought" onEdit={() => edit("genres")} editing={isOpen("genres") && kit ? <EditGenres form={form} kit={kit} isHit={p.genreHit} /> : undefined}>
        {genres.length ? (
          <span className="apc-chips" data-cl262="genres">
            {[...genres.filter((g) => p.genreHit(g)), ...genres.filter((g) => !p.genreHit(g))].map((g) => (
              <span key={g} className={`apc-chip${p.genreHit(g) ? " is-hit" : ""}`} data-cl262="genre">{p.genreWord(g)}</span>
            ))}
          </span>
        ) : <Ghost kind="chips" add="+ Add genres" k="genres" onAdd={() => edit("genres")} />}
      </Section>
      <Section k="wishlist" title="Manuscript wishlist" onEdit={() => edit("wishlist")} editing={isOpen("wishlist") ? <EditWishlist form={form} /> : undefined}>
        {wish ? <p className="apc-wish" data-cl262="wishlist">{wish}</p> : <Ghost kind="lines" add="+ Add their wishlist" k="wishlist" onAdd={() => edit("wishlist")} />}
      </Section>
      <Section k="materials" title="Materials requested" onEdit={() => edit("materials")} editing={isOpen("materials") ? <EditMaterials form={form} /> : undefined}>
        {mats.length ? (
          <span className="apc-chips" data-cl262="materials">{mats.map((c) => <span key={c.label} className="apc-mat"><PaperIcon kind={c.kind} />{c.label}</span>)}</span>
        ) : <Ghost kind="chips" add="+ Add materials" k="materials" onAdd={() => edit("materials")} />}
      </Section>
      <Section k="how" title={`How ${m.first} works`} onEdit={() => edit("how")} editing={isOpen("how") && kit ? <EditHow form={form} agent={a} kit={kit} first={m.first} /> : undefined}>
        <div className="cl262-tiles" data-cl262="tiles">
          {tiles.map((t) => (
            <span key={t.k} className={`cl262-tile${t.known ? "" : " gap"}`} data-cl262="tile" data-k={t.k} data-known={t.known ? "" : undefined}>
              {IC.tile[t.k]}
              <span>{t.known ? <>{t.pre}<b>{t.bold}</b>{t.post.split(" · ")[0]}{t.post.includes(" · ") ? <small className="cl262-tpost"> · {t.post.split(" · ").slice(1).join(" · ")}</small> : null}</> : <><i>{t.pre}</i>{t.k === "reply" ? <button type="button" className="cl262-tadd" data-cl262="tile-add" onClick={() => edit("how")}>Add</button> : null}</>}</span>
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
  const body = tab === "profile" ? profile
    : tab === "history" ? <div className="cl262-body cl262-hist" data-cl262="history" data-cl24="pane"><YouAndStory blocks={p.story?.blocks ?? []} heard={p.story?.heard ?? null} first={m.first} onOpenQuery={p.onOpenQuery} /></div>
    : <div className="cl262-body cl262-notes" data-cl262="notes" data-cl24="pane"><Notes p={p} first={m.first} /></div>;
  const foot = (
    <div className="cl262-foot" data-cl262="foot">
      <span className="cl262-added apc-meta" data-cl262="added">{IC.clock}{added ? `Added ${added}` : "Added"}</span>
      <span className="cl262-pager" data-cl24="nav">
        <button type="button" data-cl262="prev" data-cl24="prev" aria-label="Previous agent" disabled={p.index <= 0} onClick={() => goStep(-1)}>{IC.l}</button>
        <span data-cl24="pos">{p.index + 1} / {p.total}</span>
        <button type="button" data-cl262="next-agent" data-cl24="next" aria-label="Next agent" disabled={p.index >= p.total - 1} onClick={() => goStep(1)}>{IC.r}</button>
      </span>
    </div>
  );
  return (
    <AgentPaperCard variant="panel" className={`cl262-card${editing ? " is-editing" : ""}${flash ? " is-saved" : ""}`} data={data}
      panel={{
        onClose: () => (p.onClose ?? requestCardClose)(), closeLabel: "Close the agent", links, tabs, body,
        /* while editing the save bar sits above the foot, which stays: ‹ › must still be pressable, and they ask the guard */
        foot,
        afterScroll: editing ? <SaveBar form={form} guard={guard} onCancel={cancel} onSave={() => void form.save()} onKeep={() => setGuard(null)}
          onDiscard={() => { const g = guard; discardThen(g ? g.run : () => {}); }} /> : null,
        band: CARD262_BAND, bandRight, disc: <Disc262 stand={x.stand} initials={data.initials} />,
        meta: meta ? <span className="apc-meta" data-cl262="meta">{meta}</span> : null,
        afterHead: <NextBox s={step} p={p} />, scrollRef,
        scrollAttrs: { "data-cl262": "scroll", "data-tab": tab },
      }} />
  );
};
