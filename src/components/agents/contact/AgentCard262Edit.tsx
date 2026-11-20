/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 Part C, rebuilt by Add agent v1 Phase 4 (design-refs/add-agent-v1/agent-card-edit-v1.html) —
 * EDITING ON THE CARD, with the add journey's own controls (`agentPills`): each profile section's fields drawn where its
 * read-only content was, over the editor's one draft (`useAgentForm`: `CardDraft`, `changedFields`). Agent card v2.1: each
 * section saves its own fields (its tick, in AgentCard262); there is no save bar, and the rust `GuardBar` appears only when
 * leaving with something unsaved.
 *
 *   Contact details  Name and Agency side by side (the agency rule), Based in, Email and Website side by side, the
 *                    submission link (conditional), MSWL, Social            — powder
 *   Genres, Wishlist                                                         — blush
 *   Materials        "What {First} asks for — pick all that apply"          — sand
 *   How {First} works taking queries, how they take them, response time, if they don't reply — sand
 *
 * ⚠️ THE RUST BAR IS THE DISCARD GUARD: with unsaved changes, ✕, Esc, a tab, paging and another row bring it up in the
 *    footer's place; nothing else happens until Keep editing, Discard or Save all is chosen.
 * ⚠️ CARD OFFERS v1 (design-refs/card-offers-v1/agent-card-edit-v8.html): THE RUST "ALSO CHANGES" BOX IS GONE. What an edit
 *    does to the queries already out is an OFFER that asks (`cardOffers`): the close offer under Taking queries, the
 *    response-time offer under the slider's hint, a powder note when a request in progress is safe, and quiet grey
 *    footnotes for the rest. Nothing happens until How's tick; the snackbar names what it did.
 */
import React from "react";
import { QueryStatus, type Agent } from "../../../types";
import { StatusDot } from "../../StatusDot";
import {
  CLOSE_WHY, REOPEN_QUIET, closeHeader, closeLead, closeOptionSub, nudgeSub, rtHeader, rtWhy, safeNote,
  type CardOffers, type CloseChoice, type RtChoice,
} from "../../../lib/cardOffers";
import { dm } from "../../../lib/queryActions/dates";
import { emailOk, hostOf, linkOk, type CardDraft } from "../../../lib/cardDraft";
import type { AgentForm } from "../card/useAgentForm";
import type { CardFormKit } from "./AgentCard24";
import {
  AaField, CountryPills, DoorPills, GenreChips, MAT_OPS, MethodPills, PolicyPills, ResponseTime, SAMPLE_UNITS, SocialField, WishlistArea,
  formLinkLabel, formLinkPlaceholder, sampleBad,
} from "../card/agentPills";
import { floorCopy } from "../../../lib/createQty";
import { askList } from "../../../lib/agentCardV2";
import { encodeMats, type CardMats } from "../../../lib/cardDraft";
import { cityOffer, keepKey } from "../../../lib/knownCities";
import "../card/agentCard.css";
import "../card/agentEditMode.css";
import "../card/agentPills.css";

/** the offers' state, owned by the card (one edit session): the offers for the draft, the two choices, and their setters */
export interface OfferKit {
  o: CardOffers;
  rt: RtChoice;
  close: CloseChoice | null;
  setRt: (c: RtChoice) => void;
  setClose: (c: CloseChoice) => void;
  /** the slider is being dragged: the offer settles on release */
  onDrag: (dragging: boolean) => void;
  weeks: number | null;
  nrn: boolean;
}

const CAL = (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <rect x="2" y="3" width="12" height="11" rx="1.6" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
  </svg>
);
const day = (ms: number) => dm(new Date(ms));

