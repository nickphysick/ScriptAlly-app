/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's EDITOR (Agent card v1 §4; ref design-refs/agent-card-housekeeping-v7.html,
 * Journeys "Edit: the card widens into tabs" → "Leave with changes", and "Add an agent"). The same
 * card, widened to 780, in four tabs — Contact · Wishlist · Submissions · Notes — with ONE draft
 * across them and ONE Save. The add card is this editor with three tabs (a note needs an agent).
 *
 * ⚠️ THE PANES STACK IN ONE GRID CELL, so the card never changes height between tabs (decision 1);
 * the hidden ones are `visibility: hidden`, never unmounted, so moving between tabs loses nothing.
 *
 * ⚠️ ESCAPE IS ONE HANDLER (§9): an open list or calendar closes first (each is a layer above the
 * card on the app's stack), then the foot's ask, then the editor — a dirty draft ASKS, a clean one
 * returns to the quick view. The backdrop does the same and never discards in silence.
 *
 * ⚠️ ALSO CHANGES IS COMPUTED, NEVER DESCRIBED (decision 14): the notes are `alsoChanges` — the dry
 * run through the real engine — shown inside the tab that causes them and counted in the foot.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SubmissionMethod, type Agent } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { formatDate } from "../../../lib/dates";
import { findDuplicateAgent } from "../../../lib/contactList";
import { normaliseCountry } from "../../../lib/territory";
import type { AgentNote } from "../../../lib/agentNotes";
import type { AgentCardField } from "../../../lib/agentCardStore";
import type { AlsoNote } from "../../../lib/contactEdit";
import {
  type CardDraft, type CardProblemKey, type CardTab, PROBLEM_TAB, TAB_FIELDS, agencyOptions, changedFields,
  cityOptions, colleagueWeeks, colleaguesOf, draftOf, emptyCardDraft, hostOf, linkOk, problemsOf,
} from "../../../lib/cardDraft";
import type { PersonalGenre } from "../../../lib/genres";
import { VIA } from "../../queryActions/journeys/common";
import { Combo, CountryField, DateField, GenreField, MaterialsField, Seg, Stepper, type ComboItem } from "./cardInputs";

const TABS: [CardTab, string][] = [["who", "Contact"], ["want", "Wishlist"], ["work", "Submissions"], ["notes", "Notes"]];
/** The enum's four, labelled as the drawer labels them (§5: Email · QueryManager · Online form · Post). */
const METHODS: [SubmissionMethod, string][] = [...VIA, [SubmissionMethod.POST, "Post"]];
/** The Also-changes notes, by the tab whose fields cause them. */
const ALSO_TAB: Record<AlsoNote["field"], Exclude<CardTab, "notes">> = { who: "who", genres: "want", reply: "work", door: "work", nrn: "work" };
const dmy = (ms: number) => formatDate(new Date(ms), { day: "numeric", month: "short" });

export type EditorSaveResult = { ok: true } | { ok: false; error: string };

export interface AgentCardEditorProps {
  mode: "edit" | "new";
  agent: Agent | null;
  /** answers carried over from elsewhere (Housekeeping's rail) — applied, and marked dirty */
  prefill?: Partial<CardDraft>;
  /** the writer's own genres, so stored ids read as their labels */
  personal: PersonalGenre[];
  tab: CardTab;
  focus?: AgentCardField;
  agents: readonly Agent[];
  msGenre: string | null;
  genrePool: string[];
  personalGenres: string[];
  allGenres: readonly string[];
  isHit: (g: string) => boolean;
  nowMs: number;
  alsoFor: (d: CardDraft, base: CardDraft) => AlsoNote[];
  notes: AgentNote[];
  /** the old flat `notes` string — shown read-only, never written */
  earlierNote: string;
  onSave: (d: CardDraft, base: CardDraft) => Promise<EditorSaveResult>;
  /** clean leave: back to the quick view (edit) or closed (new) */
  onLeave: () => void;
  onOpenAgent: (id: string) => void;
  onNewGenre: (typed: string) => Promise<{ ok: true; label: string } | { ok: false; reason: string }>;
  onAddNote: (text: string) => Promise<boolean>;
  onEditNote: (id: string, text: string) => Promise<boolean>;
  onDeleteNote: (n: AgentNote) => Promise<boolean>;
  /** the host's backdrop reaches the editor through this — a click there LEAVES (dirty asks) */
  bindLeave: React.MutableRefObject<(() => void) | null>;
}

