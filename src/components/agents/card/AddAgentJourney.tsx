/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add agent v1 Phase 3 (design-refs/add-agent-v1/add-agent-v1.html, scheme B) — "ADDING NEW AGENT": a short journey in
 * the existing agent side panel (`AgentPanelNew`), four sections with one open at a time, in the log card's step
 * grammar, over the editor's own draft (`useAgentForm`, mode "new").
 *
 *   1 Who they are              "Who are you adding?" — Name, Agency, Based in, Agent fit (powder)
 *   2 What {First}'s looking for  genres, wishlist (blush)
 *   3 How to query {First}       taking queries, how, what to send, response time, if they don't reply (sand)
 *   4 How to reach {First}       email, website, the submission link (conditional), MSWL, social (powder / slate)
 *
 * A closed section is a one-line row (number disc, title, hint or summary; a ✓ in the section's colour once filled).
 * Once there is a name or an agency, Who folds into the agent strip; until then 2–4 are locked.
 *
 * ⚠️ NO RED ON ARRIVAL. A problem shows only after an attempt to add, or on a typed field the writer has left.
 * ⚠️ THE AGENCY RULE: a name with no agency stops at Who, once, with a blush note — never red — offering "Agency
 *    unknown". An agency with no name goes straight through. The agency field never suggests agencies from the list.
 * ⚠️ AFTER THE ADD, THE AGENT IS SAVED: the finish screen's gap links open the agent's REAL card in edit mode (B);
 *    they never come back into this form.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SubmissionMethod, type Agent } from "../../../types";
import { FlowHead, FLOW_WORDS } from "../../shared/FlowHead";
import { useAgentForm, type EditorSaveResult } from "./useAgentForm";
import { emailOk, hostOf, linkOk, type CardDraft, type CardMats } from "../../../lib/cardDraft";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { prefersReducedMotion } from "../../../lib/agentMotion";
import {
  AaField, CountryPills, DoorPills, FIT_TIP, FitStars, GenreChips, InfoTip, MaterialPills, MethodPills, PolicyPills,
  ResponseTime, SocialField, WishlistArea, formLinkLabel, formLinkPlaceholder, sampleBad,
} from "./agentPills";
import { floorCopy } from "../../../lib/createQty";
import "./agentPills.css";
import "./addAgentJourney.css";

export type AddSec = "who" | "want" | "query" | "reach";
const ORDER: AddSec[] = ["who", "want", "query", "reach"];
const SHORT: Record<Exclude<AddSec, "who">, string> = { want: "Wishlist", query: "Querying", reach: "Contact details" };
const HINTS: Record<Exclude<AddSec, "who">, string> = { want: "Genres and their wishlist", query: "Open or closed, what to send, reply time", reach: "Email, website, MSWL, social" };

export const DONE_LINE = "This is their card on your Contact list. Anything you skipped will wait in Housekeeping, so nothing’s lost.";

/** the agent's first name, capitalised, or the agency; "them" for nothing */
export function firstOf(name: string, agency: string): string {
  const f = name.trim().split(/\s+/)[0] || agency.trim();
  return f ? f[0].toUpperCase() + f.slice(1) : "them";
}
const initialsOf = (name: string, agency: string): string => {
  const p = (name.trim() || agency.trim()).split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "+";
};
const METHOD_WORD: Partial<Record<SubmissionMethod, string>> = {
  [SubmissionMethod.EMAIL]: "Email", [SubmissionMethod.ONLINE_FORM]: "Online form", [SubmissionMethod.QUERY_MANAGER]: "QueryManager", [SubmissionMethod.POST]: "Post",
};

export interface AddAgentJourneyProps {
  agents: readonly Agent[];
  personal: Parameters<typeof useAgentForm>[0]["personal"];
  msGenre: string | null;
  genrePool: string[];
  personalGenres: string[];
  allGenres: readonly string[];
  nowMs: number;
  prefill?: Partial<CardDraft>;
  onNewGenre: (typed: string) => Promise<{ ok: true; label: string } | { ok: false; reason: string }>;
  /** the create; its id once added */
  onCreate: (d: CardDraft) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  /** ✕ / Esc / Cancel / Discard / Done */
  onLeave: (how: "cancel" | "done", createdId?: string | null) => void;
  onAnother: () => void;
  onOpenDup: (id: string) => void;
  /** the finish screen's card preview — the real AgentCard262 face, for the agent just added */
  renderPreview: (id: string) => React.ReactNode;
}