/** a real radio group: one tab stop, arrow keys move the choice (and the focus) */
function useRadioKeys<K extends string>(keys: readonly K[], value: K, onPick: (k: K) => void) {
  return (e: React.KeyboardEvent<HTMLElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = (keys.indexOf(value) + step + keys.length) % keys.length;
    onPick(keys[i]);
    const group = e.currentTarget;
    window.requestAnimationFrame(() => group.querySelector<HTMLElement>(`[data-k="${keys[i]}"]`)?.focus());
  };
}

/** Phase 2 — the response-time offer: the query, its reply and nudge dates old → new, and Update / Keep */
export const RtOffer: React.FC<{ kit: OfferKit; first: string }> = ({ kit, first }) => {
  const rows = kit.o.rt?.queries ?? [];
  const keys = ["update", "keep"] as const;
  const onKey = useRadioKeys(keys, kit.rt, kit.setRt);
  if (!rows.length) return null;
  return (
    <div className="co-offer" role="group" aria-label={rows.length === 1 ? "Your open query" : "Your open queries"} data-co="rt">
      <div className="co-h"><span className="co-ic">{CAL}</span><b>{rtHeader(rows.length, first)}</b></div>
      <div className="co-b">
        {rows.map((r) => (
          <React.Fragment key={r.id}>
            <div className="co-qrow" data-co="qrow"><span className="co-st"><StatusDot status={QueryStatus.QUERIED} overrideSize={11} />Queried</span>{r.sentMs != null ? `Sent ${day(r.sentMs)}` : "Sent"}{r.title ? ` · ${r.title}` : ""}</div>
            <dl className="co-dates" data-co="dates">
              <dt>Reply expected</dt>
              <dd data-co="exp"><s data-co="old">{day(r.oldExpMs)}</s><span className="co-arrow" aria-hidden="true">→</span><span className="co-to" data-co="new">{day(r.newExpMs)}</span>
                {r.past ? <span className="co-sub" data-co="passed">That date has already passed.</span> : null}</dd>
              {r.nudge ? (
                <>
                  <dt>Nudge due</dt>
                  <dd data-co="nudge">{r.nudge.moves ? <><s data-co="old">{day(r.nudge.oldMs)}</s><span className="co-arrow" aria-hidden="true">→</span><span className="co-to" data-co="new">{r.nudge.today ? "Today" : day(r.nudge.newMs)}</span></>
                    : <span className="co-to" data-co="new">{day(r.nudge.newMs)}</span>}
                    <span className="co-sub">{nudgeSub(r.nudge, first)}</span></dd>
                </>
              ) : null}
            </dl>
          </React.Fragment>
        ))}
        <div className="aap-pills co-ask" role="radiogroup" aria-label={rows.length === 1 ? "Its dates" : "Their dates"} data-co="rt-choice" onKeyDown={onKey}>
          {keys.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kit.rt === k} tabIndex={kit.rt === k ? 0 : -1} data-k={k} data-co={`rt-${k}`}
              className={`aap-pill${kit.rt === k ? " on" : ""}`} onClick={() => kit.setRt(k)}>
              {k === "update" ? (rows.length === 1 ? "Update its dates" : "Update their dates") : "Keep them as they are"}
            </button>
          ))}
        </div>
        <p className="co-why" data-co="why">{rtWhy(kit.rt, rows, first, kit.weeks ?? 0)}</p>
      </div>
    </div>
  );
};

