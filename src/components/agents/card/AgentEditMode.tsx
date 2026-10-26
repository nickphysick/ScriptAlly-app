/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.2 C2 (design-refs/contact-list-v25-2/screens/09) — THE AGENT CARD IN EDIT MODE. "Edit agent" turns
 * the card itself into the editor: a navy band ("EDITING {FIRST}", ×), then four sections, each headed in Special
 * Elite with its fields labelled in mono capitals, and one foot.
 *
 *   1  Who they are             Name · Agency · City · Country · Your rating
 *   2  What {first}'s looking for Wishlist · Genres
 *   3  How to query {first}     Replies in · Response policy · Taking queries (+ Reopens) · How they take them · What to send
 *   4  How to reach {first}     Email · Website · Submission form · MSWL · Social
 *   (an existing agent)         Notes — the notes the retired centred editor kept, so none is left behind
 *
 * It replaces `AgentCardEditor` (its centred pop-up and its panel variant both): every field and rule that editor had
 * is here, its state, validation and save now living in `useAgentForm`, which every shape shares. The new-agent state
 * is this same mode with empty fields under the panel's own "Adding new agent" header (`band={false}`).
 *
 * ⚠️ NOTHING IS FREE-TYPED WHERE THE APP KEEPS A LIST: genres through the app's genre list and matcher, the country
 *    from the app's country list, the method, the policy and the door as pills, the materials as the four rows.
 * ⚠️ LEAVING WITH CHANGES ASKS, in the query drawer's own discard confirm ("Discard this? Nothing has been saved yet").
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SubmissionMethod, type Agent } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { formatDate } from "../../../lib/dates";
import { normaliseCountry } from "../../../lib/territory";
import type { AgentNote } from "../../../lib/agentNotes";
import type { AgentCardField } from "../../../lib/agentCardStore";
import type { AlsoNote } from "../../../lib/contactEdit";
import { SOCIAL_PLATFORMS } from "../../../lib/agentOptions";
import { type CardDraft, agencyOptions, cityOptions, colleagueWeeks, colleaguesOf, hostOf } from "../../../lib/cardDraft";
import type { PersonalGenre } from "../../../lib/genres";
import { Combo, CountryField, DateField, GenreField, MaterialsField, Seg, Stepper, type ComboItem } from "./cardInputs";
import { type EditorSaveResult, useAgentForm } from "./useAgentForm";
import { Tally } from "../../shared/agentRowParts";
import "./agentCard.css";
import "../../queryActions/queryDrawer.css";
import "./agentEditMode.css";

export type { EditorSaveResult };

/** the four ways in, as the pack names them (By post kept so a stored Post is never stranded) */
const METHODS: [SubmissionMethod, string][] = [
  [SubmissionMethod.EMAIL, "By email"], [SubmissionMethod.ONLINE_FORM, "Online form"],
  [SubmissionMethod.QUERY_MANAGER, "QueryManager"], [SubmissionMethod.POST, "By post"],
];
/** the country pills; Elsewhere opens the app's whole country list */
const COUNTRY_PILLS: [string, string][] = [["GB", "UK"], ["IE", "Ireland"], ["US", "US"]];
/** the Also-changes notes, by the section whose fields cause them */
const ALSO_SEC: Record<AlsoNote["field"], 1 | 2 | 3> = { who: 1, genres: 2, reply: 3, door: 3, nrn: 3 };
/** a door's field, as `data-ae` names it, for the focus a door asked for */
const FOCUS_SEL: Partial<Record<AgentCardField, string>> = {
  name: '[data-ae="name"]', agency: '[data-ae="agency"]', city: '[data-ae="city"]', country: '[data-ae="country"] button',
  email: '[data-ae="email"]', website: '[data-ae="website"]', mswl: '[data-ae="mswl"]', wishlist: '[data-ae="wishlist"]',
  genres: '[data-ae="genre-input"]', materials: '[data-ae="materials"] button', reply: '[data-ae="weeks"] button[data-d="1"]',
  nrmn: '[data-ae="nrn"] button', method: '[data-ae="method"] button', door: '[data-ae="door"] button',
};
const dmy = (ms: number) => formatDate(new Date(ms), { day: "numeric", month: "short" });

