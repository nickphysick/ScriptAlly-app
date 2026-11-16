/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 Part C, rebuilt by Add agent v1 Phase 4 (design-refs/add-agent-v1/agent-card-edit-v1.html) —
 * EDITING ON THE CARD, with the add journey's own controls (`agentPills`): each profile section's fields drawn where its
 * read-only content was, over the editor's one draft (`useAgentForm`: `CardDraft`, `changedFields`, the Also-changes dry
 * run, one save), and the navy save bar.
 *
 *   Contact details  Name and Agency side by side (the agency rule), Based in, Email and Website side by side, the
 *                    submission link (conditional), MSWL, Social            — powder
 *   Genres, Wishlist                                                         — blush
 *   Materials        "What {First} asks for — pick all that apply"          — sand
 *   How {First} works taking queries, how they take them, response time, if they don't reply — sand
 *
 * ⚠️ THE SAVE BAR IS ALSO THE DISCARD GUARD: with unsaved changes, ✕, Esc, Cancel, paging and another row turn it rust and
 *    ask; nothing else happens until one answer is chosen.
 * ⚠️ CARD OFFERS v1 (design-refs/card-offers-v1/agent-card-edit-v8.html): THE RUST "ALSO CHANGES" BOX IS GONE. What an edit
 *    does to the queries already out is an OFFER that asks (`cardOffers`): the close offer under Taking queries, the
 *    response-time offer under the slider's hint, a powder note when a request in progress is safe, and quiet grey
 *    footnotes for the rest. Nothing happens until Save; the save bar's second line repeats the choice.
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
  AaField, CountryPills, DoorPills, GenreChips, MaterialPills, MethodPills, PolicyPills, ResponseTime, SocialField, WishlistArea,
  formLinkLabel, formLinkPlaceholder,
} from "../card/agentPills";
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
    <GenreChips genres={form.d.genres} onGenres={(g) => form.set({ genres: g })} onNew={kit.onNewGenre}
      options={{ ms: kit.msGenre, pool: kit.genrePool, personal: kit.personalGenres, all: kit.allGenres }} />
  </>
);

export const EditWishlist: React.FC<{ form: AgentForm }> = ({ form }) => (
  <div className="cl262-wishf" data-cl262="wish-form">
    <WishlistArea value={form.d.wishlist} onValue={(v) => form.set({ wishlist: v })} />
  </div>
);

export const EditMaterials: React.FC<{ form: AgentForm }> = ({ form }) => (
  <AaField label={`What ${firstOf(form.d)} asks for`} small="pick all that apply" k="mats">
    <MaterialPills mats={form.d.mats} onMats={(m) => form.set({ mats: m })} />
  </AaField>
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
      <AaField label="Taking queries?" k="door">
        <DoorPills door={d.door} reopens={d.reopens} nowMs={kit.nowMs} first={first} onChange={(door, reopens) => form.set({ door, reopens })} />
      </AaField>
      {offers ? <div className="co-door" data-co="door-offers"><CloseOffer kit={offers} first={first} /><SafeNote kit={offers} first={first} /><Quiet lines={doorQuiet} /></div> : null}
      <AaField label="How they take them" k="method">
        <MethodPills method={d.method} other={d.methodOther} onChange={(m, o) => form.set({ method: m, methodOther: o })} />
      </AaField>
        <AaField label="Response time" k="weeks">
        {/* the offer settles when the slider is released: a press on the thumb holds it, the change event lets it go */}
        <div className="co-wkwrap" ref={wkRef} onPointerDown={(e) => { if ((e.target as HTMLElement).matches("input[type='range']")) offers?.onDrag(true); }}>
          <ResponseTime weeks={d.weeks} onWeeks={(w) => form.set({ weeks: w })} />
        </div>
        {offers ? <><RtOffer kit={offers} first={first} /><Quiet lines={rtQuiet} /></> : null}
      </AaField>
      <AaField label="If they don’t reply" k="nrn"><PolicyPills nrn={d.nrn} onNrn={(v) => form.set({ nrn: v })} /></AaField>
    </div>
  );
};

/** Contact details (edit everything): Name and Agency, Based in, Email and Website, the submission link, MSWL, Social */
export const EditContact: React.FC<{ form: AgentForm; agent: Agent; kit: CardFormKit; nameRef?: React.Ref<HTMLInputElement> }> = ({ form, nameRef }) => {
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
        <CountryPills country={d.country} onCountry={(c) => form.set({ country: c })} />
        <input className="aap-inp" data-ae="city" value={d.city} placeholder="City, if you know it" autoComplete="off" onChange={(e) => form.set({ city: e.target.value })} />
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

/** the save bar: "{n} changes" (by name), the names and what the save also does (the offers' choices), Cancel, Save
 *  changes — or the rust guard */
export const SaveBar: React.FC<{
  form: AgentForm; first: string; guard: { n: number } | null; onCancel: () => void; onSave: () => void; onKeep: () => void; onDiscard: () => void;
  /** Card offers v1 — the second line's tail: "closes 1 query as no reply", "moves 1 query’s dates", … */
  extras?: readonly string[];
}> = ({ form, first, guard, onCancel, onSave, onKeep, onDiscard, extras = [] }) => {
  const names = changeNames(form.changed);
  const n = names.length;
  if (guard) {
    const g = guard.n;
    return (
      <div className="cl262-save is-guard" data-cl262="save-bar" data-guard="" role="alertdialog" aria-label="Unsaved changes">
        <span className="cl262-sv"><b>Discard {g} {g === 1 ? "change" : "changes"} to {first}?</b><i>Nothing has been saved yet.</i></span>
        <button type="button" className="cl262-sx" data-cl262="keep" onClick={onKeep}>Keep editing</button>
        <button type="button" className="cl262-sb" data-cl262="discard" onClick={onDiscard}>Discard</button>
      </div>
    );
  }
  const problem = form.failure ? `Couldn’t save: ${form.failure}` : form.firstProblem ?? (form.dup ? `${form.dup.name} is already on your list` : null);
  return (
    <div className="cl262-save" data-cl262="save-bar" role="status">
      <span className="cl262-sv" data-cl262="save-sum" data-n={n} data-extras={extras.join(" · ")}>
        {problem ? <><b className="cl262-svbad">{problem}</b><i>Fix this to save.</i></>
          : n ? <><b>{n} {n === 1 ? "change" : "changes"}</b><i data-cl262="save-names">{names.slice(0, 3).join(", ")}{extras.map((x) => ` · ${x}`).join("")}</i></>
          : <><b>No changes yet</b><i>Edit as many sections as you like, then save once.</i></>}
      </span>
      <button type="button" className="cl262-sx" data-cl262="cancel" onClick={onCancel}>Cancel</button>
      <button type="button" className="cl262-sb" data-cl262="save" disabled={!form.canSave} onClick={onSave}>Save changes</button>
    </div>
  );
};