/** One labelled row of the form, the mock's `.ac-f`. */
const F: React.FC<{ label: string; children: React.ReactNode; vl?: React.ReactNode; vlKey?: string }> = ({ label, children, vl, vlKey }) => (
  <div className="ae-f">
    <label>{label}</label>
    <div className="ae-fl">
      {children}
      {vl !== undefined && <span className="ae-vl" data-vl={vlKey}>{vl}</span>}
    </div>
  </div>
);

export const AgentCardEditor: React.FC<AgentCardEditorProps> = (p) => {
  const { mode, agent, agents, nowMs } = p;
  /* ⚠️ THE BASE IS FROZEN AT THE OPEN — what "changed" is measured against must not move because
     a snapshot of the same record arrived while the writer was typing */
  const [base] = useState<CardDraft>(() => (agent ? draftOf(agent, p.personal) : emptyCardDraft()));
  const [initial] = useState<CardDraft>(() => ({ ...base, ...(p.prefill ?? {}) }));
  const [d, setD] = useState<CardDraft>(initial);
  const [tab, setTab] = useState<CardTab>(mode === "new" && p.tab === "notes" ? "who" : p.tab);
  /* §2: carried-over answers say so in the foot until the next edit */
  const [carried, setCarried] = useState(() => Object.keys(p.prefill ?? {}).length > 0);
  const [ask, setAsk] = useState(false);
  const [nag, setNag] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [calSignal, setCalSignal] = useState(0);
  const [agencyQ, setAgencyQ] = useState(initial.agency);
  const [cityQ, setCityQ] = useState(initial.city);
  /* the add card's "Paste a link" (§5 Inputs, add only): one field that FILES the link where it
     belongs — an MSWL page to MSWL, a QueryManager form to how to submit, anything else to the
     website. It is a sorter, not a field of its own: nothing is stored from it directly. */
  const [paste, setPaste] = useState("");
  const [filed, setFiled] = useState<{ text: string; ok: boolean } | null>(null);

  const set = useCallback((patch: Partial<CardDraft>) => {
    setD((prev) => ({ ...prev, ...patch }));
    setCarried(false);
    setFailure(null);
  }, []);

  const changed = useMemo(() => changedFields(base, d), [base, d]);
  const problems = useMemo(() => problemsOf(d), [d]);
  const firstProblem = (Object.values(problems)[0] as string | undefined) ?? null;
  const dirty = changed.length > 0;
  const alsoFor = p.alsoFor;
  const also = useMemo(() => (mode === "edit" && dirty ? alsoFor(d, base) : []), [mode, dirty, alsoFor, d, base]);
  const dup = useMemo(() => {
    const hit = findDuplicateAgent(d.name, agents);
    return hit && hit.id !== agent?.id ? hit : null;
  }, [d.name, agents, agent]);
  const canSave = !saving && !firstProblem && !dup && (mode === "new" || dirty);

  const tabs = TABS.filter(([k]) => !(mode === "new" && k === "notes"));
  const dotOf = (k: CardTab): "err" | "ch" | "" => {
    if (k === "notes") return "";
    if ((Object.keys(problems) as CardProblemKey[]).some((x) => PROBLEM_TAB[x] === k) || (k === "who" && dup)) return "err";
    return TAB_FIELDS[k].some((f) => changed.includes(f)) ? "ch" : "";
  };

  /* ── leaving: clean returns, dirty asks (the backdrop and ✕ alike) ───────────────────────── */
  const leave = useCallback(() => {
    if (saving) return;
    if (dirty) { setAsk(true); setNag((n) => n + 1); return; }
    p.onLeave();
  }, [saving, dirty, p]);
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  const askRef = useRef(ask);
  askRef.current = ask;
  useEscapeLayer(true, () => {
    if (askRef.current) { setAsk(false); return; }
    leaveRef.current();
  }, ESC_LEVEL.card);
  /* the frame's backdrop is the host's — it calls this */
  useEffect(() => {
    p.bindLeave.current = () => leaveRef.current();
    return () => { p.bindLeave.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bound once; the ref reads the latest leave
  }, []);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const r = await p.onSave(d, base);
    setSaving(false);
    /* "in", not `!r.ok`: with strictNullChecks off a boolean discriminant does not narrow */
    if ("error" in r) setFailure(r.error);
  };

  const onPaste = (raw: string) => {
    setPaste(raw);
    const v = raw.trim();
    if (!v) { setFiled(null); return; }
    if (!linkOk(v)) { setFiled({ text: "That doesn’t look like a link", ok: false }); return; }
    const h = hostOf(v);
    if (/manuscriptwishlist/.test(h)) { set({ mswl: v }); setFiled({ text: "✓ Filed under MSWL", ok: true }); }
    else if (/querymanager/.test(h)) { set({ method: SubmissionMethod.QUERY_MANAGER }); setFiled({ text: "✓ Filed under how to submit", ok: true }); }
    else { set({ website: v }); setFiled({ text: "✓ Filed under website", ok: true }); }
  };

  /* ── focus the door's field on open ───────────────────────────────────────────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const genreRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const pane = rootRef.current?.querySelector<HTMLElement>(`[data-sec="${tab}"]`);
      if (!pane) return;
      if (p.focus === "reopen") { setCalSignal((x) => x + 1); return; }
      if (p.focus === "genres") { genreRef.current?.focus(); return; }
      const sel: Partial<Record<AgentCardField, string>> = {
        name: '[data-ae="name"]', agency: '[data-ae="agency"]', city: '[data-ae="city"]', email: '[data-ae="email"]',
        website: '[data-ae="website"]', mswl: '[data-ae="mswl"]', wishlist: '[data-ae="wishlist"]',
        materials: '[data-ae="materials"] button', reply: '[data-ae="weeks"] button[data-d="1"]', nrmn: '[data-ae="nrn"] button',
        method: '[data-ae="method"] button', door: '[data-ae="door"] button', country: '[data-ae="country"] button',
      };
      const el = pane.querySelector<HTMLElement>((p.focus && sel[p.focus]) || 'input.ac-in, input, textarea');
      el?.focus();
    }, 90);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the door's field is focused once, at the open
  }, []);

  /* a tab arrives with the mock's small rise (160ms) — the panes stay mounted, so this is only the
     newly visible one being shown, never anything re-built */
  const firstTab = useRef(true);
  useEffect(() => {
    if (firstTab.current) { firstTab.current = false; return; }
    const pane = rootRef.current?.querySelector<HTMLElement>(`[data-sec="${tab}"]`);
    if (!pane || typeof pane.animate !== "function" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    pane.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 160, easing: "cubic-bezier(.22,.8,.3,1)" });
  }, [tab]);

  /* ── the who pane's lists ─────────────────────────────────────────────────────────────────── */
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

  /* ── the notes pane (edit only): notes save as written, outside Save changes ─────────────── */
  const [compose, setCompose] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [struck, setStruck] = useState<Record<string, AgentNote>>({});
  const struckRef = useRef(struck);
  struckRef.current = struck;
  const timers = useRef<Record<string, number>>({});
  const deleteNote = useRef(p.onDeleteNote);
  deleteNote.current = p.onDeleteNote;
  const commitDelete = useCallback((id: string) => {
    const n = struckRef.current[id];
    window.clearTimeout(timers.current[id]);
    delete timers.current[id];
    if (!n) return;
    setStruck((s) => { const next = { ...s }; delete next[id]; return next; });
    void deleteNote.current(n);
  }, []);
  /* a delete still waiting when the editor goes is carried out — closing is not an Undo. Empty
     deps: a cleanup keyed on the props would run on every render and commit every strike at once */
  useEffect(() => () => {
    for (const id of Object.keys(struckRef.current)) {
      window.clearTimeout(timers.current[id]);
      void deleteNote.current(struckRef.current[id]);
    }
  }, []);
  const sortedNotes = useMemo(
    () => [...p.notes].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)),
    [p.notes],
  );

  /* ── the foot ─────────────────────────────────────────────────────────────────────────────── */
  const summary = (() => {
    if (failure) return <span className="bad" data-ae="sum-bad">Couldn’t save: {failure}</span>;
    if (firstProblem) return <span className="bad" data-ae="sum-bad">{firstProblem}</span>;
    if (dup) return <span className="bad" data-ae="sum-bad">{`${dup.name} is already on your list`}</span>;
    if (carried) return "Carried over what you picked. Save on the card when you’re done.";
    if (mode === "new") return "Only a name or an agency is needed.";
    if (!dirty) return "No changes yet.";
    /* the mock counts the LINES the Also-changes boxes show — each one is a thing that moves */
    const moved = also.reduce((n, x) => n + x.lines.length, 0);
    return <><b>{changed.length} change{changed.length > 1 ? "s" : ""}</b>{moved ? ` · also changes ${moved} thing${moved > 1 ? "s" : ""} elsewhere` : ""}</>;
  })();
  const name = mode === "new" ? "this new agent" : (agent?.name || agent?.agency || "this agent").trim();

  const alsoBox = (k: Exclude<CardTab, "notes">) => {
    const mine = also.filter((n) => ALSO_TAB[n.field] === k);
    if (!mine.length) return null;
    return (
      <div className="ae-also" data-ae={`also-${k}`}>
        <em>Also changes</em>
        {mine.flatMap((n) => n.lines.map((l) => <p key={`${n.field}-${l}`}>{l}</p>))}
      </div>
    );
  };

  const weekText = d.weeks ? `${d.weeks} week${d.weeks > 1 ? "s" : ""}` : "Unknown";
  const linkVl = (k: "website" | "mswl") => problems[k] ? <span className="bad">{problems[k]}</span> : d[k].trim() ? <span className="ok">✓ {hostOf(d[k])}</span> : "";

  return (
    <>
      <div className="ac-band" data-ac="band" data-ae="band">
        <span className="ac-chip" data-ae="band-chip">{mode === "new" ? "New agent" : "Editing"}</span>
        <span className="sp" />
        <button type="button" className="ac-ib" data-ac="close" aria-label="Close" title="Close (Esc)" onClick={leave}>✕</button>
      </div>
      <div
        className="ac-body ae-body" data-ac="body" data-ae-mode={mode} ref={rootRef}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey || e.defaultPrevented) return;
          const t = e.target as HTMLElement;
          if (!(t instanceof HTMLInputElement) || !t.classList.contains("ac-in") || t.getAttribute("aria-expanded") === "true") return;
          e.preventDefault();
          void save();
        }}
      >
        <div className="ae-tabs" role="tablist" data-ae="tabs">
          {tabs.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} data-tab={k} onClick={() => setTab(k)}>
              {l}<i key={dotOf(k) === "ch" ? `${k}-${nag}` : k} className={`${dotOf(k)}${dotOf(k) === "ch" && nag ? " nag" : ""}`} data-dot={k} />
            </button>
          ))}
        </div>
        <div className="ae-panes">
          {/* ── Contact ── */}
          <section className={`ae-pane${tab === "who" ? " on" : ""}`} data-sec="who" role="tabpanel" aria-hidden={tab !== "who"}>
            {mode === "new" && (
              <F label="Paste a link" vlKey="paste" vl={filed ? <span className={filed.ok ? "ok" : "bad"}>{filed.text}</span> : ""}>
                <input
                  className={`ac-in${filed && !filed.ok ? " bad" : ""}`} data-ae="paste" value={paste} autoComplete="off"
                  placeholder="Agency page, MSWL or QueryManager link (optional)"
                  onChange={(e) => onPaste(e.target.value)}
                />
              </F>
            )}
            <F label="Name" vlKey="name" vl={problems.name ? <span className="bad">{problems.name}</span> : dup ? (
              <span className="bad" data-ae="dup">Already on your list: <b>{dup.name}</b>{dup.agency ? ` · ${dup.agency}` : ""} <button type="button" className="ac-mini" data-ae="dup-open" onClick={() => p.onOpenAgent(dup.id)}>Open them instead</button></span>
            ) : ""}>
              <input className={`ac-in${problems.name || dup ? " bad" : ""}`} data-ae="name" value={d.name} autoComplete="off" onChange={(e) => set({ name: e.target.value })} />
            </F>
            <F label="Agency" vlKey="agency" vl={colleagues.length > 0 && d.agency.trim() ? (
              <span className="ae-hint" data-ae="agency-hint">
                <span><b>{colleagues.length} other agent{colleagues.length > 1 ? "s" : ""}</b> at {d.agency.trim()}{colleagues[0].city ? ` · ${colleagues[0].city}` : ""}{colleagues[0].responseTimeWeeks ? ` · reply in about ${colleagues[0].responseTimeWeeks} weeks` : ""}</span>
                <button type="button" className="ac-mini" data-ae="use-details" onClick={useDetails}>Use these details</button>
              </span>
            ) : ""}>
              <Combo
                ae="agency" value={agencyQ} placeholder="Start typing, or pick from your list"
                onType={(v) => { setAgencyQ(v); set({ agency: v }); }}
                items={agencyItems}
                onPick={(x) => { setAgencyQ(x.value); set({ agency: x.value }); (document.activeElement as HTMLElement | null)?.blur(); }}
              />
            </F>
            <F label="Country"><CountryField value={d.country} onPick={(c) => set({ country: c })} /></F>
            <F label="City">
              <Combo
                ae="city" value={cityQ} placeholder="e.g. London"
                onType={(v) => { setCityQ(v); set({ city: v }); }}
                items={cityItems}
                onPick={(x) => { setCityQ(x.value); set({ city: x.value }); (document.activeElement as HTMLElement | null)?.blur(); }}
              />
            </F>
            <F label="Email" vlKey="email" vl={problems.email ? <span className="bad">{problems.email}</span> : d.email.trim() ? <span className="ok">✓ looks right</span> : ""}>
              <input className={`ac-in${problems.email ? " bad" : ""}`} type="email" data-ae="email" value={d.email} placeholder="name@agency.co.uk" autoComplete="off" onChange={(e) => set({ email: e.target.value })} />
            </F>
            <F label="Website" vlKey="website" vl={linkVl("website")}>
              <input className={`ac-in${problems.website ? " bad" : ""}`} data-ae="website" value={d.website} placeholder="agency.co.uk" autoComplete="off" onChange={(e) => set({ website: e.target.value })} />
            </F>
            <F label="MSWL" vlKey="mswl" vl={linkVl("mswl")}>
              <input className={`ac-in${problems.mswl ? " bad" : ""}`} data-ae="mswl" value={d.mswl} placeholder="manuscriptwishlist.com/…" autoComplete="off" onChange={(e) => set({ mswl: e.target.value })} />
            </F>
            {alsoBox("who")}
          </section>

          {/* ── Wishlist ── */}
          <section className={`ae-pane${tab === "want" ? " on" : ""}`} data-sec="want" role="tabpanel" aria-hidden={tab !== "want"}>
            <div className="ae-f">
              <label>Genres</label>
              <GenreField
                genres={d.genres}
                onGenres={(g) => set({ genres: g })}
                options={{ ms: p.msGenre, pool: p.genrePool, personal: p.personalGenres, all: [...p.allGenres] }}
                isHit={p.isHit}
                onNew={p.onNewGenre}
                inputRef={genreRef}
              />
            </div>
            <F label="Wishlist">
              <textarea
                className="ac-in" data-ae="wishlist" value={d.wishlist} placeholder="In their words, what they’re looking for"
                /* the cap is on TYPING (ruling 8's rule, applied to the wishlist): a stored wishlist
                   longer than 400 is kept as it is and can be cut, never grown */
                maxLength={Math.max(400, d.wishlist.length)}
                onChange={(e) => {
                  const v = e.target.value;
                  set({ wishlist: v.length > 400 && v.length > d.wishlist.length ? d.wishlist : v });
                }}
              />
              <span className="ae-cnt2" data-ae="wishlist-count">{d.wishlist.length} / 400</span>
            </F>
            {/* the mock names an empty Other in the foot and the tab's dot only — no line here, so the
                tallest pane, and with it the card, never grows by a problem's appearing */}
            <F label="Materials">
              <MaterialsField
                mats={d.mats}
                otherRef={otherRef}
                onMats={(m) => {
                  const turnedOn = m.oth.on && !d.mats.oth.on;
                  set({ mats: m });
                  if (turnedOn) window.setTimeout(() => otherRef.current?.focus(), 0);
                }}
              />
            </F>
            {alsoBox("want")}
          </section>

          {/* ── Submissions ── */}
          <section className={`ae-pane${tab === "work" ? " on" : ""}`} data-sec="work" role="tabpanel" aria-hidden={tab !== "work"}>
            <F label="Replies in" vlKey="weeks" vl={d.weeks == null ? (
              <span>
                Unknown until you set it.{" "}
                {peerWeeks
                  ? <button type="button" className="ac-mini" data-ae="use-weeks" onClick={() => set({ weeks: peerWeeks })}>Use {peerWeeks} weeks · others at {(d.agency || agent?.agency || "").trim()}</button>
                  : "Press + to start at 6 weeks."}
              </span>
            ) : undefined}>
              <Stepper
                ae="weeks" text={weekText}
                /* decision 9: no road back to Unknown — the minus stops at one week */
                dec={d.weeks != null && d.weeks > 1}
                inc={d.weeks == null || d.weeks < 26}
                onStep={(dir) => set({ weeks: d.weeks == null ? (dir > 0 ? 6 : null) : Math.max(1, Math.min(26, d.weeks + dir)) })}
              />
            </F>
            <F label="No reply means no" vlKey="nrn" vl={d.nrn == null ? <span>Not stated yet</span> : undefined}>
              <Seg<"yes" | "no">
                ae="nrn" label="No reply means no"
                value={d.nrn == null ? null : d.nrn ? "yes" : "no"}
                options={[["yes", "Yes"], ["no", "No"]]}
                onPick={(v) => set({ nrn: v === "yes" })}
              />
            </F>
            <F label="Submit by">
              <Seg<SubmissionMethod> ae="method" label="Submit by" wrap value={d.method} options={METHODS} onPick={(m) => set({ method: m })} />
            </F>
            <F label="Door">
              <Seg<"open" | "closed">
                ae="door" label="Door"
                value={d.door}
                options={[["open", "Open"], ["closed", "Closed"]]}
                onPick={(v) => {
                  if (v === "open") set({ door: "open", reopens: "" });
                  else { set({ door: "closed" }); if (d.door !== "closed") window.setTimeout(() => setCalSignal((x) => x + 1), 40); }
                }}
              />
            </F>
            {d.door === "closed" && (
              <F label="Reopens">
                <DateField value={d.reopens} nowMs={nowMs} openSignal={calSignal} onPick={(v) => set({ reopens: v })} />
              </F>
            )}
            {alsoBox("work")}
          </section>

          {/* ── Notes (an existing agent only) ── */}
          {mode === "edit" && (
            <section className={`ae-pane${tab === "notes" ? " on" : ""}`} data-sec="notes" role="tabpanel" aria-hidden={tab !== "notes"}>
              <div className="ae-note-h">Notes save as you write them; they aren’t part of Save changes.</div>
              {p.earlierNote.trim() && (
                <div className="ae-note ae-note--earlier" data-ae="earlier-note">
                  <div><small>Earlier note</small><p>{p.earlierNote.trim()}</p></div>
                </div>
              )}
              <div className="ae-compose">
                <textarea className="ac-in" data-ae="compose" placeholder="Add a note…" value={compose} onChange={(e) => setCompose(e.target.value)} />
                <button
                  type="button" className="ac-btn sm" data-ae="add-note" disabled={!compose.trim()}
                  onClick={async () => { const t = compose.trim(); if (!t) return; if (await p.onAddNote(t)) setCompose(""); }}
                >Save note</button>
              </div>
              <div data-ae="notes">
                {sortedNotes.length === 0 && !p.earlierNote.trim() && <p className="ae-empty">No notes yet.</p>}
                {sortedNotes.map((n) => {
                  const gone = !!struck[n.id];
                  const when = Date.parse(n.createdAt) ? dmy(Date.parse(n.createdAt)) : "";
                  if (editing?.id === n.id) {
                    return (
                      <div key={n.id} className="ae-note" data-ae="note">
                        <textarea className="ac-in" data-ae="note-edit" value={editing.text} autoFocus onChange={(e) => setEditing({ id: n.id, text: e.target.value })} />
                        <span className="acts on">
                          <button type="button" className="ac-mini" data-ae="note-save" disabled={!editing.text.trim()}
                            onClick={async () => { if (await p.onEditNote(n.id, editing.text.trim())) setEditing(null); }}>Save</button>
                          <button type="button" className="ac-mini" onClick={() => setEditing(null)}>Cancel</button>
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={n.id} className={`ae-note${gone ? " struck" : ""}`} data-ae="note" data-note={n.id}>
                      <div><p>{n.text}</p>{when && <time>{when}</time>}</div>
                      <span className={`acts${gone ? " on" : ""}`}>
                        {gone ? (
                          <button type="button" className="ac-mini" data-ae="note-undo" onClick={() => {
                            window.clearTimeout(timers.current[n.id]);
                            delete timers.current[n.id];
                            setStruck((s) => { const next = { ...s }; delete next[n.id]; return next; });
                          }}>Undo</button>
                        ) : (
                          <>
                            <button type="button" className="ac-mini" data-ae="note-edit-open" onClick={() => setEditing({ id: n.id, text: n.text })}>Edit</button>{" "}
                            <button type="button" className="ac-mini" data-ae="note-delete" onClick={() => {
                              setStruck((s) => ({ ...s, [n.id]: n }));
                              timers.current[n.id] = window.setTimeout(() => commitDelete(n.id), 6000);
                            }}>Delete</button>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
      {/* ⚠️ `data-ae`, never `data-ac="foot"`: the quick view's foot owns that, and a probe waiting on
          "the foot is showing" must not be answered by the editor's always-open one */}
      <div className={`ac-foot on${ask || failure ? " warn" : ""}`} data-ae="foot" role="status">
        <div>
          {ask ? (
            <>
              <span className="msg" data-ae="ask">Discard your changes to <b>{name}</b>?</span>
              <button
                type="button" className="ac-btn gh sm" data-ae="keep"
                onClick={() => { setAsk(false); rootRef.current?.querySelector<HTMLElement>(`[data-sec="${tab}"] .ac-in`)?.focus(); }}
              >Keep editing</button>
              <button type="button" className="ac-btn sm danger" data-ae="discard" onClick={() => { setAsk(false); p.onLeave(); }}>Discard</button>
            </>
          ) : (
            <>
              <span className="msg ae-sum" data-ae="sum">{summary}</span>
              <button type="button" className="ac-btn gh sm" data-ae="cancel" onClick={leave}>Cancel</button>
              <button type="button" className="ac-btn sm" data-ae="save" disabled={!canSave} onClick={() => void save()}>
                {mode === "new" ? "Add to your list" : "Save changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};
