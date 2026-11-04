/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 Part C (design-refs/contact-list-v26-2/, screens 04–08) — EDITING ON THE CARD: each profile
 * section's fields, drawn where its read-only content was, and the save bar. Every field is the editor's own
 * (`cardInputs`: GenreField, MaterialsField, Stepper, Seg, CountryField, DateField, Combo) over the editor's own draft
 * (`useAgentForm`: `CardDraft`, `changedFields`, the Also-changes dry run, one save). No new field type, and no free
 * text where the editor has a picker.
 *
 * ⚠️ THE SAVE BAR IS ALSO THE DISCARD GUARD: with unsaved changes, ✕, Esc, paging, another row and leaving turn it rust
 *    and ask; nothing else happens until one answer is chosen (Part D).
 */
import React, { useCallback, useMemo, useState } from "react";
import { SubmissionMethod, type Agent } from "../../../types";
import type { AlsoNote } from "../../../lib/contactEdit";
import { agencyOptions, cityOptions, colleagueWeeks, colleaguesOf } from "../../../lib/cardDraft";
import { Combo, CountryField, DateField, GenreField, MaterialsField, Seg, Stepper, type ComboItem } from "../card/cardInputs";
import type { AgentForm } from "../card/useAgentForm";
import type { CardFormKit } from "./AgentCard24";
import "../card/agentCard.css";
import "../card/agentEditMode.css";

/** Submit by — the four ways in */
const METHODS: [SubmissionMethod, string][] = [
  [SubmissionMethod.EMAIL, "Email"], [SubmissionMethod.QUERY_MANAGER, "QueryManager"],
  [SubmissionMethod.ONLINE_FORM, "Online form"], [SubmissionMethod.POST, "Post"],
];

/** an "Also changes" note: indented to the field column, white, a rust left edge */
export const Also: React.FC<{ notes: readonly AlsoNote[]; fields: AlsoNote["field"][]; k: string }> = ({ notes, fields, k }) => {
  const mine = notes.filter((n) => fields.includes(n.field));
  if (!mine.length) return null;
  return (
    <div className="cl262-also" data-cl262="also" data-k={k}>
      <em>Also changes</em>
      {mine.flatMap((n) => n.lines.map((l) => <p key={`${n.field}-${l}`}>{l}</p>))}
    </div>
  );
};

/** a field row with its 120px label column */
const Row: React.FC<{ label: string; k: string; children: React.ReactNode }> = ({ label, k, children }) => (
  <div className="cl262-row" data-cl262="row" data-k={k}><label>{label}</label><div className="cl262-rf">{children}</div></div>
);

export const EditGenres: React.FC<{ form: AgentForm; kit: CardFormKit; isHit: (g: string) => boolean }> = ({ form, kit, isHit }) => (
  <>
    <GenreField presentation="chips" genres={form.d.genres} onGenres={(g) => form.set({ genres: g })}
      options={{ ms: kit.msGenre, pool: kit.genrePool, personal: kit.personalGenres, all: [...kit.allGenres] }}
      isHit={isHit} onNew={kit.onNewGenre} />
    <Also notes={form.also} fields={["genres"]} k="genres" />
  </>
);

export const EditWishlist: React.FC<{ form: AgentForm }> = ({ form }) => {
  const d = form.d;
  return (
    <div className="cl262-wishf">
      {/* the cap is on TYPING (the editor's rule): a stored wishlist longer than 400 is kept and can be cut, never grown */}
      <textarea className="cl262-wta" data-cl262="wish-input" data-ae="wishlist" value={d.wishlist} maxLength={Math.max(400, d.wishlist.length)}
        placeholder="In their words: paste from their MSWL or agency page."
        onChange={(e) => { const v = e.target.value; form.set({ wishlist: v.length > 400 && v.length > d.wishlist.length ? d.wishlist : v }); }} />
      <span className="cl262-cnt" data-cl262="wish-count">{d.wishlist.length} / 400</span>
    </div>
  );
};