/** Phase 2 — the closed offer: Leave it open / Close it as no reply, with Suggested on one of them */
export const CloseOffer: React.FC<{ kit: OfferKit; first: string }> = ({ kit, first }) => {
  const c = kit.o.close;
  const keys = ["keep", "close"] as const;
  const value: CloseChoice = kit.close ?? c?.suggest ?? "keep";
  const onKey = useRadioKeys(keys, value, kit.setClose);
  if (!c) return null;
  const lead = closeLead(c.queries, first, kit.nrn);
  return (
    <div className="co-offer co-closer" role="group" aria-label={c.queries.length === 1 ? "Your open query" : "Your open queries"} data-co="close" data-suggest={c.suggest}>
      <div className="co-h"><span className="co-ic">{CAL}</span><b>{closeHeader(c.queries.length, first)}</b></div>
      <div className="co-b">
        <p className="co-lead" data-co="lead"><b>{lead.bold}</b> {lead.rest}</p>
        <div role="radiogroup" aria-label={c.queries.length === 1 ? "Your query" : "Your queries"} data-co="close-choice" onKeyDown={onKey}>
          {keys.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={value === k} tabIndex={value === k ? 0 : -1} data-k={k} data-co={`close-${k}`}
              className="co-opt" onClick={() => kit.setClose(k)}>
              <span className="co-rd" aria-hidden="true" />
              <span>{k === "keep" ? (c.queries.length === 1 ? "Leave it open" : "Leave them open") : (c.queries.length === 1 ? "Close it as no reply" : "Close them as no reply")}
                {c.suggest === k ? <span className="co-tag" data-co="suggested">Suggested</span> : null}
                <small>{closeOptionSub(k, c.queries)}</small></span>
            </button>
          ))}
        </div>
        <p className="co-why">{CLOSE_WHY}</p>
      </div>
    </div>
  );
};

/** the calm note: a request in progress is never touched */
export const SafeNote: React.FC<{ kit: OfferKit; first: string }> = ({ kit, first }) => {
  const s = kit.o.safe;
  if (!s) return null;
  const n = safeNote(s.stage, first);
  return <div className="co-safe" data-co="safe"><span aria-hidden="true">✓</span><span><b>{n.bold}</b> {n.rest}</span></div>;
};
const Quiet: React.FC<{ lines: readonly string[] }> = ({ lines }) => (
  <>{lines.map((l) => <p key={l} className="co-quiet" data-co="quiet">{l}</p>)}</>
);

const firstOf = (d: Pick<CardDraft, "name" | "agency">) => {
  const f = d.name.trim().split(/\s+/)[0] || d.agency.trim();
  return f ? f[0].toUpperCase() + f.slice(1) : "them";
};

export const EditGenres: React.FC<{ form: AgentForm; kit: CardFormKit; isHit: (g: string) => boolean }> = ({ form, kit }) => (
  <>
    <GenreChips dress="field" genres={form.d.genres} onGenres={(g) => form.set({ genres: g })} onNew={kit.onNewGenre}
      options={{ ms: kit.msGenre, pool: kit.genrePool, personal: kit.personalGenres, all: kit.allGenres }} />
  </>
);

/** Agent card v2.1 — the wishlist open: the same quote block, typeable, a navy left edge, no quote marks, growing with the text */
export const EditWishlist: React.FC<{ form: AgentForm }> = ({ form }) => (
  <div className="cl262-wishf acv21-wishf" data-cl262="wish-form">
    <WishlistArea value={form.d.wishlist} onValue={(v) => form.set({ wishlist: v })} className="nx-quote acv21-wish" />
  </div>
);

const RTICK = <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="10" fill="#2a3a52" /><path d="M6.6 11.3l2.9 2.9 5.9-6.2" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const RNONE = <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="9.6" fill="#fff" stroke="#b8afa3" strokeWidth="1.4" /></svg>;
/** a stepper: − {words} + */
const Step: React.FC<{ words: string; less: () => void; more: () => void; lessOff: boolean; moreOff: boolean; k: string; noun: string }> = ({ words, less, more, lessOff, moreOff, k, noun }) => (
  <span className="ag-step" data-acv21="step" data-k={k}>
    <button type="button" data-acv21="less" aria-label={`Fewer ${noun}`} disabled={lessOff} onClick={less}>−</button>
    <b data-acv21="step-val">{words}</b>
    <button type="button" data-acv21="more" aria-label={`More ${noun}`} disabled={moreOff} onClick={more}>+</button>
  </span>
);
/**
 * Agent card v2.1 — WHAT THEY ASK FOR, OPEN: the same list, each row a tick. A ticked row carries its quantity controls
 * (Synopsis its pages stepper; the opening sample its label as the card will read it, then the unit switch and the
 * "First {n}" stepper on a line beneath; Other its words). Every change is `MAT_OPS`'s — MaterialPills' own — so this
 * dress stores exactly what the add journey's pills store for the same choices.
 */