export const AddAgentJourney: React.FC<AddAgentJourneyProps> = (p) => {
  const [createdId, setCreatedId] = useState<string | null>(null);
  const onSave = useCallback(async (d: CardDraft): Promise<EditorSaveResult> => {
    const r = await p.onCreate(d);
    if ("error" in r) return { ok: false, error: r.error };
    setCreatedId(r.id);
    return { ok: true };
  }, [p]);
  const form = useAgentForm({
    mode: "new", agent: null, prefill: p.prefill, personal: p.personal, agents: p.agents,
    alsoFor: () => [], onSave, onLeave: () => p.onLeave("cancel"), defaultCountry: "GB",
  });
  const { d, set } = form;
  const [open, setOpen] = useState<AddSec>("who");
  const [tried, setTried] = useState(false);
  const [agencyAsk, setAgencyAsk] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);

  const who = d.name.trim() || d.agency.trim();
  const first = firstOf(d.name, d.agency);
  const needAgency = !!d.name.trim() && !d.agency.trim() && !d.agencyUnknown;
  const smpBad = sampleBad(d.mats);
  const emailBad = !!d.email.trim() && !emailOk(d.email) && (touched.email || tried);
  const linkBad = (k: "website" | "form" | "mswl") => !!d[k].trim() && !linkOk(d[k]) && (touched[k] || tried);
  const problem = form.dup ? `${form.dup.name} is already on your list`
    : smpBad ? `Opening sample: ${floorCopy(d.mats.smp.unit).toLowerCase()}`
    : emailBad ? "That email doesn’t look right"
    : (linkBad("website") || linkBad("form") || linkBad("mswl")) ? "One of the links doesn’t look like a link" : null;
  /* add waits on a name or an agency, the agency rule, the duplicate and every typed problem (touched or not) */
  const blocked = !who || needAgency || !!form.dup || smpBad || !emailOk(d.email) || !linkOk(d.website) || !linkOk(d.form) || !linkOk(d.mswl)
    || (d.mats.oth.on && !d.mats.oth.text.trim());

  const FIRST: Record<AddSec, string> = { who: "[data-aaj='name']", want: "[data-aap='genre-input']", query: "[data-door='open']", reach: "[data-aaj='email']" };
  const focusSoon = (sel: string) => window.requestAnimationFrame(() => {
    const el = bodyRef.current?.querySelector<HTMLElement>(sel);
    if (!el) return;
    el.focus({ preventScroll: true });
    if (el instanceof HTMLInputElement) { const n = el.value.length; try { el.setSelectionRange(n, n); } catch { /* not text */ } }
  });
  const askAgency = () => { setAgencyAsk(true); setOpen("who"); focusSoon("[data-aaj='agency']"); };
  const go = (k: AddSec) => {
    if (k === open) return;
    if (k !== "who" && !who) return;
    if (k !== "who" && needAgency) { askAgency(); return; }
    setOpen(k);
    focusSoon(FIRST[k]);
    window.requestAnimationFrame(() => {
      const el = bodyRef.current?.querySelector<HTMLElement>(`[data-aaj-sec='${k}']`);
      el?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
  };
  const add = () => {
    if (!who) { setTried(true); setOpen("who"); focusSoon(FIRST.who); return; }
    if (needAgency) { askAgency(); return; }
    setTried(true);
    if (blocked) return;
    void form.save();
  };

  /* leaving: any answer asks, in the query drawer's own confirm; Esc first answers the ask */
  const askRef = useRef(form.ask);
  askRef.current = form.ask;
  const createdRef = useRef<string | null>(null);
  createdRef.current = createdId;
  const stageRef = useRef<"form" | "done">("form");
  stageRef.current = createdId ? "done" : "form";
  useEscapeLayer(true, () => {
    if (stageRef.current === "done") { p.onLeave("done", createdRef.current); return; }
    if (askRef.current) { form.setAsk(false); return; }
    form.leave();
  }, ESC_LEVEL.card);
  useEffect(() => { if (form.ask) footRef.current?.querySelector<HTMLElement>("[data-aaj='keep']")?.focus(); }, [form.ask]);
  useEffect(() => { focusSoon(FIRST.who); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Enter moves on: to the next text field in the section, then the next section; ⌘/Ctrl+Enter adds */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (createdId) return;
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.metaKey || e.ctrlKey) { e.preventDefault(); add(); return; }
    const t = e.target as HTMLElement;
    if (!(t instanceof HTMLInputElement) || e.defaultPrevented) return;
    if (t.dataset.aap === "genre-input" || t.classList.contains("aap-qn") || t.closest(".ae-cal, .sa-aa-combo")) return;
    e.preventDefault();
    if (t.dataset.aaj === "name" && !d.agency.trim() && !d.agencyUnknown) { bodyRef.current?.querySelector<HTMLElement>("[data-aaj='agency']")?.focus(); return; }
    const sec = t.closest<HTMLElement>("[data-aaj-sec]");
    const fields = sec ? [...sec.querySelectorAll<HTMLInputElement>("input.aap-inp")] : [];
    const at = fields.indexOf(t);
    if (at >= 0 && at < fields.length - 1) { fields[at + 1].focus(); return; }
    if (!who) { setTried(true); return; }
    const next = ORDER[ORDER.indexOf(open) + 1];
    if (next) go(next); else add();
  };

  /* ── the finish screen ── */
  if (createdId) {
    return (
      <div className="aaj aaj--done" data-aaj="journey" data-stage="done" onKeyDown={onKeyDown}>
        <FlowHead title="Agent added" line={DONE_LINE} onClose={() => p.onLeave("done", createdId)} data={{ "data-ap": "new-head", "data-aaj": "head" }} />
        <div className="aaj-body aaj-body--done" ref={bodyRef} data-aaj="body">
          <div className="aaj-ttl" data-aaj="done-title">{first === "them" ? who : first}’s on your list.</div>
          <FitPreview>{p.renderPreview(createdId)}</FitPreview>
          <p className="aaj-fitnote">A preview of their card. You’ll find it on your Contact list.</p>
        </div>
        <div className="aaj-ft" ref={footRef} data-aaj="foot">
          <button type="button" className="aaj-cx" data-aaj="another" onClick={p.onAnother}>Add another agent</button>
          <span style={{ flex: 1 }} />
          <button type="button" className="aaj-save" data-aaj="done" autoFocus onClick={() => p.onLeave("done", createdId)}>Done</button>
        </div>
      </div>
    );
  }

  /* ── the sections ── */
  const filled: Record<AddSec, boolean> = {
    who: !!who,
    want: d.genres.length > 0 || !!d.wishlist.trim(),
    query: d.door != null || d.method != null || d.weeks != null || d.nrn != null || d.mats.ql || d.mats.syn.on || d.mats.smp.on || d.mats.oth.on,
    reach: !!(d.email.trim() || d.website.trim() || d.form.trim() || d.mswl.trim() || d.social.handle.trim()),
  };
  const methodLabel = d.method === SubmissionMethod.OTHER ? (d.methodOther.trim() || "Other") : d.method ? METHOD_WORD[d.method] ?? "" : "";
  const summary: Record<Exclude<AddSec, "who">, string> = {
    want: [d.genres.join(", "), d.wishlist.trim() ? "wishlist added" : ""].filter(Boolean).join(" · "),
    query: [d.door === "open" ? "Open" : d.door === "closed" ? "Closed" : "", methodLabel, sendsOf(d.mats).join(", "), d.weeks ? `about ${d.weeks} weeks` : ""].filter(Boolean).join(" · "),
    reach: [d.email.trim() && "email", d.website.trim() && "website", d.form.trim() && "form", d.mswl.trim() && "MSWL", d.social.handle.trim() && (d.social.platform || "social")]
      .filter(Boolean).join(", ").replace(/^./, (c) => c.toUpperCase()),
  };
  const titles: Record<AddSec, string> = {
    who: "Who they are",
    want: who ? `What ${first}’s looking for` : "What they’re looking for",
    query: who ? `How to query ${first}` : "How to query them",
    reach: who ? `How to reach ${first}` : "How to reach them",
  };
  const place = [d.name.trim() ? (d.agencyUnknown ? "Agency unknown" : d.agency.trim()) : "", d.city.trim(), countryShort(d.country)].filter(Boolean).join(" · ");
  const locked = !who;
  const nav = (k: AddSec) => {
    const next = ORDER[ORDER.indexOf(k) + 1];
    return (
      <div className="aaj-snav">
        {k === "who" ? <span className="aap-note">That’s all you need. The rest can come now or later.</span>
          : <button type="button" className="aaj-skip" data-aaj="back" onClick={() => go(ORDER[ORDER.indexOf(k) - 1])}>Back</button>}
        <span style={{ flex: 1 }} />
        {next ? <button type="button" className="aaj-nx" data-aaj="next" data-go={next} aria-disabled={locked ? "true" : undefined} onClick={() => { if (!locked) go(next); else setTried(true); }}>Next: {SHORT[next as Exclude<AddSec, "who">]} →</button> : null}
      </div>
    );
  };
  const sec = (k: AddSec, body: () => React.ReactNode) => {
    const i = ORDER.indexOf(k) + 1;
    if (k === "who" && open !== "who" && who) {
      return (
        <div key={k} className="aaj-strip" data-k="who" data-aaj="strip" role="button" tabIndex={0} aria-label="Change who they are"
          onClick={() => go("who")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go("who"); } }}>
          <span className="aaj-disc" aria-hidden="true">{initialsOf(d.name, d.agency)}</span>
          <div className="aaj-who"><div className="aaj-nm">{who}</div><div className="aaj-ag" data-aaj="strip-place">{place}</div></div>
          <button type="button" className="aaj-chg" onClick={(e) => { e.stopPropagation(); go("who"); }}>Change</button>
        </div>
      );
    }
    if (open !== k) {
      const done = filled[k];
      return (
        <div key={k} className="aaj-sec" data-k={k} data-aaj-row={k}>
          <button type="button" className="aaj-row" data-go={k} aria-disabled={locked && k !== "who" ? "true" : undefined}
            title={locked && k !== "who" ? "Add a name or an agency first" : undefined} onClick={() => { if (!(locked && k !== "who")) go(k); }}>
            <span className={`aaj-n${done ? " done" : ""}`}>{done ? "✓" : i}</span>
            <span className="aaj-rt">{titles[k]}</span>
            {done && k !== "who" ? <span className="aaj-rv">{summary[k as Exclude<AddSec, "who">]}</span>
              : <span className="aaj-rh">{locked && k !== "who" ? "Add a name or an agency first" : HINTS[k as Exclude<AddSec, "who">] ?? ""}</span>}
            <span className="aaj-chev" aria-hidden="true">›</span>
          </button>
        </div>
      );
    }
    return (
      <div key={k} className="aaj-sec open" data-k={k} data-aaj-sec={k}>
        {k === "who" ? null : <div className="aaj-shead"><span className="aaj-n">{i}</span><h3>{titles[k]}</h3></div>}
        <div className="aaj-sbody aaj-enter">{body()}{nav(k)}</div>
      </div>
    );
  };
  const nameBad = tried && !who;
  const BODIES: Record<AddSec, () => React.ReactNode> = {
    who: () => (
      <>
        <div className="aaj-ttl aaj-ttl--who" data-aaj="who-title">Who are you adding?</div>
        <AaField label="Name" k="name">
          <input className="aap-inp big" data-aaj="name" value={d.name} placeholder="e.g. Sarah Jones" autoComplete="off" aria-invalid={nameBad || form.dup ? true : undefined}
            onChange={(e) => { set({ name: e.target.value }); setTried(false); }} />
          {form.dup ? (
            <div className="aaj-dup" data-aaj="dup">Already on your list: <b>{form.dup.name}</b>{form.dup.agency ? ` · ${form.dup.agency}` : ""}{" "}
              <button type="button" className="aap-mini" data-aaj="open-dup" onClick={() => p.onOpenDup(form.dup!.id)}>Open their card instead</button></div>
          ) : null}
        </AaField>
        <AaField label="Agency" k="agency">
          {d.agencyUnknown ? (
            <div className="aap-agu" data-aaj="agency-unknown"><span>Agency unknown</span>
              <button type="button" className="aap-mini" data-aaj="agency-undo" onClick={() => { set({ agencyUnknown: false }); focusSoon("[data-aaj='agency']"); }}>Add it after all</button></div>
          ) : (
            /* ⚠️ NO SUGGESTIONS FROM THE LIST (16 Oct ruling): a plain field */
            <input className="aap-inp big" data-aaj="agency" value={d.agency} placeholder="e.g. Fenwick & Rowe" autoComplete="off" aria-invalid={nameBad ? true : undefined}
              onChange={(e) => { const v = e.target.value; set({ agency: v, ...(v.trim() ? { agencyUnknown: false } : {}) }); setTried(false); if (v.trim()) setAgencyAsk(false); }} />
          )}
          {nameBad ? <span className="aap-note bad" data-aaj="name-bad">Add their name and agency to put them on your list.</span> : null}
          {agencyAsk && needAgency ? (
            <div className="aap-agask aaj-enter" role="status" data-aaj="agency-ask">
              <b>Do you know {first}’s agency?</b>
              <p>Having it on file stops you querying two agents at the same agency by mistake, and helps us keep agents’ details up to date. If you really can’t find it, you can carry on without it.</p>
              <div className="aap-agask-b">
                <button type="button" className="aap-pill" data-aaj="agency-unknown-pill" onClick={() => { set({ agencyUnknown: true, agency: "" }); setAgencyAsk(false); }}>Agency unknown</button>
                <button type="button" className="aap-mini" data-aaj="agency-focus" onClick={() => focusSoon("[data-aaj='agency']")}>I’ll add it</button>
              </div>
            </div>
          ) : null}
        </AaField>
        <AaField label="Based in" k="country">
          <CountryPills country={d.country} onCountry={(c) => set({ country: c })} />
          <input className="aap-inp" data-aaj="city" value={d.city} placeholder="City, if you know it" autoComplete="off" onChange={(e) => set({ city: e.target.value })} />
        </AaField>
        <AaField label="Agent fit" k="fit" info={<InfoTip>{FIT_TIP}</InfoTip>}>
          <FitStars value={d.rating} onPick={(n) => set({ rating: n })} />
        </AaField>
      </>
    ),
    want: () => (
      <>
        <AaField label="Genres" k="genres">
          <GenreChips genres={d.genres} onGenres={(g) => set({ genres: g })} onNew={p.onNewGenre}
            options={{ ms: p.msGenre, pool: p.genrePool, personal: p.personalGenres, all: p.allGenres }} />
        </AaField>
        <AaField label="Wishlist" k="wishlist"><WishlistArea value={d.wishlist} onValue={(v) => set({ wishlist: v })} /></AaField>
      </>
    ),
    query: () => (
      <>
        <AaField label="Taking queries?" k="door">
          <DoorPills door={d.door} reopens={d.reopens} nowMs={p.nowMs} first={first} onChange={(door, reopens) => set({ door, reopens })} />
        </AaField>
        <AaField label="How they take them" k="method">
          <MethodPills method={d.method} other={d.methodOther} onChange={(m, o) => set({ method: m, methodOther: o })} />
        </AaField>
        <AaField label="What to send" small="pick all that apply" k="mats"><MaterialPills mats={d.mats} onMats={(m) => set({ mats: m })} /></AaField>
        <AaField label="Response time" k="weeks"><ResponseTime weeks={d.weeks} onWeeks={(w) => set({ weeks: w })} /></AaField>
        <AaField label="If they don’t reply" k="nrn"><PolicyPills nrn={d.nrn} onNrn={(v) => set({ nrn: v })} /></AaField>
      </>
    ),
    reach: () => {
      const linkLabel = formLinkLabel(d.method);
      const link = (k: "website" | "form" | "mswl") => (!d[k].trim() ? null
        : linkBad(k) ? <span className="aap-note bad" data-aaj={`${k}-bad`}>That doesn’t look like a link</span>
        : linkOk(d[k]) ? <span className="aap-note ok">✓ {hostOf(d[k])}</span> : null);
      const touch = (k: string) => () => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
      return (
        <>
          <AaField label="Email" k="email">
            <input className="aap-inp" data-aaj="email" inputMode="email" value={d.email} placeholder="name@agency.co.uk" autoComplete="off" aria-invalid={emailBad ? true : undefined}
              onBlur={touch("email")} onChange={(e) => set({ email: e.target.value })} />
            {d.email.trim() && (touched.email || tried) ? (emailOk(d.email) ? <span className="aap-note ok">✓ Looks right</span> : <span className="aap-note bad" data-aaj="email-bad">That email doesn’t look right</span>) : null}
          </AaField>
          <AaField label="Website" k="website">
            <input className="aap-inp" data-aaj="website" value={d.website} placeholder="agency.co.uk" autoComplete="off" onBlur={touch("website")} onChange={(e) => set({ website: e.target.value })} />{link("website")}
          </AaField>
          {linkLabel ? (
            <AaField label={linkLabel} k="form">
              <input className="aap-inp" data-aaj="form" value={d.form} placeholder={formLinkPlaceholder(d.method)} autoComplete="off" onBlur={touch("form")} onChange={(e) => set({ form: e.target.value })} />{link("form")}
            </AaField>
          ) : null}
          <AaField label="MSWL" k="mswl">
            <input className="aap-inp" data-aaj="mswl" value={d.mswl} placeholder="manuscriptwishlist.com/…" autoComplete="off" onBlur={touch("mswl")} onChange={(e) => set({ mswl: e.target.value })} />{link("mswl")}
          </AaField>
          <AaField label="Social" k="social"><SocialField social={d.social} onSocial={(s) => set({ social: s })} /></AaField>
          {!linkLabel && !d.method ? <p className="aap-note aaj-formhint">If they take queries through a form, QueryManager or somewhere else, pick that under How to query {who ? first : "them"} and a place for the link appears here.</p> : null}
        </>
      );
    },
  };

  let sumLine: React.ReactNode;
  if (form.failure) sumLine = <span className="bad">Couldn’t add them: {form.failure}</span>;
  else if (problem) sumLine = <span className="bad" data-aaj="problem">{problem}</span>;
  else if (tried && !who) sumLine = <span className="bad">A name or an agency is needed</span>;
  else if (agencyAsk && needAgency) sumLine = <>Add {first}’s agency, or mark it unknown.</>;
  else if (who) sumLine = <><b>{who}</b> will be added to your list.</>;
  else sumLine = "Add their name and agency to start.";

  return (
    <div className="aaj" data-aaj="journey" data-stage="form" data-open={open} onKeyDown={onKeyDown}>
      <FlowHead title={FLOW_WORDS.agent.title} line={FLOW_WORDS.agent.line} onClose={() => form.leave()} data={{ "data-ap": "new-head", "data-aaj": "head" }} />
      <div className="aaj-body" ref={bodyRef} data-aaj="body">
        {ORDER.map((k) => sec(k, BODIES[k]))}
      </div>
      <div className="aaj-ft" ref={footRef} data-aaj="foot">
        <span className="aaj-sum" data-aaj="sum">{sumLine}</span>
        <button type="button" className="aaj-cx" data-aaj="cancel" onClick={() => form.leave()}>Cancel</button>
        <button type="button" className="aaj-save" data-aaj="add" aria-disabled={blocked || form.saving ? "true" : undefined} onClick={add}>Add to your list</button>
        {form.ask ? (
          <div className="qad-conf aaj-conf" data-qad-discard data-aaj="discard-ask">
            <span><b>Discard this?</b>Nothing has been saved yet.</span>
            <button type="button" className="keep" data-aaj="keep" onClick={() => form.setAsk(false)}>Keep going</button>
            <button type="button" className="disc" data-aaj="discard" onClick={form.discard}>Discard</button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** what the query section's summary lists as sent, in the house's material words */
function sendsOf(m: CardMats): string[] {
  const out: string[] = [];
  if (m.ql) out.push("Covering letter");
  if (m.syn.on) out.push(m.syn.len ? `${m.syn.len}-page synopsis` : "Synopsis");
  if (m.smp.on && m.smp.qty) out.push(`First ${m.smp.qty.toLocaleString("en-GB")} ${m.smp.qty === 1 ? m.smp.unit.toLowerCase().replace(/s$/, "") : m.smp.unit.toLowerCase()}`);
  if (m.oth.on && m.oth.text.trim()) out.push(m.oth.text.trim());
  return out;
}

/** "UK" for GB and "US"; the country's name otherwise (for the strip's place line) */
function countryShort(c: string): string {
  if (!c) return "";
  if (c === "GB") return "UK";
  if (c === "US") return "US";
  if (c === "IE") return "Ireland";
  try { return new Intl.DisplayNames(["en-GB"], { type: "region" }).of(c) ?? c; } catch { return c; }
}

/**
 * THE WHOLE CARD IN VIEW: the preview is scaled down to the room there is — measured, never above 1, re-fitted on
 * resize (and when the card itself changes size, as its data lands).
 */
const FitPreview: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const box = useRef<HTMLDivElement>(null);
  const inn = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const b = box.current, i = inn.current;
    if (!b || !i) return undefined;
    const fit = () => {
      const ih = i.offsetHeight + 16, iw = i.offsetWidth + 12;
      if (!ih || !b.clientHeight) return;
      const s = Math.min(1, b.clientHeight / ih, b.clientWidth / iw);
      setK(s); setH(i.offsetHeight);
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(b); ro?.observe(i);
    window.addEventListener("resize", fit);
    return () => { ro?.disconnect(); window.removeEventListener("resize", fit); };
  }, []);
  return (
    <div className="aaj-fit" ref={box} data-aaj="fit">
      <div className="aaj-fitin" ref={inn} data-aaj="fit-in" data-scale={k.toFixed(3)} style={{ transform: `scale(${k})`, marginBottom: -(1 - k) * h }}>{children}</div>
    </div>
  );
};
