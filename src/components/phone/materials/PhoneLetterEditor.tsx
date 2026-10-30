/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Writing a letter or synopsis on a phone (phone last screens v1, 11A; mock `letB`).
 *
 * Full screen: the band holds "‹ Materials", the material's name, its use line and Done; the sheet
 * holds the text; a bar above the keyboard holds the word count.
 *
 * ⚠️ THE STORE IS PLAIN TEXT, SO THERE IS NO FORMATTING BAR. A material's text is `contentDraft`, a
 * plain string rendered as text everywhere it shows. Bold, italic, a list or a quote would be
 * characters the rest of the app prints literally, so only the word count is drawn (reported).
 *
 * ⚠️ A MATERIAL THAT HAS GONE OUT NEVER CHANGES. The editor says so in blush, and Save creates the next
 * version through the package model's own writer (`saveMaterial` with `newVersionDraft`'s name);
 * one that has not gone out saves in place through the same writer. Discard asks first when there
 * are changes. The typing is kept on this device (try/catch) until Save, so a closed tab loses none.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { MaterialWithNote, PackagesModel } from "../../packages/v4/usePackagesModel";
import { countWords } from "../../../lib/materialDraft";

const KIND_NAME = { letter: "letter", synopsis: "synopsis", version: "version" } as const;
const draftKey = (key: string) => `sa.matDraft.${key}`;
const readDraft = (key: string): string | null => { try { return localStorage.getItem(draftKey(key)); } catch { return null; } };
const writeDraft = (key: string, t: string | null) => { try { if (t === null) localStorage.removeItem(draftKey(key)); else localStorage.setItem(draftKey(key), t); } catch { /* storage refused: typing is still on screen */ } };

/** A new material when `m` is null: `kind` says which. Returns the saved material's id through `onDone`. */
export const PhoneLetterEditor: React.FC<{
  model: PackagesModel; m: MaterialWithNote | null; kind: "letter" | "synopsis"; onDone: (savedId: string | null) => void;
}> = ({ model, m, kind, onDone }) => {
  const key = m ? m.id : `new-${kind}-${model.msId}`;
  const original = m?.text ?? "";
  const [text, setText] = useState(() => readDraft(key) ?? original);
  const [name, setName] = useState(m?.name ?? (kind === "letter" ? "New letter" : "New synopsis"));
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const gone = !!m && model.materialGoneOut(m.id);
  const next = useMemo(() => (m && gone ? model.newVersionDraft(m) : null), [m, gone, model]);
  const split = m ? model.matSplit(m) : null;
  const useLine = m ? [split && split.sent ? `Used in ${split.sent} ${split.sent === 1 ? "query" : "queries"}` : "Not used yet", m.current ? "current" : null].filter(Boolean).join(" · ") : "New";
  const dirty = text !== original || (!m && name.trim() !== "");
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { writeDraft(key, text === original ? null : text); }, [key, text, original]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const id = next
      ? await model.saveMaterial({ ...next, text })
      : await model.saveMaterial({ ...(m ? { editId: m.id } : {}), kind, name: name.trim() || (kind === "letter" ? "New letter" : "New synopsis"), note: m?.note ?? "", text });
    setSaving(false);
    if (id) { writeDraft(key, null); onDone(id); }
  };
  const discard = () => { if (dirty && !asking) { setAsking(true); return; } writeDraft(key, null); onDone(null); };

  return (
    <div className="pmx" data-pmx="editor" data-gone={gone ? "1" : "0"}>
      <div className="pmx-top">
        <div className="pmx-bar">
          <button type="button" className="pmx-lnk" onClick={discard} data-pmx="back">‹ Materials</button>
          <button type="button" className="pmx-lnk" onClick={() => void save()} disabled={!dirty || saving} data-pmx="done">Done</button>
        </div>
        {m ? <h1 className="pmx-h" data-pmx="name">{m.name}</h1>
          : <input className="pmx-hin" value={name} onChange={(e) => setName(e.target.value)} aria-label={`Name of the ${KIND_NAME[kind]}`} data-pmx="name-in" />}
        <p className="pmx-use" data-pmx="use">{useLine}</p>
      </div>
      <div className="pmx-sheet">
        {gone && next && <p className="pmx-note" data-pmx="gone">This {KIND_NAME[kind]} has gone out, so your changes save as <b>{next.name}</b>. {m!.name} stays as it was sent.</p>}
        <textarea ref={ta} className="pmx-txt" value={text} onChange={(e) => setText(e.target.value)} aria-label="The text" data-pmx="text" />
        <div className="pmx-fmt" data-pmx="fmt"><span className="pmx-sp" /><span className="pmx-wc" data-pmx="words">{countWords(text)} words</span></div>
      </div>
      <div className="pmx-pin">
        {asking
          ? <><span className="pmx-ask">Discard your changes?</span>
              <button type="button" className="pmx-back" onClick={() => setAsking(false)} data-pmx="keep">Keep writing</button>
              <button type="button" className="pmx-btn" onClick={discard} data-pmx="discard-yes">Discard</button></>
          : <><button type="button" className="pmx-back" onClick={discard} data-pmx="discard">Discard</button>
              <button type="button" className="pmx-btn" disabled={!dirty || saving} onClick={() => void save()} data-pmx="save">
                {saving ? "Saving…" : next ? `Save as ${next.name}` : "Save"}</button></>}
      </div>
    </div>
  );
};