export const MaterialRows: React.FC<{ mats: CardMats; onMats: (m: CardMats) => void }> = ({ mats: m, onMats }) => {
  const bad = sampleBad(m);
  const smpLabel = askList({ materialsWanted: encodeMats(m) }).find((r) => r.kind === "pages")?.label ?? "Opening sample";
  const othRef = React.useRef<HTMLInputElement>(null);
  const wasOth = React.useRef(m.oth.on);
  React.useEffect(() => { if (m.oth.on && !wasOth.current) othRef.current?.focus({ preventScroll: true }); wasOth.current = m.oth.on; }, [m.oth.on]);
  const row = (k: string, on: boolean, label: React.ReactNode, toggle: () => void, right: React.ReactNode, sub?: React.ReactNode) => (
    <li key={k} data-acv21="mrow" data-k={k} data-on={on ? "" : undefined}>
      <div className="ag-mrow">
        <button type="button" role="checkbox" aria-checked={on} data-acv21="mtick" data-k={k} onClick={toggle}>{on ? RTICK : RNONE}<span>{label}</span></button>
        {on ? right : <span className="r" data-acv21="not-asked">not asked for</span>}
      </div>
      {on && sub ? <div className="ag-msub">{sub}</div> : null}
    </li>
  );
  return (
    <>
      <ul className="nx-list ag-mlist" data-acv21="mats" data-mats="">
        {row("ql", m.ql, "Covering letter", () => onMats(MAT_OPS.ql(m)), null)}
        {row("syn", m.syn.on, "Synopsis", () => onMats(m.syn.on ? MAT_OPS.synOff(m) : MAT_OPS.synOn(m)),
          <Step k="syn" noun="pages" words={m.syn.len ? `${m.syn.len} ${m.syn.len === 1 ? "page" : "pages"}` : "Any length"}
            less={() => onMats(MAT_OPS.synLess(m))} more={() => onMats(MAT_OPS.synMore(m))} lessOff={MAT_OPS.synLessOff(m)} moreOff={MAT_OPS.synMoreOff(m)} />)}
        {row("smp", m.smp.on, m.smp.on ? <span data-acv21="smp-label">{smpLabel}</span> : "Opening sample", () => onMats(m.smp.on ? MAT_OPS.smpOff(m) : MAT_OPS.smpOn(m)), null,
          <>
            <span className="ag-useg" role="radiogroup" aria-label="Unit" data-acv21="unit">
              {SAMPLE_UNITS.map((x) => (
                <button key={x} type="button" role="radio" aria-checked={m.smp.unit === x} className={m.smp.unit === x ? "on" : undefined} data-unit={x}
                  onClick={() => onMats(MAT_OPS.smpUnit(m, x))}>{x}</button>
              ))}
            </span>
            <Step k="smp" noun={m.smp.unit.toLowerCase()} words={m.smp.qty ? `First ${m.smp.qty}` : "First …"}
              less={() => onMats(MAT_OPS.smpLess(m))} more={() => onMats(MAT_OPS.smpMore(m))} lessOff={MAT_OPS.smpLessOff(m)} moreOff={MAT_OPS.smpMoreOff(m)} />
            {bad ? <span className="aap-hint bad" data-aap="floor">{floorCopy(m.smp.unit)} for the opening sample.</span> : null}
          </>)}
        {row("oth", m.oth.on, "Other", () => onMats(m.oth.on ? MAT_OPS.othOff(m) : MAT_OPS.othOn(m)),
          <input ref={othRef} className="ag-oth" data-aap="mat-oth-input" value={m.oth.text} placeholder="e.g. Author photo" aria-label="Other"
            onChange={(e) => onMats(MAT_OPS.othType(m, e.target.value))} />)}
      </ul>
    </>
  );
};