export interface AgentEditModeProps {
  mode: "edit" | "new";
  agent: Agent | null;
  prefill?: Partial<CardDraft>;
  focus?: AgentCardField;
  personal: PersonalGenre[];
  agents: readonly Agent[];
  msGenre: string | null;
  genrePool: string[];
  personalGenres: string[];
  allGenres: readonly string[];
  isHit: (g: string) => boolean;
  nowMs: number;
  alsoFor: (d: CardDraft, base: CardDraft) => AlsoNote[];
  onSave: (d: CardDraft, base: CardDraft) => Promise<EditorSaveResult>;
  /** a clean leave, or a confirmed discard */
  onLeave: () => void;
  onOpenAgent: (id: string) => void;
  onNewGenre: (typed: string) => Promise<{ ok: true; label: string } | { ok: false; reason: string }>;
  /** the stored notes (an existing agent): added, edited and deleted as they are written, outside Save changes */
  notes?: {
    stored: AgentNote[];
    earlier: string;
    onAdd: (text: string) => Promise<boolean>;
    onEdit: (id: string, text: string) => Promise<boolean>;
    onDelete: (n: AgentNote) => Promise<boolean>;
  };
  /** the navy "EDITING {FIRST}" band; off where the host draws its own head (the new-agent panel) */
  band?: boolean;
  /** the wide card lays the four sections out two by two */
  wide?: boolean;
  /** a new agent starts in the UK */
  defaultCountry?: string;
  /** Escape's level: the card's own by default */
  escLevel?: number;
  /** the host's close (its ✕ or a scrim) reaches the form's leave through this */
  bindLeave?: React.MutableRefObject<(() => void) | null>;
}

const F: React.FC<{ label: React.ReactNode; children: React.ReactNode; note?: React.ReactNode; k?: string }> = ({ label, children, note, k }) => (
  <div className="ae-f cl252-f" data-f={k}>
    <label>{label}</label>
    <div className="ae-fl">{children}{note !== undefined && note !== "" ? <span className="ae-vl" data-vl={k}>{note}</span> : null}</div>
  </div>
);

