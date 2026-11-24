/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2 (design-refs/add-agent-v2/add-agent-v2.html + screens/) — THE ADD JOURNEY, the third in the family with
 * Log a query (QcLogStages) and Record a response (QcRespondStages). One question a screen, in Log a query's own shell:
 * the 540px slide-in, the navy head with its track, the scrolling body, the footer, the discard bar and the toast. The
 * classes ARE Log a query's (`.laq-*`, qcLogStages.css); this journey adds only its own parts (`.aag-*`, qcAddAgent.css,
 * the reference's `ag-*` under this journey's prefix).
 *
 *   Agent → Wishlist → Asks for → How → Replies → Add → Added
 *
 * Its identity: the Scout's head where Log a query has the Mentor, the second headline line in light slate, and the agent
 * card's band slate (#5e7189, tint #eef2f6) on ticks, chosen options, chips, the slider and focus — the way Record a
 * response uses the query's status colour. Primary buttons stay navy.
 *
 * ⚠️ NOTHING HERE WRITES. The host's `onAdd` is the one add every door has used since add agent v1
 *    (`addAgent(agentFromDraft(draft))`); this component collects the answers (lib/queryActions/addAgentStages).
 * ⚠️ THE CARD ON THE REVIEW AND ADDED SCREENS IS THE REAL AGENT CARD (the host's `renderCard`), drawn read-only from the
 *    unsaved agent and scaled to fit whole — never a redrawn copy.
 * ⚠️ THE "N of 6" IS THE CARD'S OWN COUNT: its profile ring is over the six details Housekeeping asks about
 *    (`finishShare`, lib/agentCardV2), and the host's `gapsOf` is that list (`agentGaps`). The reference's "of 9" is a
 *    count the app does not keep.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Agent } from "../../../types";
import { FlowHead } from "../../shared/FlowHead";
import { WeekSlider } from "../../forms/WeekSlider";
import { CountryCombobox } from "../../forms/CountryCombobox";
import { SampleControl } from "../../queryActions/controls";
import { GenreChips, FIT_TIP, FIT_WORDS } from "../../agents/card/agentPills";
import type { Book } from "../../../lib/queryActions/sample";
import { flagFor } from "../../../lib/territory";
import { cityCountry, cityWords, countryWords } from "../../../lib/knownCities";
import { agencyKey, agencyOptions, problemsOf } from "../../../lib/cardDraft";
import { findDuplicateAgent } from "../../../lib/contactList";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import {
  A_LABEL, A_METHODS, A_STAGES, addedLine, andList, asksList, draftOfAnswers, firstOf, freshA, headlineA, isFormMethod, nameOk, possOf,
  sampleName, stepHasAnswer, stepValue, type AStage, type AState, type Country,
} from "../../../lib/queryActions/addAgentStages";
import { normaliseCountry } from "../../../lib/territory";
import type { CardDraft } from "../../../lib/cardDraft";
import { ICON, useReducedMotion } from "./QcLogStages";
import "./qcLogStages.css";
import "./qcAddAgent.css";

/** the Scout's head, alone (design-refs/add-agent-v2, its `scoutHead`) */
export const SCOUT_HEAD = "/images/scout-head.png";
/** the Scout, for the added screen (the Contact list's own illustration) */
export const SCOUT_ART = "/images/contact-list-scout.webp";

export interface AddedAgent { id: string; name: string }

export interface QcAddAgentProps {
  nowMs: number;
  agents: readonly Agent[];
  /** agents on file now (the Dashboard's "Agents on file") */
  onFile: number;
  seedName: string;
  /** opened from inside Log a query */
  fromLog: boolean;
  /** how an agent already on the list stands ("Queried · sent 11 Nov"), or null */
  standingOf: (agentId: string) => string | null;
  /** has this agent a query from the writer? */
  hasQuery: (agentId: string) => boolean;
  genre: { options: { ms: string | null; pool: string[]; personal: string[]; all: readonly string[] }; onNew: (typed: string) => Promise<{ ok: true; label: string } | { ok: false; reason: string }> };
  book: Book;
  /** the unsaved agent the answers make (for the preview and the count) */
  agentOf: (d: CardDraft) => Agent;
  /** the card's own gaps for that agent (the six details Housekeeping asks about) */
  gapsOf: (a: Agent) => number;
  /** the real agent card, read-only */
  renderCard: (a: Agent) => React.ReactNode;
  onAdd: (d: CardDraft) => Promise<AddedAgent | { error: string }>;
  /** the added agent's card (the journey closes) */
  onOpenCard: (agentId: string) => void;
  /** an agent already on the list: the card opens over the journey, which steps back behind it */
  onOpenDupe: (agentId: string) => void;
  /** a card is open over the journey: its keys are the card's */
  behind?: boolean;
  onLog: (agentId: string) => void;
  /** from inside Log a query: back to it, with the agent chosen */
  onBackToLog: (a: AddedAgent) => void;
  onClose: () => void;
  leaveRef?: React.MutableRefObject<(() => void) | null>;
}