export const EditMaterials: React.FC<{ form: AgentForm }> = ({ form }) => (
  <MaterialRows mats={form.d.mats} onMats={(m) => form.set({ mats: m })} />
);

export const EditHow: React.FC<{ form: AgentForm; agent: Agent; kit: CardFormKit; first: string; offers?: OfferKit | null }> = ({ form, kit, first, offers }) => {
  const d = form.d;
  const doorQuiet = (offers?.o.quiet ?? []).filter((l) => l === REOPEN_QUIET);
  const rtQuiet = (offers?.o.quiet ?? []).filter((l) => l !== REOPEN_QUIET);
  /* the release: the range's own change event (pointer up, or each key step) settles the offer */
  const wkRef = React.useRef<HTMLDivElement>(null);
  const onDrag = offers?.onDrag;
  React.useEffect(() => {
    const el = wkRef.current;
    if (!el || !onDrag) return undefined;
    const settle = () => onDrag(false);
    el.addEventListener("change", settle);
    window.addEventListener("pointerup", settle);
    window.addEventListener("pointercancel", settle);
    return () => { el.removeEventListener("change", settle); window.removeEventListener("pointerup", settle); window.removeEventListener("pointercancel", settle); };
  }, [onDrag]);
  return (
    <div className="cl262-how" data-cl262="how-form">
      {/* Agent card v2.1 — the controls in the boxes' order: Replies in (response time, and the reply policy beneath it),
          Takes queries, Open to queries */}
      <AaField label="Response time" k="weeks">
        {/* the offer settles when the slider is released: a press on the thumb holds it, the change event lets it go */}
        <div className="co-wkwrap" ref={wkRef} onPointerDown={(e) => { if ((e.target as HTMLElement).matches("input[type='range']")) offers?.onDrag(true); }}>
          <ResponseTime weeks={d.weeks} onWeeks={(w) => form.set({ weeks: w })} />
        </div>
        {offers ? <><RtOffer kit={offers} first={first} /><Quiet lines={rtQuiet} /></> : null}
      </AaField>
      <AaField label="If they don’t reply" k="nrn"><PolicyPills nrn={d.nrn} onNrn={(v) => form.set({ nrn: v })} /></AaField>
      <AaField label="How they take queries" k="method">
        <MethodPills method={d.method} other={d.methodOther} onChange={(m, o) => form.set({ method: m, methodOther: o })} />
      </AaField>
      <AaField label="Open to queries?" k="door">
        <DoorPills door={d.door} reopens={d.reopens} nowMs={kit.nowMs} first={first} onChange={(door, reopens) => form.set({ door, reopens })} />
      </AaField>
      {offers ? <div className="co-door" data-co="door-offers"><CloseOffer kit={offers} first={first} /><SafeNote kit={offers} first={first} /><Quiet lines={doorQuiet} /></div> : null}
    </div>
  );
};

/** Agent card v2.1 (screens 05–06) — THE CITY OFFER: "{City} is in {country}. Change the country?" in the built offers' dress,
 *  easing in under the Based in row and brought into view by only what it needs */
