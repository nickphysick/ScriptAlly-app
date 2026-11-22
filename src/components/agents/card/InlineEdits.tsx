/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.2 C1 (design-refs/contact-list-v25-2/screens/05–08) — EDITS IN PLACE on the agent card. Each opens
 * where its fact sits, in a white box with a 1.5px navy ring, Cancel (outline) and Save (navy) in Special Elite 14.5.
 * Escape cancels; Enter saves a single-line field. Save writes through the agent's one save path (`useAgentSave`) and
 * the card says so in a toast ("Saved to {first}'s profile").
 *
 *   wishlist    a textarea in italic 17, "In their words: paste from their MSWL or agency page."
 *   genres      the app's genre list and matcher (GenreField), never free text
 *   replies     a weeks stepper, then the policy as three pills, and the line saying what it changes
 *   a contact   email · website · submission form · social, each an input on its own row
 */
import React, { useEffect, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { SOCIAL_PLATFORMS } from "../../../lib/agentOptions";
import { type CardDraft, emailOk, linkOk } from "../../../lib/cardDraft";
import { GenreField, Seg, Stepper } from "./cardInputs";
import "./agentCard.css";
import "./inlineEdits.css";

export type InlineField = "wishlist" | "genres" | "replies" | "email" | "website" | "form" | "social";

export interface GenreKit {
  options: { ms: string | null; pool: string[]; personal: string[]; all: string[] };
  isHit: (g: string) => boolean;
  onNew: (typed: string) => Promise<{ ok: true; label: string } | { ok: false; reason: string }>;
}

/** The box: a navy ring, the fields, then Cancel and Save. Escape cancels it before anything under it hears the key. */
export const InlineBox: React.FC<{
  k: InlineField; onCancel: () => void; onSave: () => void; saving: boolean; canSave?: boolean; error?: string | null;
  children: React.ReactNode; row?: boolean;
}> = ({ k, onCancel, onSave, saving, canSave = true, error, children, row }) => {
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  useEscapeLayer(true, () => cancel.current(), ESC_LEVEL.pageModal);
  return (
    <div className={`ac cl252-ib${row ? " row" : ""}`} data-cl252="inline" data-k={k}
      onClick={(e) => e.stopPropagation()}>
      <div className="cl252-ibf">{children}</div>
      <div className="cl252-iba">
        {error ? <span className="cl252-iberr" data-cl252="inline-error">{error}</span> : null}
        <button type="button" className="cl252-ib2" data-cl252="inline-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="cl252-ib1" data-cl252="inline-save" disabled={saving || !canSave} onClick={onSave}>Save</button>
      </div>
    </div>
  );
};

/** One inline edit's draft and save — the change goes through the agent's one save path. */
function useInline(save: (change: Partial<CardDraft>) => Promise<boolean>, onDone: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (change: Partial<CardDraft>) => {
    setSaving(true); setError(null);
    const ok = await save(change);
    setSaving(false);
    if (ok) onDone(); else setError("Couldn’t save that. Try again.");
  };
  return { saving, error, run };
}

export const InlineWishlist: React.FC<{ draft: CardDraft; save: (c: Partial<CardDraft>) => Promise<boolean>; onDone: () => void }> = ({ draft, save, onDone }) => {
  const [v, setV] = useState(draft.wishlist);
  const s = useInline(save, onDone);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <InlineBox k="wishlist" onCancel={onDone} onSave={() => void s.run({ wishlist: v })} saving={s.saving} error={s.error} canSave={v.trim() !== draft.wishlist.trim()}>
      <textarea ref={ref} className="cl252-iwish" data-cl252="inline-input" value={v} maxLength={Math.max(400, draft.wishlist.length)}
        aria-label="What they’re looking for" onChange={(e) => setV(e.target.value)} />
      <small className="cl252-ihint">In their words: paste from their MSWL or agency page.</small>
    </InlineBox>
  );
};

export const InlineGenres: React.FC<{ draft: CardDraft; kit: GenreKit; save: (c: Partial<CardDraft>) => Promise<boolean>; onDone: () => void }> = ({ draft, kit, save, onDone }) => {
  const [g, setG] = useState<string[]>(draft.genres);
  const s = useInline(save, onDone);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const same = g.length === draft.genres.length && g.every((x, i) => x === draft.genres[i]);
  return (
    <InlineBox k="genres" onCancel={onDone} onSave={() => void s.run({ genres: g })} saving={s.saving} error={s.error} canSave={!same}>
      <GenreField genres={g} onGenres={setG} options={kit.options} isHit={kit.isHit} onNew={kit.onNew} inputRef={ref} />
    </InlineBox>
  );
};