const FLAG = (c: "GB" | "IE" | "US") => <span className={flagFor(c) ?? ""} aria-hidden="true" />;
const GLOBE = <svg className="aag-gl" viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" /></svg>;
const COUNTRIES: [Country, string][] = [["GB", "UK"], ["IE", "Ireland"], ["US", "US"], ["XX", "Elsewhere"]];
const SYN: [AState["synLen"], string][] = [["1", "One page"], ["2", "Two pages"], ["unsaid", "They don’t say"]];

export const QcAddAgent: React.FC<QcAddAgentProps> = (p) => {
  const { nowMs } = p;
  const [s, setS] = useState<AState>(() => freshA(p.seedName));
  const touched = useRef(false);
  const set = (patch: Partial<AState> | ((o: AState) => Partial<AState>)) => { touched.current = true; setS((o) => ({ ...o, ...(typeof patch === "function" ? patch(o) : patch) })); };
  const [added, setAdded] = useState<(AddedAgent & { onFile: number; gaps: number; agent: Agent }) | null>(null);
  const [leaveAsk, setLeaveAsk] = useState(false);
  const [info, setInfo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastT = useRef<number | null>(null);
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const sbRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const agencyRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const webRef = useRef<HTMLInputElement>(null);
  const methodTxRef = useRef<HTMLInputElement>(null);
  const genreRef = useRef<HTMLInputElement>(null);
  const [agFocus, setAgFocus] = useState(false);
  useEffect(() => () => { if (toastT.current) window.clearTimeout(toastT.current); }, []);
  const say = (t: string) => {
    setToast(t);
    if (toastT.current) window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), 2600);
  };

  const first = firstOf(added?.name ?? s.name);
  const poss = possOf(added?.name ?? s.name);
  const draft = useMemo(() => draftOfAnswers(s, normaliseCountry), [s]);
  const preview = useMemo(() => p.agentOf(draft), [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const gaps = p.gapsOf(preview);

  /* ── the list as it stands: the same name, the same agency ── */
  const dupe = useMemo(() => (nameOk(s) ? findDuplicateAgent(s.name, p.agents) : null), [s.name, p.agents]); // eslint-disable-line react-hooks/exhaustive-deps
  const mates = useMemo(() => {
    const k = s.noAgency ? "" : agencyKey(s.agency);
    return k ? p.agents.filter((a) => agencyKey(a.agency) === k && a.id !== dupe?.id) : [];
  }, [s.agency, s.noAgency, p.agents, dupe]);
  const sugs = useMemo(() => {
    const q = s.agency.trim().toLowerCase();
    if (!q || s.noAgency) return [];
    return agencyOptions(p.agents).filter((o) => o.name.toLowerCase().includes(q) && o.name.toLowerCase() !== q).slice(0, 3);
  }, [s.agency, s.noAgency, p.agents]);
  const canGo = nameOk(s) && !dupe;

  /* ── moving ── */
  const go = (k: AStage, dir?: "in" | "back") => {
    setErr(null); setInfo(false); setLeaveAsk(false);
    setS((o) => ({ ...o, seen: { ...o.seen, [o.step]: true }, dir: dir ?? (A_STAGES.indexOf(k) > A_STAGES.indexOf(o.step) ? "in" : "back"), step: k }));
  };
  /** the step whose answers the record cannot take yet (an email that is not one, a sample under its floor) */
  const blocked = (): { step: AStage; msg: string } | null => {
    const pr = problemsOf(draft);
    if (pr.email) return { step: "how", msg: pr.email };
    if (pr.website || pr.form) return { step: "how", msg: (pr.website ?? pr.form)! };
    if (pr.smp) return { step: "asks", msg: pr.smp };
    return null;
  };
  /** carry on from step one: a name, no twin, and the agency asked for once */
  const fromAgent = (): boolean => {
    if (!canGo) return false;
    if (!s.agency.trim() && !s.noAgency) { set({ askAg: true }); if (sbRef.current) sbRef.current.scrollTop = 0; return false; }
    return true;
  };
  const next = () => {
    if (s.step === "agent" && !fromAgent()) return;
    if (s.step === "asks" || s.step === "how") { const b = blocked(); if (b && b.step === s.step) { setErr(b.msg); return; } }
    go(A_STAGES[A_STAGES.indexOf(s.step) + 1], "in");
  };
  const toEnd = () => {
    if (s.step === "agent" && !fromAgent()) return;
    go("add", "in");
  };

  /* ── adding ── */
  const add = async (more: boolean) => {
    if (busy || !canGo) return;
    if (!s.agency.trim() && !s.noAgency) { go("agent", "back"); set({ askAg: true }); return; }
    const b = blocked();
    if (b) { go(b.step, "back"); setErr(b.msg); return; }
    setBusy(true);
    const r = await p.onAdd(draft);
    setBusy(false);
    if ("error" in r) { setErr(r.error); return; }
    touched.current = false;
    if (more) {
      say(`${firstOf(r.name)} added. Who’s next?`);
      setS({ ...freshA(), dir: "in" });
      return;
    }
    setAdded({ ...r, onFile: p.onFile + 1, gaps, agent: preview });
    setS((o) => ({ ...o, seen: { ...o.seen, [o.step]: true }, dir: "in" }));
  };
  /** "Add and go back to your query" (screen 20): straight from step one */
  const addNow = () => {
    if (s.step === "agent" && !fromAgent()) return;
    if (p.fromLog) void add(false); else go("add", "in");
  };

  /* ── focus as each screen arrives ── */
  useEffect(() => {
    if (added) return;
    const el = s.step === "agent" ? nameRef.current : s.step === "wish" ? genreRef.current : null;
    window.requestAnimationFrame(() => el?.focus({ preventScroll: true }));
  }, [s.step, added]);

  /* ── leaving: nothing entered closes at once; a name or an agency asks (screen 19) ── */
  const answered = !added && touched.current && (!!s.name.trim() || !!s.agency.trim());
  const leave = () => { if (answered) setLeaveAsk(true); else p.onClose(); };
  if (p.leaveRef) p.leaveRef.current = leave;
  useEscapeLayer(!p.behind, () => {
    if (info) { setInfo(false); return; }
    if (leaveAsk) { setLeaveAsk(false); return; }
    leave();
  }, ESC_LEVEL.journey);

  /* ── the head ── */
  const [h1, h2] = headlineA(added ? { ...s, name: added.name } : s, added ? { onFile: added.onFile } : null);
  const track = (
    <div className="laq-trk" data-aag="track" role="list" aria-label="Adding an agent, step by step">
      {A_STAGES.map((k, i) => {
        const now = !added && s.step === k;
        const d = !!added || (!now && !!s.seen[k] && (k !== "agent" || nameOk(s)));
        const cls = `laq-s${now ? " is-n" : ""}${d ? " is-d" : ""}`;
        const v = stepValue(s, k);
        const inner = <><span className="laq-nd" aria-hidden="true">{d ? "✓" : i + 1}</span><span className="laq-l">{A_LABEL[k]}{d && k !== "add" ? <b data-aag="step-value">{v}</b> : null}</span></>;
        return (
          <div key={k} role="listitem" className={`laq-si${d ? " is-done" : ""}`}>
            {d && !added
              ? <button type="button" className={cls} data-aag="step" data-k={k} data-state="done" aria-label={`${A_LABEL[k]}: ${v}. Change it`} onClick={() => go(k)}>{inner}</button>
              : <span className={cls} data-aag="step" data-k={k} data-state={now ? "now" : d ? "done" : "todo"} aria-current={now ? "step" : undefined}>{inner}</span>}
          </div>
        );
      })}
    </div>
  );
  const top = (
    <div className="laq-top aag-top" data-laq="top">
      <FlowHead title={<>{h1}<span className="is-c br" data-aag="head-2">{h2}</span></>} titleKey={`${h1}|${h2}`}
        mark={<img className="flh-m aag-art" data-aag="art" src={SCOUT_HEAD} alt="" width={52} height={52} />}
        onClose={() => (added ? p.onClose() : leave())} data={{ "data-aag": "head" }} closeData={{ "data-aag": "close" }} />
      {track}
    </div>
  );

  /* ── the parts ── */
  const field = (k: string, label: React.ReactNode, value: string, ph: string, onChange: (v: string) => void, o: { ref?: React.Ref<HTMLInputElement>; disabled?: boolean; onFocus?: () => void; onBlur?: () => void; type?: string } = {}) => (
    <label className="laq-fl" data-aag={`fl-${k}`}>
      <span>{label}</span>
      <input ref={o.ref} data-aag={k} value={value} placeholder={ph} autoComplete="off" disabled={o.disabled} type={o.type ?? "text"}
        onChange={(e) => onChange(e.target.value)} onFocus={o.onFocus} onBlur={o.onBlur}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); if (s.step === "agent") { if (p.fromLog) addNow(); else next(); } else next(); } }} />
    </label>
  );
  const opt = (grp: string, k: string, label: string, on: boolean, pick: () => void) => (
    <button key={k} type="button" className={`laq-opt${on ? " is-on" : ""}`} role="radio" aria-checked={on} data-aag={grp} data-k={k} onClick={pick}>
      <span className="laq-rdo" aria-hidden="true" /><span>{label}</span>
    </button>
  );
  const chip = (k: string, label: string, on: boolean, pick: () => void, data = "chip") => (
    <button key={k} type="button" role="radio" aria-checked={on} className={`laq-chip${on ? " is-on" : ""}`} data-aag={data} data-k={k} onClick={pick}>{label}</button>
  );

  /* ── step 1 · Agent ── */
  const box = () => {
    if (dupe) {
      const st = p.standingOf(dupe.id);
      return (
        <div className="aag-box" role="status" data-aag="dupe">
          <p><b>{dupe.name}</b> is already on your list{dupe.agency?.trim() ? `, at ${dupe.agency.trim()}` : ""}.{st ? ` ${st}.` : ""}</p>
          <button type="button" className="laq-tdb" data-aag="open-dupe" onClick={() => p.onOpenDupe(dupe.id)}>Open {firstOf(dupe.name)}’s card</button>
        </div>
      );
    }
    if (s.askAg && !s.agency.trim() && !s.noAgency) return (
      <div className="aag-box is-ask" role="alert" data-aag="agency-ask">
        <p><b>Do you know the agency?</b> Having it on file helps you avoid querying two agents at the same agency, and helps QueryHawk keep agents’ records up to date.</p>
        <div>
          <button type="button" className="laq-tdb" data-aag="ask-add" onClick={() => { set({ askAg: false }); agencyRef.current?.focus(); }}>Add the agency</button>
          <button type="button" className="laq-tdb" data-aag="ask-unknown" onClick={() => { set({ noAgency: true, askAg: false, agency: "" }); cityRef.current?.focus(); }}>Agency unknown</button>
        </div>
      </div>
    );
    if (mates.length) {
      const names = mates.map((a) => a.name?.trim() || a.agency);
      const withQ = mates.filter((a) => p.hasQuery(a.id));
      const qLine = withQ.length === 0 ? "" : withQ.length === mates.length && mates.length === 2 ? " Both have a query from you."
        : withQ.length === mates.length && mates.length > 2 ? " All of them have a query from you."
        : ` ${andList(withQ.map((a) => firstOf(a.name ?? "")))} ${withQ.length === 1 ? "has" : "have"} a query from you.`;
      return (
        <div className="aag-box" role="status" data-aag="mates">
          <p>{names.map((n, i) => <React.Fragment key={i}>{i ? (i === names.length - 1 ? " and " : ", ") : ""}<b>{n}</b></React.Fragment>)} {mates.length > 1 ? "are" : "is"} also at {mates[0].agency.trim()}.{qLine}</p>
        </div>
      );
    }
    return null;
  };
  const setCity = (v: string) => {
    const c = cityCountry(v);
    if (c && c !== s.country) {
      set({ city: v, country: c });
      say(`${cityWords(v)} is in ${countryWords(c)}, so that’s switched too.`);
    } else set({ city: v });
  };
  const pickCountry = (c: Country) => {
    const known = cityCountry(s.city);
    set({ country: c, ...(c !== "XX" && known && known !== c ? { city: "" } : {}) });
    window.requestAnimationFrame(() => cityRef.current?.focus({ preventScroll: true }));
  };
  const agentBody = () => (
    <>
      <h2 className="laq-qh">Who are you adding?</h2>
      <p className="laq-qs">A name is enough to start. The rest can come now or later.</p>
      {box()}
      {field("name", "Name", s.name, "e.g. Sarah Jones", (v) => set({ name: v }), { ref: nameRef })}
      <div className="aag-agw">
        {field("agency", "Agency", s.noAgency ? "" : s.agency, s.noAgency ? "Agency unknown" : "e.g. Fenwick & Rowe", (v) => set({ agency: v, ...(v.trim() ? { askAg: false } : {}) }),
          { ref: agencyRef, disabled: s.noAgency, onFocus: () => setAgFocus(true), onBlur: () => window.setTimeout(() => setAgFocus(false), 160) })}
        {agFocus && sugs.length ? (
          <div className="aag-sug" role="listbox" aria-label="Agencies on your list" data-aag="agency-sugs">
            {sugs.map((o) => (
              <button key={o.name} type="button" role="option" aria-selected={false} data-aag="agency-sug" onMouseDown={(e) => e.preventDefault()}
                onClick={() => { set({ agency: o.name, askAg: false }); setAgFocus(false); cityRef.current?.focus(); }}>
                {o.name}<span>{o.count} {o.count === 1 ? "agent" : "agents"} on your list</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {s.noAgency ? <p className="aag-lk" data-aag="agency-unknown">Marked as unknown. <button type="button" className="laq-lk" data-aag="agency-known" onClick={() => { set({ noAgency: false }); window.requestAnimationFrame(() => agencyRef.current?.focus()); }}>I know it now</button></p> : null}
      <span className="aag-lab" id="aag-based">Based in</span>
      <div className="aag-cn" role="radiogroup" aria-labelledby="aag-based" data-aag="country">
        {COUNTRIES.map(([c, l]) => (
          <button key={c} type="button" role="radio" aria-checked={s.country === c} className={`aag-c${s.country === c ? " is-on" : ""}`} data-aag="country-pick" data-k={c}
            onClick={() => pickCountry(s.country === c ? "" : c)}>{c === "XX" ? GLOBE : FLAG(c as "GB" | "IE" | "US")}{l}</button>
        ))}
      </div>
      <div className={`aag-city${s.country === "XX" ? " is-2" : ""}`}>
        <input ref={cityRef} className="aag-in" data-aag="city" value={s.city} placeholder="City, if you know it" aria-label="City" autoComplete="off" onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (p.fromLog) addNow(); else next(); } }} />
        {s.country === "XX" ? <div className="aag-cty" data-aag="elsewhere"><CountryCombobox value={s.elsewhere} onChange={(c) => set({ elsewhere: c })} placeholder="Country" /></div> : null}
      </div>
    </>
  );

  /* ── step 2 · Wishlist ── */
  const wishBody = () => (
    <>
      <h2 className="laq-qh">What is {first} looking for?</h2>
      <p className="laq-qs">From their wishlist or their agency page.</p>
      <span className="aag-lab">Genres {first} takes</span>
      <div className="aag-genres" data-aag="genres">
        <GenreChips genres={s.genres} onGenres={(g) => set({ genres: g })} options={p.genre.options} onNew={p.genre.onNew} inputRef={genreRef} />
      </div>
      <div className="aag-gap" />
      <label className="aag-lab" htmlFor="aag-wish">Wishlist<i>in {poss} words</i></label>
      <textarea id="aag-wish" className="aag-ta" data-aag="wish" maxLength={400} placeholder="Paste it from their wishlist or agency page" value={s.wish} onChange={(e) => set({ wish: e.target.value })} />
    </>
  );

  /* ── step 3 · Asks for ── */
  const tile = (key: keyof AState["ask"], title: string, sub: string | null, extra: React.ReactNode | null) => {
    const on = s.ask[key];
    return (
      <div className={`laq-gt${on ? " is-on" : ""}`} data-aag="tile" data-k={key} data-on={on ? "1" : "0"}>
        <button type="button" role="checkbox" aria-checked={on} aria-expanded={extra ? on : undefined} onClick={() => set((o) => ({ ask: { ...o.ask, [key]: !o.ask[key] } }))}>
          <span className="laq-ck" aria-hidden="true">{on ? "✓" : ""}</span>
          <span className="laq-tx"><b>{title}</b>{sub ? <span data-aag="tile-sub">{sub}</span> : null}</span>
        </button>
        {on && extra ? <div className="laq-gs" data-aag="tile-open">{extra}</div> : null}
      </div>
    );
  };
  const synSub = s.synLen === "1" ? "One page" : s.synLen === "2" ? "Two pages" : s.synLen === "unsaid" ? "Length not stated" : null;
  const asksBody = () => (
    <>
      <h2 className="laq-qh">What does {first} ask for?</h2>
      <p className="laq-qs">Tick everything on their submissions page.</p>
      <div className="laq-gen">
        {tile("letter", "Query letter", null, null)}
        {tile("syn", "Synopsis", s.ask.syn ? synSub : null,
          <div className="aag-len" role="radiogroup" aria-label="How long a synopsis">{SYN.map(([k, l]) => chip(k, l, s.synLen === k, () => set({ synLen: s.synLen === k ? "" : k }), "syn"))}</div>)}
        {tile("sample", "A sample", s.ask.sample ? sampleName(s.samp) : "Pages, chapters or words",
          <div className="laq-qsamp" data-aag="sample-control"><SampleControl name="aag" sample={s.samp} book={p.book} openingOnly onChange={(x) => set({ samp: x })} /></div>)}
        {tile("other", "Something else", null,
          <input className="aag-in" data-aag="other-tx" value={s.otherTx} maxLength={40} placeholder="Type what they ask for" aria-label="Something else they ask for" autoComplete="off"
            autoFocus onChange={(e) => set({ otherTx: e.target.value })} />)}
      </div>
      {err ? <p className="laq-err" role="alert" data-aag="error">{err}</p> : null}
    </>
  );

  /* ── step 4 · How ── */
  const pickMethod = (k: string) => {
    const nk = s.method === k ? "" : k;
    set({ method: nk });
    window.requestAnimationFrame(() => {
      if (nk === "other") methodTxRef.current?.focus();
      else if (nk === "email" && !s.email.trim()) emailRef.current?.focus();
      else if (isFormMethod(nk) && !s.web.trim()) webRef.current?.focus();
    });
  };
  const howBody = () => (
    <>
      <h2 className="laq-qh">How does {first} take queries?</h2>
      <p className="laq-qs">It goes on {poss} card, ready for when you query.</p>
      <div className="laq-opts aag-o3" role="radiogroup" aria-label="How they take queries">{A_METHODS.map((m) => opt("method", m.k, m.label, s.method === m.k, () => pickMethod(m.k)))}</div>
      {s.method === "other" ? <input ref={methodTxRef} className="aag-in aag-mtx" data-aag="method-tx" value={s.methodTx} maxLength={40} placeholder="How do they take them?" aria-label="How they take queries" autoComplete="off" onChange={(e) => set({ methodTx: e.target.value })} /> : null}
      <div className="aag-gap" />
      <div className="aag-two">
        {field("email", "Email", s.email, "name@agency.co.uk", (v) => set({ email: v }), { ref: emailRef, type: "email" })}
        {field("web", isFormMethod(s.method) ? "Link to the form" : "Website", s.web, "agency.co.uk", (v) => set({ web: v }), { ref: webRef })}
      </div>
      {err ? <p className="laq-err" role="alert" data-aag="error">{err}</p> : null}
      <h3 className="laq-qh is-q2">Is {first} open to queries?</h3>
      <div className="laq-opts aag-o3" role="radiogroup" aria-label="Open to queries">
        {opt("door", "open", "Open", s.door === "open", () => set({ door: s.door === "open" ? "" : "open" }))}
        {opt("door", "closed", "Closed", s.door === "closed", () => set({ door: s.door === "closed" ? "" : "closed" }))}
        {opt("door", "unsure", "Not sure", s.door === "unsure", () => set({ door: s.door === "unsure" ? "" : "unsure" }))}
      </div>
    </>
  );

  /* ── step 5 · Replies ── */
  const replyBody = () => (
    <>
      <h2 className="laq-qh">How long does {first} take to reply?</h2>
      <p className="laq-qs">Most agents say on their submissions page.</p>
      <div className="laq-wkb aag-wk" data-aag="weeks" data-unknown={s.wkNone ? "1" : "0"}>
        <WeekSlider label="Response time" value={s.wkNone ? null : s.wk} min={1} max={26} onChange={(w) => set({ wk: w, wkNone: false })} onUnknown={() => set({ wkNone: true })} />
        <p className="laq-wkx" data-aag="weeks-note">{s.wkNone ? `Not known yet. You can add it to ${poss} card any time.` : "With this on file, QueryHawk can tell you when a reply is due and when to nudge."}</p>
      </div>
      <h3 className="laq-qh is-q2">And if {first} doesn’t reply?</h3>
      <div className="laq-opts" role="radiogroup" aria-label="If they don’t reply">
        {opt("policy", "always", "They always reply", s.policy === "always", () => set({ policy: s.policy === "always" ? "" : "always" }))}
        {opt("policy", "nrn", "No response means no", s.policy === "nrn", () => set({ policy: s.policy === "nrn" ? "" : "nrn" }))}
      </div>
    </>
  );

  /* ── step 6 · the review ── */
  const numbers = (onFile: number, n: number) => (
    <div className="rvb is-big aag-rvb" role="group" aria-label={`What adding ${first} does`} data-aag="counts">
      <div className="rvb-c" data-aag="count" data-k="agents"><span className="rvb-n">{onFile}<i>+1</i></span><span className="rvb-l">agents on file</span></div>
      <div className="rvb-c" data-aag="count" data-k="details"><span className="rvb-n" data-aag="details-n">{6 - n} of 6</span><span className="rvb-l">details on {poss} card</span></div>
    </div>
  );
  const fitBlock = () => (
    <div className="aag-fitb" data-aag="fit">
      {info ? <div className="aag-pop" role="tooltip" id="aag-fit-tip" data-aag="fit-tip">{FIT_TIP}<b className="aag-popk">1 poor fit · 2 worth a try · 3 good fit · 4 great fit · 5 dream agent</b></div> : null}
      <b>Agent fit</b>
      <button type="button" className="aag-i" data-aag="fit-info" aria-label="What Agent fit means" aria-expanded={info} aria-describedby={info ? "aag-fit-tip" : undefined} onClick={() => setInfo((v) => !v)}>i</button>
      <span role="radiogroup" aria-label="Agent fit" className="aag-stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={s.fit === n} className={`aag-star${n <= s.fit ? " is-on" : ""}`} data-aag="star" data-n={n} aria-label={`${n} of 5, ${FIT_WORDS[n]}`}
            onClick={() => set({ fit: s.fit === n ? 0 : n })}>★</button>
        ))}
      </span>
      <span className={`aag-fitl${s.fit ? " is-on" : ""}`} data-aag="fit-word">{s.fit ? FIT_WORDS[s.fit] : "Not rated yet"}</span>
    </div>
  );
  const addBody = () => (
    <>
      <h2 className="laq-qh">Ready to add {first}?</h2>
      <p className="laq-qs">This is {poss} card, as it will sit in your Contact list.</p>
      <CardFit max={372} k={draft}>{p.renderCard(preview)}</CardFit>
      {fitBlock()}
      {err ? <p className="laq-err" role="alert" data-aag="error">{err}</p> : null}
      <div className="aag-rvbw">{numbers(p.onFile + 1, gaps)}</div>
    </>
  );

  /* ── the added screen ── */
  if (added) {
    const today = new Date(nowMs).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
    return (
      <div ref={rootRef} className="laq aag" data-aag="root" data-step="done">
        <div className="laq-in">
          {top}
          <div className="laq-sb laq-yayb" data-aag="body">
            <div className="laq-yay aag-yay" data-aag="done">
              <img className="aag-scout" src={SCOUT_ART} alt="" width={118} height={116} data-aag="scout" />
              <h2 className="laq-yh" data-aag="done-head">{firstOf(added.name)} is on your list.</h2>
              <p className="laq-yl" data-aag="done-line">{addedLine(added.gaps, added.name, p.fromLog)}</p>
              <CardFit max={330} k={added.agent} stamp={<span className="qc-stamp aag-stamp" aria-hidden="true" data-aag="stamp">Added<small>{today}</small></span>}>{p.renderCard(added.agent)}</CardFit>
            </div>
          </div>
          <div className="laq-cf" data-aag="foot">
            <button type="button" className="laq-lnk" data-aag="open-card" onClick={() => p.onOpenCard(added.id)}>Open {firstOf(added.name)}’s card</button>
            <span className="laq-sp" />
            {p.fromLog
              ? <button type="button" className="laq-btn" data-aag="back-laq" autoFocus onClick={() => p.onBackToLog(added)}>Back to your query {ICON.arrow}</button>
              : <>
                <button type="button" className="laq-lnk" data-aag="another" onClick={() => { setAdded(null); setS({ ...freshA(), dir: "in" }); }}>Add another</button>
                <button type="button" className="laq-btn" data-aag="log" autoFocus onClick={() => p.onLog(added.id)}>Log a query to {firstOf(added.name)} {ICON.arrow}</button>
              </>}
          </div>
          <div className={`laq-toast${toast ? " is-on" : ""}`} data-aag="toast" role="status" aria-live="polite">{toast}</div>
        </div>
      </div>
    );
  }

  /* ── the footer ── */
  const primary = (act: string, label: string, run: () => void, disabled = false) => (
    <button type="button" className="laq-btn" data-aag={act} disabled={disabled || busy} aria-busy={busy || undefined} onClick={run}>{label} {ICON.arrow}</button>
  );
  const idx = A_STAGES.indexOf(s.step);
  const foot = (() => {
    if (s.step === "agent") return <>
      <button type="button" className="laq-lnk" data-aag="cancel" onClick={() => leave()}>Cancel</button>
      <span className="laq-sp" />
      {nameOk(s) ? (p.fromLog
        ? <><button type="button" className="laq-lnk" data-aag="more-first" disabled={!canGo} onClick={next}>Add more detail first</button>{primary("add-now", "Add and go back to your query", addNow, !canGo)}</>
        : <><button type="button" className="laq-lnk" data-aag="add-later" disabled={!canGo} onClick={toEnd}>Add now, finish later</button>{primary("next", "Carry on", next, !canGo)}</>) : null}
    </>;
    if (s.step === "add") return <>
      <button type="button" className="laq-lnk" data-aag="back" onClick={() => go(A_STAGES[idx - 1], "back")}>Back</button>
      <span className="laq-sp" />
      {p.fromLog ? null : <button type="button" className="laq-lnk" data-aag="add-more" disabled={busy} onClick={() => void add(true)}>Add and start another</button>}
      {primary("add", p.fromLog ? "Add and go back to your query" : busy ? "Adding…" : "Add to your list", () => void add(false))}
    </>;
    return <>
      <button type="button" className="laq-lnk" data-aag="back" onClick={() => go(A_STAGES[idx - 1], "back")}>Back</button>
      <span className="laq-sp" />
      <button type="button" className="laq-lnk" data-aag="to-end" onClick={toEnd}>Skip to the end</button>
      {primary("next", stepHasAnswer(s, s.step) ? "Carry on" : "Skip this", next)}
    </>;
  })();
  const leaveFoot = (
    <>
      <span className="laq-lv" role="alertdialog" aria-label="Discard this agent?"><b>Discard this?</b> {nameOk(s) ? `${firstOf(s.name)} hasn’t` : "They haven’t"} been added yet.</span>
      <span className="laq-sp" />
      <button type="button" className="laq-lnk" data-aag="leave-keep" autoFocus onClick={() => setLeaveAsk(false)}>Keep going</button>
      <button type="button" className="laq-btn" data-aag="leave-discard" onClick={p.onClose}>Discard</button>
    </>
  );
  const body = s.step === "agent" ? agentBody() : s.step === "wish" ? wishBody() : s.step === "asks" ? asksBody() : s.step === "how" ? howBody() : s.step === "reply" ? replyBody() : addBody();
  return (
    <div ref={rootRef} className="laq aag" data-aag="root" data-step={s.step} data-from={p.fromLog ? "laq" : "top"}>
      <div className="laq-in">
        {top}
        <div ref={sbRef} key={s.step} className={`laq-sb${s.dir && !reduce ? ` is-${s.dir}` : ""}${s.step === "add" ? " is-chk" : ""}`} data-aag="body">{body}</div>
        <div className={`laq-cf${leaveAsk ? " is-leave" : ""}`} data-aag="foot">{leaveAsk ? leaveFoot : foot}</div>
        <div className={`laq-toast${toast ? " is-on" : ""}`} data-aag="toast" role="status" aria-live="polite">{toast}</div>
      </div>
    </div>
  );
};

/**
 * The card, small enough to see whole (screens 14 and 17): the real card at its own width, scaled down so its whole height
 * fits `max` pixels — never past 0.62 — with no scroll inside it. The scale follows the card's measured height.
 */
const CardFit: React.FC<{ max: number; k: unknown; stamp?: React.ReactNode; children: React.ReactNode }> = ({ max, k, stamp, children }) => {
  const inn = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = inn.current;
    if (!el) return undefined;
    const fit = () => { const w = el.offsetWidth, h = el.offsetHeight; if (w && h) setM((o) => (o && o.w === w && o.h === h ? o : { w, h })); };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [k]);
  const sc = m ? Math.min(0.62, max / m.h) : 0.6;
  return (
    <div className="aag-pv" data-aag="preview" data-scale={sc.toFixed(4)} style={m ? { width: Math.round(m.w * sc), height: Math.round(m.h * sc) } : undefined}>
      <div ref={inn} className="aag-pvin" inert aria-hidden="true" style={{ transform: `scale(${sc})` }}>{children}</div>
      {stamp}
    </div>
  );
};