export const EditMaterials: React.FC<{ form: AgentForm }> = ({ form }) => (
  <MaterialsField mats={form.d.mats} onMats={(m) => form.set({ mats: m })} />
);

export const EditHow: React.FC<{ form: AgentForm; agent: Agent; kit: CardFormKit; first: string }> = ({ form, agent, kit, first }) => {
  const d = form.d;
  const peerWeeks = useMemo(() => colleagueWeeks(colleaguesOf(d.agency || agent.agency || "", kit.agents, agent.id)), [d.agency, agent, kit.agents]);
  const [cal, setCal] = useState(0);
  return (
    <div className="cl262-how" data-cl262="how-form">
      <Row label="Replies in" k="weeks">
        <Stepper ae="weeks" text={d.weeks ? `About ${d.weeks} week${d.weeks > 1 ? "s" : ""}` : "Unknown"} dec={d.weeks != null && d.weeks > 1} inc={d.weeks == null || d.weeks < 26}
          onStep={(dir) => form.set({ weeks: d.weeks == null ? (dir > 0 ? 6 : null) : Math.max(1, Math.min(26, d.weeks + dir)) })} />
        {d.weeks == null ? (
          peerWeeks ? <button type="button" className="cl262-hint" data-cl262="use-weeks" onClick={() => form.set({ weeks: peerWeeks })}>Use {peerWeeks} weeks · others at {(d.agency || agent.agency || "").trim()}</button>
            : <span className="cl262-hint" data-cl262="weeks-start">Press + to start at 6 weeks</span>
        ) : null}
      </Row>
      <Also notes={form.also} fields={["reply"]} k="reply" />
      <Row label="Response policy" k="nrn">
        <span className="ae-seg wrp" role="radiogroup" aria-label="Response policy" data-ae="nrn">
          {([["yes", "No response means no"], ["no", "Always replies"]] as const).map(([v, l]) => {
            const on = d.nrn != null && (v === "yes") === d.nrn;
            return <button key={v} type="button" role="radio" aria-checked={on} className={on ? "on" : undefined} data-v={v} onClick={() => form.set({ nrn: v === "yes" })}>{l}</button>;
          })}
        </span>
      </Row>
      <Also notes={form.also} fields={["nrn"]} k="nrn" />
      <Row label="Submit by" k="method">
        <Seg<SubmissionMethod> ae="method" label="Submit by" wrap value={d.method} options={METHODS} onPick={(m) => form.set({ method: m })} />
      </Row>
      <Row label="Door" k="door">
        <span className="ae-seg wrp" role="radiogroup" aria-label={`Is ${first} taking queries`} data-ae="door">
          {([["open", "Open"], ["closed", "Closed"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={d.door === v} className={d.door === v ? "on" : undefined} data-v={v}
              onClick={() => { if (v === "open") form.set({ door: "open", reopens: "" }); else { form.set({ door: "closed" }); if (d.door !== "closed") window.setTimeout(() => setCal((x) => x + 1), 40); } }}>{l}</button>
          ))}
        </span>
      </Row>
      {d.door === "closed" ? (
        <Row label="Reopens" k="reopens">
          <DateField value={d.reopens} nowMs={kit.nowMs} openSignal={cal} onPick={(v) => form.set({ reopens: v })} />
        </Row>
      ) : null}
      <Also notes={form.also} fields={["door"]} k="door" />
    </div>
  );
};

/** Contact details (edit everything only): Name, Agency, Country, City, Email, Website — two columns */
export const EditContact: React.FC<{ form: AgentForm; agent: Agent; kit: CardFormKit; nameRef?: React.Ref<HTMLInputElement>; foot?: React.ReactNode }> = ({ form, agent, kit, nameRef, foot }) => {
  const d = form.d;
  const others = useMemo(() => kit.agents.filter((a) => a.id !== agent.id), [kit.agents, agent]);
  const agencies = useMemo(() => agencyOptions(others), [others]);
  const cities = useMemo(() => cityOptions(others), [others]);
  /* the editor's own lists for Agency and City: your list first, a new one by a deliberate pick */
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
  const bad = (k: "name" | "email" | "website") => (form.problems[k] ? <span className="cl262-bad" data-cl262="problem">{form.problems[k]}</span> : null);
  return (
    <div className="cl262-ctg" data-cl262="contact-form">
      <div className="cl262-cf"><label>Name</label>
        <input ref={nameRef} className="ac-in" data-ae="name" data-cl262="name-input" value={d.name} autoComplete="off" onChange={(e) => form.set({ name: e.target.value })} />{bad("name")}
        {form.dup ? <span className="cl262-bad" data-cl262="dup">Already on your list: {form.dup.name}</span> : null}</div>
      <div className="cl262-cf"><label>Agency</label>
        <Combo ae="agency" value={d.agency} placeholder="Start typing, or pick from your list" onType={(v) => form.set({ agency: v })} items={agencyItems}
          onPick={(x) => { form.set({ agency: x.value }); (document.activeElement as HTMLElement | null)?.blur(); }} /></div>
      <div className="cl262-cf"><label>Country</label><CountryField value={d.country} onPick={(c) => form.set({ country: c })} /></div>
      <div className="cl262-cf"><label>City</label>
        <Combo ae="city" value={d.city} placeholder="e.g. London" onType={(v) => form.set({ city: v })} items={cityItems}
          onPick={(x) => { form.set({ city: x.value }); (document.activeElement as HTMLElement | null)?.blur(); }} /></div>
      <div className="cl262-cf"><label>Email</label>
        <input className="ac-in" type="email" data-ae="email" value={d.email} placeholder="name@agency.co.uk" autoComplete="off" onChange={(e) => form.set({ email: e.target.value })} />{bad("email")}</div>
      <div className="cl262-cf"><label>Website</label>
        <input className="ac-in" data-ae="website" value={d.website} placeholder="agency.co.uk" autoComplete="off" onChange={(e) => form.set({ website: e.target.value })} />{bad("website")}</div>
      <Also notes={form.also} fields={["who"]} k="who" />
      {/* v26.3 A — Remove sits at the foot of Contact details, under the grid (edit everything only) */}
      {foot}
    </div>
  );
};

/** the save bar: "{n} changes" (and what else they move), Cancel, Save changes — or the rust discard guard */
export const SaveBar: React.FC<{
  form: AgentForm; guard: { n: number } | null; onCancel: () => void; onSave: () => void; onKeep: () => void; onDiscard: () => void;
}> = ({ form, guard, onCancel, onSave, onKeep, onDiscard }) => {
  const n = form.changed.length;
  const moved = form.also.reduce((k, x) => k + x.lines.length, 0);
  if (guard) {
    return (
      <div className="cl262-save is-guard" data-cl262="save-bar" data-guard="" role="alertdialog" aria-label="Unsaved changes">
        <span className="cl262-sv"><b>Discard {guard.n} unsaved {guard.n === 1 ? "change" : "changes"}?</b></span>
        <button type="button" className="cl262-sx" data-cl262="keep" onClick={onKeep}>Keep editing</button>
        <button type="button" className="cl262-sb" data-cl262="discard" onClick={onDiscard}>Discard</button>
      </div>
    );
  }
  const problem = form.failure ? `Couldn’t save: ${form.failure}` : form.firstProblem ?? (form.dup ? `${form.dup.name} is already on your list` : null);
  return (
    <div className="cl262-save" data-cl262="save-bar" role="status">
      <span className="cl262-sv" data-cl262="save-sum" data-n={n} data-moved={moved}>
        {problem ? <i className="cl262-svbad">{problem}</i>
          : n ? <><b>{n} {n === 1 ? "change" : "changes"}</b>{moved ? <i> · also changes {moved} {moved === 1 ? "thing" : "things"} elsewhere</i> : null}</>
          : <i>No changes yet</i>}
      </span>
      <button type="button" className="cl262-sx" data-cl262="cancel" onClick={onCancel}>Cancel</button>
      <button type="button" className="cl262-sb" data-cl262="save" disabled={!form.canSave} onClick={onSave}>Save changes</button>
    </div>
  );
};