export const InlineReplies: React.FC<{ draft: CardDraft; first: string; save: (c: Partial<CardDraft>) => Promise<boolean>; onDone: () => void }> = ({ draft, first, save, onDone }) => {
  const [w, setW] = useState<number | null>(draft.weeks);
  const [nrn, setNrn] = useState<boolean | null>(draft.nrn);
  const s = useInline(save, onDone);
  const stated = draft.nrn != null;
  return (
    <InlineBox k="replies" onCancel={onDone} saving={s.saving} error={s.error} canSave={w !== draft.weeks || nrn !== draft.nrn}
      onSave={() => void s.run({ ...(w !== draft.weeks ? { weeks: w } : {}), ...(nrn !== draft.nrn ? { nrn } : {}) })}>
      <span className="cl252-ilab">Replies in</span>
      {/* decision 9: no road back to "not known" — the minus stops at one week */}
      <Stepper ae="inline-weeks" text={w ? `About ${w} week${w > 1 ? "s" : ""}` : "Not known"} dec={w != null && w > 1} inc={w == null || w < 26}
        onStep={(dir) => setW(w == null ? (dir > 0 ? 6 : null) : Math.max(1, Math.min(26, w + dir)))} />
      <span className="ae-seg wrp" role="radiogroup" aria-label="Response policy" data-cl252="inline-policy">
        <button type="button" role="radio" aria-checked={nrn === false} className={nrn === false ? "on" : undefined} onClick={() => setNrn(false)}>Always replies</button>
        <button type="button" role="radio" aria-checked={nrn === true} className={nrn === true ? "on" : undefined} onClick={() => setNrn(true)}>No response means no</button>
        <button type="button" role="radio" aria-checked={nrn == null} className={nrn == null ? "on" : undefined} disabled={stated}
          title={stated ? "Once stated, a response policy can be changed but not unstated" : undefined} onClick={() => setNrn(null)}>Not known</button>
      </span>
      <small className="cl252-ihint" data-cl252="inline-warn">This sets when QueryHawk suggests a nudge for your queries to {first}.</small>
    </InlineBox>
  );
};

const ROW_WORD: Record<"email" | "website" | "form" | "social", { label: string; ph: string }> = {
  email: { label: "Email", ph: "name@agency.co.uk" },
  website: { label: "Website", ph: "agency.co.uk" },
  form: { label: "Submission form", ph: "querymanager.com/… or the agency’s form" },
  social: { label: "Social", ph: "@handle or profile link" },
};

export const InlineContact: React.FC<{ k: "email" | "website" | "form" | "social"; draft: CardDraft; save: (c: Partial<CardDraft>) => Promise<boolean>; onDone: () => void }> = ({ k, draft, save, onDone }) => {
  const start = k === "social" ? draft.social.handle : draft[k];
  const [v, setV] = useState(start);
  const [platform, setPlatform] = useState(draft.social.platform || "");
  const s = useInline(save, onDone);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const bad = k === "email" ? !emailOk(v) : k === "social" ? false : !linkOk(v);
  const changed = v.trim() !== start.trim() || (k === "social" && platform !== (draft.social.platform || ""));
  const change: Partial<CardDraft> = k === "social" ? { social: { platform: platform || "Other", handle: v } } : { [k]: v } as Partial<CardDraft>;
  return (
    <InlineBox k={k} row onCancel={onDone} onSave={() => void s.run(change)} saving={s.saving} canSave={changed && !bad}
      error={bad ? (k === "email" ? "That isn’t an email address yet" : "That doesn’t look like a link") : s.error}>
      {k === "social" ? (
        <Seg<string> ae="inline-platform" label="Platform" wrap small value={platform || null}
          options={SOCIAL_PLATFORMS.map((x) => [x, x] as [string, string])} onPick={setPlatform} />
      ) : null}
      <input ref={ref} className="cl252-iin" data-cl252="inline-input" type={k === "email" ? "email" : "text"} value={v} autoComplete="off"
        placeholder={ROW_WORD[k].ph} aria-label={ROW_WORD[k].label}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && changed && !bad) { e.preventDefault(); void s.run(change); } }} />
    </InlineBox>
  );
};