export const AgentEditMode: React.FC<AgentEditModeProps> = (p) => {
  const { mode, agent, agents, nowMs } = p;
  const form = useAgentForm({
    mode, agent, prefill: p.prefill, personal: p.personal, agents, alsoFor: p.alsoFor, onSave: p.onSave, onLeave: p.onLeave,
    defaultCountry: p.defaultCountry,
  });
  const { d, set, problems, dup, also, changed, dirty, ask, setAsk } = form;
  const first = mode === "new" ? "them" : ((agent?.name ?? "").trim().split(/\s+/)[0] || (agent?.agency ?? "").trim() || "them");
  const firstCap = mode === "new" ? "this agent" : first;

  /* ── leaving ─────────────────────────────────────────────────────────────────────────────────────────────── */
  const leaveRef = useRef(form.leave);
  leaveRef.current = form.leave;
  const askRef = useRef(ask);
  askRef.current = ask;
  useEscapeLayer(true, () => {
    if (askRef.current) { setAsk(false); return; }
    leaveRef.current();
  }, p.escLevel ?? ESC_LEVEL.card);
  useEffect(() => {
    if (!p.bindLeave) return undefined;
    const b = p.bindLeave;
    b.current = () => leaveRef.current();
    return () => { b.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bound once; the ref reads the latest leave
  }, []);

  /* ── the door's field, focused and in view at the open ───────────────────────────────────────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const genreRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  const [calSignal, setCalSignal] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const root = rootRef.current;
      if (!root) return;
      if (p.focus === "reopen") { setCalSignal((x) => x + 1); root.querySelector('[data-f="reopens"]')?.scrollIntoView({ block: "center" }); return; }
      const el = root.querySelector<HTMLElement>((p.focus && FOCUS_SEL[p.focus]) || '[data-ae="name"]');
      el?.scrollIntoView({ block: "center" });
      el?.focus({ preventScroll: true });
    }, 90);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the door's field is focused once, at the open
  }, []);

  /* ── the who section's lists (the editor's own) ──────────────────────────────────────────────────────────── */
  const [agencyQ, setAgencyQ] = useState(d.agency);
  const [cityQ, setCityQ] = useState(d.city);
  const others = useMemo(() => agents.filter((a) => a.id !== agent?.id), [agents, agent]);
  const agencies = useMemo(() => agencyOptions(others), [others]);
  const cities = useMemo(() => cityOptions(others), [others]);
  const colleagues = useMemo(() => colleaguesOf(d.agency, agents, agent?.id ?? null), [d.agency, agents, agent]);
  const peerWeeks = useMemo(() => colleagueWeeks(colleaguesOf(d.agency || agent?.agency || "", agents, agent?.id ?? null)), [d.agency, agents, agent]);
  const agencyItems = useCallback((raw: string): ComboItem[] => {
    const t = raw.trim().toLowerCase();
    const xs = agencies.filter((x) => !t || x.name.toLowerCase().includes(t)).slice(0, 8);
    const out: ComboItem[] = xs.length ? [{ kind: "group", label: "On your list" }, ...xs.map((x) => ({ kind: "opt" as const, value: x.name, label: x.name, meta: `${x.count} agent${x.count > 1 ? "s" : ""}` }))] : [];
    if (t && !agencies.some((x) => x.name.toLowerCase() === t)) out.push({ kind: "opt", value: raw.trim(), label: `+ New agency “${raw.trim()}”`, isNew: true });
    return out;
  }, [agencies]);
  const cityItems = useCallback((raw: string): ComboItem[] => {
    const t = raw.trim().toLowerCase();
    const xs = cities.filter((c) => !t || c.toLowerCase().includes(t)).slice(0, 8);
    const out: ComboItem[] = xs.length ? [{ kind: "group", label: "Cities on your list" }, ...xs.map((c) => ({ kind: "opt" as const, value: c, label: c }))] : [];
    if (t && !cities.some((c) => c.toLowerCase() === t)) out.push({ kind: "opt", value: raw.trim(), label: `Use “${raw.trim()}”`, isNew: true });
    return out;
  }, [cities]);
  const useDetails = () => {
    const c = colleagues[0];
    if (!c) return;
    const patch: Partial<CardDraft> = {};
    if ((c.city ?? "").trim()) { patch.city = c.city!.trim(); setCityQ(c.city!.trim()); }
    const cc = normaliseCountry(c.country);
    if (cc) patch.country = cc;
    if (d.weeks == null && typeof c.responseTimeWeeks === "number" && c.responseTimeWeeks > 0) patch.weeks = c.responseTimeWeeks;
    const cm = METHODS.find(([m]) => m === c.submissionMethod)?.[0];
    if (cm) patch.method = cm;
    set(patch);
  };
  const [elsewhere, setElsewhere] = useState(() => !!d.country && !COUNTRY_PILLS.some(([c]) => c === d.country));

  /* ── the notes (an existing agent only): written as they are, outside Save changes ───────────────────────── */
  const [compose, setCompose] = useState("");
  const [noteEdit, setNoteEdit] = useState<{ id: string; text: string } | null>(null);
  const [struck, setStruck] = useState<Record<string, AgentNote>>({});
  const struckRef = useRef(struck);
  struckRef.current = struck;
  const timers = useRef<Record<string, number>>({});
  const delNote = useRef(p.notes?.onDelete);
  delNote.current = p.notes?.onDelete;
  const commitDelete = useCallback((id: string) => {
    const n = struckRef.current[id];
    window.clearTimeout(timers.current[id]);
    delete timers.current[id];
    if (!n) return;
    setStruck((s) => { const next = { ...s }; delete next[id]; return next; });
    void delNote.current?.(n);
  }, []);
  /* a delete still waiting when the editor goes is carried out — closing is not an Undo */
  useEffect(() => () => {
    for (const id of Object.keys(struckRef.current)) { window.clearTimeout(timers.current[id]); void delNote.current?.(struckRef.current[id]); }
  }, []);
  const sortedNotes = useMemo(() => [...(p.notes?.stored ?? [])].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)), [p.notes?.stored]);

  /* ── the foot ────────────────────────────────────────────────────────────────────────────────────────────── */
  const summary = (() => {
    if (form.failure) return <span className="bad" data-ae="sum-bad">Couldn’t save: {form.failure}</span>;
    if (form.firstProblem) return <span className="bad" data-ae="sum-bad">{form.firstProblem}</span>;
    if (dup) return <span className="bad" data-ae="sum-bad">{`${dup.name} is already on your list`}</span>;
    if (form.carried) return "Carried over what you picked. Save when you’re done.";
    if (mode === "new") {
      const who = d.name.trim() || d.agency.trim();
      return who ? <span data-ae="sum-will">{who} will be added to your list.</span> : <span data-ae="sum-need">A name or an agency is needed</span>;
    }
    if (!dirty) return "No changes yet.";
    const moved = also.reduce((n, x) => n + x.lines.length, 0);
    return <><b>{changed.length} change{changed.length > 1 ? "s" : ""}</b>{moved ? ` · also changes ${moved} thing${moved > 1 ? "s" : ""} elsewhere` : ""}</>;
  })();

  const alsoBox = (k: 1 | 2 | 3) => {
    const mine = also.filter((n) => ALSO_SEC[n.field] === k);
    if (!mine.length) return null;
    return <div className="ae-also" data-ae={`also-${k}`}><em>Also changes</em>{mine.flatMap((n) => n.lines.map((l) => <p key={`${n.field}-${l}`}>{l}</p>))}</div>;
  };
  const linkNote = (k: "website" | "mswl" | "form") => problems[k] ? <span className="bad">{problems[k]}</span> : d[k].trim() ? <span className="ok">✓ {hostOf(d[k])}</span> : "";
  const weekText = d.weeks ? `About ${d.weeks} week${d.weeks > 1 ? "s" : ""}` : "Not known";
  const stated = { nrn: agent ? typeof agent.noResponseMeansNo === "boolean" : false };

  return (
    <div className={`ac cl252-em${p.wide ? " wide" : ""}`} data-cl252="edit-mode" data-mode={mode} ref={rootRef}>
      {p.band !== false ? (
        <div className="cl252-emband" data-cl252="edit-band">
          <span>{mode === "new" ? "New agent" : `Editing ${first}`}</span>
          <button type="button" aria-label="Close" title="Close (Esc)" data-cl252="edit-close" onClick={form.leave}>×</button>
        </div>
      ) : null}
      <div className="cl252-embody ac-body" data-cl252="edit-body"
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey || e.defaultPrevented) return;
          const t = e.target as HTMLElement;
          if (!(t instanceof HTMLInputElement) || !t.classList.contains("ac-in") || t.getAttribute("aria-expanded") === "true") return;
          e.preventDefault();
          void form.save();
        }}>
        <div className="cl252-secs">
          {/* ── 1 · who they are ── */}
          <section className="cl252-sec" data-cl252="sec" data-sec="who">
            <h3>Who they are</h3>
            <F k="name" label="Name" note={problems.name ? <span className="bad">{problems.name}</span> : dup ? (
              <span className="bad" data-ae="dup">Already on your list: <b>{dup.name}</b>{dup.agency ? ` · ${dup.agency}` : ""} <button type="button" className="ac-mini" data-ae="dup-open" onClick={() => p.onOpenAgent(dup.id)}>Open them instead</button></span>
            ) : ""}>
              <input className={`ac-in${problems.name || dup ? " bad" : ""}`} data-ae="name" value={d.name} autoComplete="off" onChange={(e) => set({ name: e.target.value })} />
            </F>
            <F k="agency" label="Agency" note={colleagues.length > 0 && d.agency.trim() ? (
              <span className="ae-hint" data-ae="agency-hint">
                <span><b>{colleagues.length} other agent{colleagues.length > 1 ? "s" : ""}</b> at {d.agency.trim()}{colleagues[0].city ? ` · ${colleagues[0].city}` : ""}{colleagues[0].responseTimeWeeks ? ` · reply in about ${colleagues[0].responseTimeWeeks} weeks` : ""}</span>
                <button type="button" className="ac-mini" data-ae="use-details" onClick={useDetails}>Use these details</button>
              </span>
            ) : ""}>
              <Combo ae="agency" value={agencyQ} placeholder="Start typing, or pick from your list"
                onType={(v) => { setAgencyQ(v); set({ agency: v }); }} items={agencyItems}
                onPick={(x) => { setAgencyQ(x.value); set({ agency: x.value }); (document.activeElement as HTMLElement | null)?.blur(); }} />
            </F>
            <F k="city" label="City">
              <Combo ae="city" value={cityQ} placeholder="e.g. London" onType={(v) => { setCityQ(v); set({ city: v }); }} items={cityItems}
                onPick={(x) => { setCityQ(x.value); set({ city: x.value }); (document.activeElement as HTMLElement | null)?.blur(); }} />
            </F>
            <F k="country" label="Country">
              <span className="ae-seg wrp cl252-pills2" role="radiogroup" aria-label="Country" data-ae="country">
                {COUNTRY_PILLS.map(([c, l]) => (
                  <button key={c} type="button" role="radio" aria-checked={!elsewhere && d.country === c} className={!elsewhere && d.country === c ? "on" : undefined}
                    data-v={c} onClick={() => { setElsewhere(false); set({ country: d.country === c ? "" : c }); }}>{l}</button>
                ))}
                <button type="button" role="radio" aria-checked={elsewhere} className={elsewhere ? "on" : undefined} data-v="elsewhere"
                  onClick={() => { setElsewhere(true); if (COUNTRY_PILLS.some(([c]) => c === d.country)) set({ country: "" }); }}>Elsewhere</button>
              </span>
              {elsewhere ? <div className="cl252-cty" data-ae="country-list"><CountryField value={d.country} onPick={(c) => set({ country: c })} /></div> : null}
            </F>
            <F k="rating" label="Your rating">
              <Tally n={d.rating} onSet={(n) => set({ rating: n })} />
            </F>
            {alsoBox(1)}
          </section>

          {/* ── 2 · what they're looking for ── */}
          <section className="cl252-sec" data-cl252="sec" data-sec="want">
            <h3>What {firstCap}’s looking for</h3>
            <F k="wishlist" label="Wishlist">
              <textarea className="ac-in cl252-wish" data-ae="wishlist" value={d.wishlist} placeholder="In their words: paste from their MSWL or agency page."
                /* the cap is on TYPING: a stored wishlist longer than 400 is kept as it is and can be cut, never grown */
                maxLength={Math.max(400, d.wishlist.length)}
                onChange={(e) => { const v = e.target.value; set({ wishlist: v.length > 400 && v.length > d.wishlist.length ? d.wishlist : v }); }} />
              <span className="ae-cnt2" data-ae="wishlist-count">{d.wishlist.length} / 400</span>
            </F>
            <div className="ae-f cl252-f" data-f="genres">
              <label>Genres</label>
              <GenreField genres={d.genres} onGenres={(g) => set({ genres: g })}
                options={{ ms: p.msGenre, pool: p.genrePool, personal: p.personalGenres, all: [...p.allGenres] }}
                isHit={p.isHit} onNew={p.onNewGenre} inputRef={genreRef} />
            </div>
            {alsoBox(2)}
          </section>

          {/* ── 3 · how to query them ── */}
          <section className="cl252-sec" data-cl252="sec" data-sec="work">
            <h3>How to query {firstCap}</h3>
            <F k="weeks" label="Replies in" note={d.weeks == null ? (
              peerWeeks ? <button type="button" className="ac-mini" data-ae="use-weeks" onClick={() => set({ weeks: peerWeeks })}>Use {peerWeeks} weeks · others at {(d.agency || agent?.agency || "").trim()}</button> : "Press + to start at 6 weeks."
            ) : <span data-ae="weeks-warn">This sets when QueryHawk suggests a nudge for your queries to {firstCap}.</span>}>
              {/* decision 9: no road back to "not known" — the minus stops at one week */}
              <Stepper ae="weeks" text={weekText} dec={d.weeks != null && d.weeks > 1} inc={d.weeks == null || d.weeks < 26}
                onStep={(dir) => set({ weeks: d.weeks == null ? (dir > 0 ? 6 : null) : Math.max(1, Math.min(26, d.weeks + dir)) })} />
            </F>
            <F k="nrn" label="Response policy">
              <span className="ae-seg wrp" role="radiogroup" aria-label="Response policy" data-ae="nrn">
                {([["no", "Always replies"], ["yes", "No response means no"]] as const).map(([v, l]) => {
                  const on = d.nrn != null && (v === "yes") === d.nrn;
                  return <button key={v} type="button" role="radio" aria-checked={on} className={on ? "on" : undefined} data-v={v} onClick={() => set({ nrn: v === "yes" })}>{l}</button>;
                })}
                {/* "Not known" is the origin: chosen while nothing is stated, and no road back once something is (decision 9) */}
                <button type="button" role="radio" aria-checked={d.nrn == null} className={d.nrn == null ? "on" : undefined} data-v="unknown"
                  disabled={stated.nrn} title={stated.nrn ? "Once stated, a response policy can be changed but not unstated" : undefined}
                  onClick={() => { if (!stated.nrn) set({ nrn: null }); }}>Not known</button>
              </span>
            </F>
            <F k="door" label="Taking queries">
              <span className="ae-seg wrp" role="radiogroup" aria-label="Taking queries" data-ae="door">
                {([["open", "Open"], ["closed", "Closed"]] as const).map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={d.door === v} className={d.door === v ? "on" : undefined} data-v={v}
                    onClick={() => {
                      if (v === "open") set({ door: "open", reopens: "" });
                      else { set({ door: "closed" }); if (d.door !== "closed") window.setTimeout(() => setCalSignal((x) => x + 1), 40); }
                    }}>{l}</button>
                ))}
                {/* an imported agent nobody has set reads "Not known"; the card only ever writes Open or Closed */}
                <button type="button" role="radio" aria-checked={d.door == null} className={d.door == null ? "on" : undefined} data-v="unknown" disabled={d.door != null}>Not known</button>
              </span>
            </F>
            {d.door === "closed" ? (
              <F k="reopens" label="Reopens">
                <DateField value={d.reopens} nowMs={nowMs} openSignal={calSignal} onPick={(v) => set({ reopens: v })} />
              </F>
            ) : null}
            <F k="method" label="How they take them">
              <Seg<SubmissionMethod> ae="method" label="How they take them" wrap value={d.method} options={METHODS} onPick={(m) => set({ method: m })} />
            </F>
            <F k="materials" label="What to send">
              <MaterialsField mats={d.mats} otherRef={otherRef}
                onMats={(m) => { const turnedOn = m.oth.on && !d.mats.oth.on; set({ mats: m }); if (turnedOn) window.setTimeout(() => otherRef.current?.focus(), 0); }} />
            </F>
            {alsoBox(3)}
          </section>

          {/* ── 4 · how to reach them ── */}
          <section className="cl252-sec" data-cl252="sec" data-sec="reach">
            <h3>How to reach {firstCap}</h3>
            <F k="email" label="Email" note={problems.email ? <span className="bad">{problems.email}</span> : d.email.trim() ? <span className="ok">✓ looks right</span> : ""}>
              <input className={`ac-in${problems.email ? " bad" : ""}`} type="email" data-ae="email" value={d.email} placeholder="name@agency.co.uk" autoComplete="off" onChange={(e) => set({ email: e.target.value })} />
            </F>
            <F k="website" label="Website" note={linkNote("website")}>
              <input className={`ac-in${problems.website ? " bad" : ""}`} data-ae="website" value={d.website} placeholder="agency.co.uk" autoComplete="off" onChange={(e) => set({ website: e.target.value })} />
            </F>
            <F k="form" label="Submission form" note={linkNote("form")}>
              <input className={`ac-in${problems.form ? " bad" : ""}`} data-ae="form" value={d.form} placeholder="querymanager.com/… or the agency’s form" autoComplete="off" onChange={(e) => set({ form: e.target.value })} />
            </F>
            <F k="mswl" label="MSWL" note={linkNote("mswl")}>
              <input className={`ac-in${problems.mswl ? " bad" : ""}`} data-ae="mswl" value={d.mswl} placeholder="manuscriptwishlist.com/…" autoComplete="off" onChange={(e) => set({ mswl: e.target.value })} />
            </F>
            <F k="social" label="Social">
              <Seg<string> ae="social-platform" label="Platform" wrap small value={d.social.platform || null}
                options={SOCIAL_PLATFORMS.map((x) => [x, x] as [string, string])} onPick={(v) => set({ social: { ...d.social, platform: v } })} />
              <input className="ac-in cl252-soc" data-ae="social" value={d.social.handle} placeholder="@handle or profile link" autoComplete="off"
                onChange={(e) => set({ social: { platform: d.social.platform || "Other", handle: e.target.value } })} />
            </F>
          </section>

          {/* ── the notes the retired centred editor kept (an existing agent) ── */}
          {mode === "edit" && p.notes ? (
            <section className="cl252-sec cl252-notes" data-cl252="sec" data-sec="notes">
              <h3>Notes about {firstCap}</h3>
              <div className="ae-note-h">Notes save as you write them; they aren’t part of Save changes.</div>
              {p.notes.earlier.trim() ? <div className="ae-note ae-note--earlier" data-ae="earlier-note"><div><small>Earlier note</small><p>{p.notes.earlier.trim()}</p></div></div> : null}
              <div className="ae-compose">
                <textarea className="ac-in" data-ae="compose" placeholder="Add a note…" value={compose} onChange={(e) => setCompose(e.target.value)} />
                <button type="button" className="ac-btn sm" data-ae="add-note" disabled={!compose.trim()}
                  onClick={async () => { const t = compose.trim(); if (!t) return; if (await p.notes!.onAdd(t)) setCompose(""); }}>Save note</button>
              </div>
              <div data-ae="notes">
                {sortedNotes.map((n) => {
                  const gone = !!struck[n.id];
                  const when = Date.parse(n.createdAt) ? dmy(Date.parse(n.createdAt)) : "";
                  if (noteEdit?.id === n.id) {
                    return (
                      <div key={n.id} className="ae-note" data-ae="note">
                        <textarea className="ac-in" data-ae="note-edit" value={noteEdit.text} autoFocus onChange={(e) => setNoteEdit({ id: n.id, text: e.target.value })} />
                        <span className="acts on">
                          <button type="button" className="ac-mini" data-ae="note-save" disabled={!noteEdit.text.trim()} onClick={async () => { if (await p.notes!.onEdit(n.id, noteEdit.text.trim())) setNoteEdit(null); }}>Save</button>
                          <button type="button" className="ac-mini" onClick={() => setNoteEdit(null)}>Cancel</button>
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={n.id} className={`ae-note${gone ? " struck" : ""}`} data-ae="note" data-note={n.id}>
                      <div><p>{n.text}</p>{when && <time>{when}</time>}</div>
                      <span className={`acts${gone ? " on" : ""}`}>
                        {gone ? (
                          <button type="button" className="ac-mini" data-ae="note-undo" onClick={() => { window.clearTimeout(timers.current[n.id]); delete timers.current[n.id]; setStruck((s) => { const next = { ...s }; delete next[n.id]; return next; }); }}>Undo</button>
                        ) : (
                          <>
                            <button type="button" className="ac-mini" data-ae="note-edit-open" onClick={() => setNoteEdit({ id: n.id, text: n.text })}>Edit</button>{" "}
                            <button type="button" className="ac-mini" data-ae="note-delete" onClick={() => { setStruck((s) => ({ ...s, [n.id]: n })); timers.current[n.id] = window.setTimeout(() => commitDelete(n.id), 6000); }}>Delete</button>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <div className="cl252-emfoot" data-cl252="edit-foot" role="status">
        <span className="cl252-sum" data-ae="sum">{summary}</span>
        <button type="button" className="cl252-b2" data-ae="cancel" data-cl252="edit-cancel" onClick={form.leave}>Cancel</button>
        <button type="button" className="cl252-b1" data-ae="save" data-cl252="edit-save" disabled={!form.canSave} onClick={() => void form.save()}>
          {mode === "new" ? "Add to your list" : "Save changes"}
        </button>
        {ask ? (
          /* the query drawer's own discard confirm */
          <div className="qad-conf" data-qad-discard data-cl252="discard">
            <span><b>Discard this?</b>Nothing has been saved yet.</span>
            <button type="button" className="keep" data-ae="keep" onClick={() => setAsk(false)}>Keep going</button>
            <button type="button" className="disc" data-ae="discard" onClick={form.discard}>Discard</button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
