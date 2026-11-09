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
 * ⚠️ "ALSO CHANGES" SHOWS INSIDE THE SECTION THAT CAUSES IT (the existing `alsoFor` engine), never as a sum.
 */
import React from "react";
import type { Agent } from "../../../types";
import type { AlsoNote } from "../../../lib/contactEdit";
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

/** an "Also changes" note: white, a rust left edge, inside the section that causes it */
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

const firstOf = (d: Pick<CardDraft, "name" | "agency">) => {
  const f = d.name.trim().split(/\s+/)[0] || d.agency.trim();
  return f ? f[0].toUpperCase() + f.slice(1) : "them";
};

export const EditGenres: React.FC<{ form: AgentForm; kit: CardFormKit; isHit: (g: string) => boolean }> = ({ form, kit }) => (
  <>
    <GenreChips genres={form.d.genres} onGenres={(g) => form.set({ genres: g })} onNew={kit.onNewGenre}
      options={{ ms: kit.msGenre, pool: kit.genrePool, personal: kit.personalGenres, all: kit.allGenres }} />
    <Also notes={form.also} fields={["genres"]} k="genres" />
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

export const EditHow: React.FC<{ form: AgentForm; agent: Agent; kit: CardFormKit; first: string }> = ({ form, kit, first }) => {
  const d = form.d;
  return (
    <div className="cl262-how" data-cl262="how-form">
      <AaField label="Taking queries?" k="door">
        <DoorPills door={d.door} reopens={d.reopens} nowMs={kit.nowMs} first={first} onChange={(door, reopens) => form.set({ door, reopens })} />
      </AaField>
      <Also notes={form.also} fields={["door"]} k="door" />
      <AaField label="How they take them" k="method">
        <MethodPills method={d.method} other={d.methodOther} onChange={(m, o) => form.set({ method: m, methodOther: o })} />
      </AaField>
      <AaField label="Response time" k="weeks"><ResponseTime weeks={d.weeks} onWeeks={(w) => form.set({ weeks: w })} /></AaField>
      <Also notes={form.also} fields={["reply"]} k="reply" />
      <AaField label="If they don’t reply" k="nrn"><PolicyPills nrn={d.nrn} onNrn={(v) => form.set({ nrn: v })} /></AaField>
      <Also notes={form.also} fields={["nrn"]} k="nrn" />
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
      <Also notes={form.also} fields={["who"]} k="who" />
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

/** the save bar: "{n} changes" (by name), the names and the nudges they move, Cancel, Save changes — or the rust guard */
export const SaveBar: React.FC<{
  form: AgentForm; first: string; guard: { n: number } | null; onCancel: () => void; onSave: () => void; onKeep: () => void; onDiscard: () => void;
}> = ({ form, first, guard, onCancel, onSave, onKeep, onDiscard }) => {
  const names = changeNames(form.changed);
  const n = names.length;
  /* the engine's own count of live queries whose expected date (and so their nudge) the change moves */
  const nudges = form.also.filter((x) => x.field === "reply").reduce((k, x) => k + (x.moved ?? 0), 0);
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
      <span className="cl262-sv" data-cl262="save-sum" data-n={n} data-moved={nudges}>
        {problem ? <><b className="cl262-svbad">{problem}</b><i>Fix this to save.</i></>
          : n ? <><b>{n} {n === 1 ? "change" : "changes"}</b><i data-cl262="save-names">{names.slice(0, 3).join(", ")}{nudges ? ` · moves ${nudges} ${nudges === 1 ? "nudge" : "nudges"}` : ""}</i></>
          : <><b>No changes yet</b><i>Edit as many sections as you like, then save once.</i></>}
      </span>
      <button type="button" className="cl262-sx" data-cl262="cancel" onClick={onCancel}>Cancel</button>
      <button type="button" className="cl262-sb" data-cl262="save" disabled={!form.canSave} onClick={onSave}>Save changes</button>
    </div>
  );
};