export const CityOfferBox: React.FC<{ city: string; country: string; kept: ReadonlySet<string>; onKeep: (k: string) => void; onSet: (iso: string) => void }> = ({ city, country, kept, onKeep, onSet }) => {
  const o = cityOffer(city, country, kept);
  const ref = React.useRef<HTMLDivElement>(null);
  const shown = !!o;
  React.useEffect(() => { if (shown) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [shown]);
  if (!o) return null;
  const refocus = () => window.requestAnimationFrame(() => ref.current?.closest("[data-f='country']")?.querySelector<HTMLInputElement>("input[data-ae='city']")?.focus({ preventScroll: true }));
  return (
    <div ref={ref} className="co-offer acv21-geooffer" role="status" data-acv21="city-offer" data-is={o.is}>
      <div className="co-h"><b>{o.head}</b></div>
      <div className="aap-pills co-ask">
        <button type="button" className="aap-pill on" data-acv21="city-set" onClick={() => { onSet(o.is); refocus(); }}>{o.set}</button>
        <button type="button" className="aap-pill" data-acv21="city-keep" onClick={() => { onKeep(keepKey(city, country)); refocus(); }}>{o.keep}</button>
      </div>
    </div>
  );
};

/** Contact details (edit everything): Name and Agency, Based in, Email and Website, the submission link, MSWL, Social */
export const EditContact: React.FC<{ form: AgentForm; agent: Agent; kit: CardFormKit; nameRef?: React.Ref<HTMLInputElement>;
  /** Agent card v2.1 — the city offer's "Keep" answers, remembered while the section is open (city|country) */
  geo?: { kept: ReadonlySet<string>; keep: (k: string) => void } }> = ({ form, nameRef, geo }) => {
  const d = form.d;
  const first = firstOf(d);
  const needAgency = !!d.name.trim() && !d.agency.trim() && !d.agencyUnknown;
  const link = (k: "website" | "form" | "mswl") => (!d[k].trim() ? null : linkOk(d[k])
    ? <span className="aap-note ok">✓ {hostOf(d[k])}</span> : <span className="aap-note bad" data-cl262="problem">That doesn’t look like a link</span>);
  const linkLabel = formLinkLabel(d.method);
  return (
    <div className="cl262-ctg" data-cl262="contact-form">
      <div className="cl262-two">
        <AaField label="Name" k="name">
          <input ref={nameRef} className="aap-inp" data-ae="name" data-cl262="name-input" value={d.name} autoComplete="off" onChange={(e) => form.set({ name: e.target.value })} />
          {form.dup ? <span className="aap-note bad" data-cl262="dup">Already on your list: {form.dup.name}</span> : null}
        </AaField>
        <AaField label="Agency" k="agency">
          {d.agencyUnknown ? (
            <div className="aap-agu cl262-agu" data-cl262="agency-unknown"><span>Agency unknown</span>
              <button type="button" className="aap-mini" data-cl262="agency-undo" onClick={() => form.set({ agencyUnknown: false })}>Add it after all</button></div>
          ) : (
            <input className="aap-inp" data-ae="agency" data-cl262="agency-input" value={d.agency} autoComplete="off"
              onChange={(e) => { const v = e.target.value; form.set({ agency: v, ...(v.trim() ? { agencyUnknown: false } : {}) }); }} />
          )}
        </AaField>
      </div>
      {needAgency ? (
        <div className="aap-agask cl262-agask" role="status" data-cl262="agency-ask">
          <b>Do you know {first}’s agency?</b>
          <p>Having it on file stops you querying two agents at the same agency by mistake, and helps us keep agents’ details up to date. If you really can’t find it, you can carry on without it.</p>
          <div className="aap-agask-b"><button type="button" className="aap-pill" data-cl262="agency-unknown-pill" onClick={() => form.set({ agencyUnknown: true, agency: "" })}>Agency unknown</button></div>
        </div>
      ) : null}
      <AaField label="Based in" k="country">
        {/* Agent card v2.1 — the country control and the city on one row, country first; the flag follows the country
            control and nothing else; a known city in another country gets an offer, never a block */}
        <div className="acv21-geo" data-acv21="geo">
          <CountryPills country={d.country} onCountry={(c) => form.set({ country: c })} />
          <input className="aap-inp" data-ae="city" value={d.city} placeholder="City, if you know it" autoComplete="off" onChange={(e) => form.set({ city: e.target.value })} />
        </div>
        {geo ? <CityOfferBox city={d.city} country={d.country} kept={geo.kept} onKeep={geo.keep} onSet={(iso) => form.set({ country: iso })} /> : null}
      </AaField>
      <div className="cl262-two">
        <AaField label="Email" k="email">
          <input className="aap-inp" data-ae="email" inputMode="email" value={d.email} placeholder="name@agency.co.uk" autoComplete="off" onChange={(e) => form.set({ email: e.target.value })} />
          {d.email.trim() ? (emailOk(d.email) ? <span className="aap-note ok">✓ Looks right</span> : <span className="aap-note bad" data-cl262="problem">That email doesn’t look right</span>) : null}
        </AaField>
        <AaField label="Website" k="website">
          <input className="aap-inp" data-ae="website" value={d.website} placeholder="agency.co.uk" autoComplete="off" onChange={(e) => form.set({ website: e.target.value })} />{link("website")}
        </AaField>
      </div>
      {linkLabel ? (
        <AaField label={linkLabel} k="form">
          <input className="aap-inp" data-ae="form" value={d.form} placeholder={formLinkPlaceholder(d.method)} autoComplete="off" onChange={(e) => form.set({ form: e.target.value })} />{link("form")}
        </AaField>
      ) : null}
      <AaField label="MSWL" k="mswl">
        <input className="aap-inp" data-ae="mswl" value={d.mswl} placeholder="manuscriptwishlist.com/…" autoComplete="off" onChange={(e) => form.set({ mswl: e.target.value })} />{link("mswl")}
      </AaField>
      <AaField label="Social" k="social"><SocialField social={d.social} onSocial={(s) => form.set({ social: s })} /></AaField>
    </div>
  );
};

/** the names the save bar lists, by draft field — two fields that are one thing to the writer share a name */
export const FIELD_NAME: Partial<Record<keyof CardDraft, string>> = {
  name: "name", agency: "agency", agencyUnknown: "agency", country: "country", city: "city", email: "email", website: "website",
  form: "submission link", mswl: "MSWL", social: "social", rating: "agent fit", genres: "genres", wishlist: "wishlist", mats: "materials",
  door: "taking queries", reopens: "reopening date", method: "how they take queries", methodOther: "how they take queries",
  weeks: "response time", nrn: "response policy",
};
export const changeNames = (changed: readonly (keyof CardDraft)[]): string[] => [...new Set(changed.map((k) => FIELD_NAME[k] ?? String(k)))];

/**
 * Agent card v2.1 — THE RUST BAR: only when leaving with something unsaved (another tab, the arrows, ✕, Esc, another agent,
 * another page). It takes the footer's place: "Unsaved changes", the sections named beneath, then Keep editing, Discard
 * and Save all ("Save it" for one). There is no save bar: each open section has its own tick and cross.
 */
export const GuardBar: React.FC<{ names: readonly string[]; busy: boolean; problem: string | null; onKeep: () => void; onDiscard: () => void; onSaveAll: () => void; onSaveAllDown?: () => void }> = ({ names, busy, problem, onKeep, onDiscard, onSaveAll, onSaveAllDown }) => (
  <div className="cl262-save is-guard acv21-guard" data-cl262="save-bar" data-acv21="guard" data-guard="" role="alertdialog" aria-label="Unsaved changes">
    <span className="cl262-sv"><b>Unsaved changes</b><i data-acv21="guard-names">{problem ?? names.join(", ")}</i></span>
    <button type="button" className="cl262-sx" data-cl262="keep" onClick={onKeep}>Keep editing</button>
    <button type="button" className="cl262-sx" data-cl262="discard" onClick={onDiscard}>Discard</button>
    <button type="button" className="cl262-sb" data-acv21="save-all" disabled={busy} onPointerDown={onSaveAllDown} onClick={onSaveAll}>{names.length === 1 ? "Save it" : "Save all"}</button>
  </div>
);
