/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Building a package on a phone, one step at a time (phone last screens v1, 12A; mock `pkA`).
 *
 * name → letter → synopsis → sample pages → extras → check. The band holds the package card building
 * itself (a sand band with "New package" and "Draft", the name, and slot chips: filled navy, the
 * current one outlined, the rest dashed). Each pick is a list with the material's use line; "Write a
 * new letter or synopsis" opens the 11A editor and comes back with the new material chosen.
 *
 * ⚠️ SAVE IS THE PACKAGE MODEL'S OWN (`savePackage`), the same `PkgDraft` the desktop drawer saves, so a
 * package built here is the same document a desktop build with the same picks makes. "Make a copy" of
 * a locked package starts from `dupDraft` and creates a new package; the original is never touched.
 *
 * Slots map to the model: Letter → `letter`, Synopsis → `synopsis`, Sample pages → `version` (the book
 * version the sample is taken from), Extras → `other` (free text).
 */
import React, { useState } from "react";
import { EMPTY_PKG, type PackagesModel, type PkgDraft, type MaterialWithNote } from "../../packages/v4/usePackagesModel";
import { PhoneLetterEditor } from "./PhoneLetterEditor";

type StepId = "name" | "letter" | "synopsis" | "version" | "other" | "check";
const STEPS: StepId[] = ["name", "letter", "synopsis", "version", "other", "check"];
const SLOT: { id: Exclude<StepId, "name" | "check">; label: string }[] = [
  { id: "letter", label: "Letter" }, { id: "synopsis", label: "Synopsis" }, { id: "version", label: "Sample pages" }, { id: "other", label: "Extras" },
];
export const LOCKED_LINE = "Once a package goes out with a query it locks. To change it, make a copy.";

export const PhonePackageFlow: React.FC<{ model: PackagesModel; copyOf?: string | null; onDone: (id: string | null) => void }> = ({ model, copyOf, onDone }) => {
  const src = copyOf ? model.msPkgs.find((p) => p.id === copyOf) ?? null : null;
  const [d, setD] = useState<PkgDraft>(() => (src ? model.dupDraft(src) : { ...EMPTY_PKG }));
  const [at, setAt] = useState(0);
  const [writing, setWriting] = useState<"letter" | "synopsis" | null>(null);
  const [saving, setSaving] = useState(false);
  const step = STEPS[at];
  const go = (s: StepId) => setAt(STEPS.indexOf(s));
  const nameOf = (k: "letter" | "synopsis" | "version", id: string) => (id ? model.matById(k, id)?.name ?? null : null);
  const shown = (s: (typeof SLOT)[number]) => (s.id === "other" ? (d.other.trim() ? "Extras" : null) : nameOf(s.id, d[s.id]));

  if (writing) {
    return <PhoneLetterEditor model={model} m={null} kind={writing} onDone={(id) => { if (id) setD({ ...d, [writing]: id }); setWriting(null); }} />;
  }

  const use = (m: MaterialWithNote) => {
    const sp = model.matSplit(m);
    return [sp.sent ? `Used in ${sp.sent} ${sp.sent === 1 ? "query" : "queries"}` : "Not used yet", sp.requests ? `${sp.requests} ${sp.requests === 1 ? "request" : "requests"}` : null, m.current ? "current" : null].filter(Boolean).join(" · ");
  };
  const Pick: React.FC<{ kind: "letter" | "synopsis" | "version" }> = ({ kind }) => (
    <div className="pmx-group" role="radiogroup" data-pmx={`pick-${kind}`}>
      {model.mats[kind].map((m) => {
        const mw = model.matById(kind, m.id)!;
        return (
          <button key={m.id} type="button" role="radio" aria-checked={d[kind] === m.id} className={`pmx-op${d[kind] === m.id ? " on" : ""}`} data-pmx="op" data-id={m.id}
            onClick={() => { setD({ ...d, [kind]: m.id }); setAt(at + 1); }}>
            <b>{m.name}</b><small>{use(mw)}</small>
          </button>
        );
      })}
      {kind !== "letter" && (
        <button type="button" role="radio" aria-checked={!d[kind]} className={`pmx-op${!d[kind] ? " on" : ""}`} data-pmx="op" data-id=""
          onClick={() => { setD({ ...d, [kind]: "" }); setAt(at + 1); }}>
          <b>{kind === "synopsis" ? "No synopsis" : "No sample version"}</b><small>{kind === "synopsis" ? "Some agents don’t ask for one" : "Choose one later"}</small>
        </button>
      )}
      {kind !== "version" && (
        <button type="button" className="pmx-op" data-pmx="write-new" onClick={() => setWriting(kind)}>
          <b>Write a new {kind}</b><small>Opens the editor</small>
        </button>
      )}
    </div>
  );

  const save = async () => {
    if (saving || !d.letter) return;
    setSaving(true);
    const id = await model.savePackage(d);
    setSaving(false);
    if (id) onDone(id);
  };

  return (
    <div className="pmx" data-pmx="pkgflow" data-step={step}>
      <div className="pmx-top">
        <div className="pmx-bar">
          <button type="button" className="pmx-lnk" onClick={() => (at === 0 ? onDone(null) : setAt(at - 1))} data-pmx="back">‹ {at === 0 ? "Materials" : "Back"}</button>
          <span className="pmx-pos" data-pmx="pos">{Math.min(at + 1, 5)} of 5</span>
        </div>
        <div className="pmx-card" data-pmx="card">
          <div className="pmx-cardband"><span>{src ? `Copy of ${src.packageName}` : "New package"}</span><span>Draft</span></div>
          <div className="pmx-cardname" data-pmx="card-name">{d.name.trim() || "Untitled package"}</div>
          <div className="pmx-slots" data-pmx="slots">
            {SLOT.map((s) => {
              const v = shown(s);
              return <span key={s.id} className={v ? "on" : step === s.id ? "now" : ""} data-slot={s.id}>{v ?? s.label}</span>;
            })}
          </div>
        </div>
      </div>
      <div className="pmx-sheet pmx-sheet--flow">
        {step === "name" && (<>
          <h1 className="pmx-q">What will you call it?</h1>
          <p className="pmx-help">A name to tell it apart, like “Standard UK”.</p>
          <input className="pmx-in" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value, named: true })} aria-label="Package name" data-pmx="name" />
        </>)}
        {step === "letter" && (<><h1 className="pmx-q">Which letter goes in?</h1><Pick kind="letter" /></>)}
        {step === "synopsis" && (<><h1 className="pmx-q">Which synopsis goes in?</h1><Pick kind="synopsis" /></>)}
        {step === "version" && (<><h1 className="pmx-q">Which version are the sample pages from?</h1><Pick kind="version" /></>)}
        {step === "other" && (<>
          <h1 className="pmx-q">Anything else?</h1>
          <p className="pmx-help">An author bio, a pitch line, or whatever the agent asks for.</p>
          <textarea className="pmx-in pmx-ta" value={d.other} onChange={(e) => setD({ ...d, other: e.target.value })} aria-label="Extras" data-pmx="other" />
        </>)}
        {step === "check" && (<>
          <h1 className="pmx-q">Check it over</h1>
          <div className="pmx-group" data-pmx="check">
            {SLOT.map((s) => (
              <button key={s.id} type="button" className="pmx-op" onClick={() => go(s.id)} data-pmx="check-slot" data-slot={s.id}>
                <b>{s.label}</b><small>{s.id === "other" ? (d.other.trim() || "None") : nameOf(s.id, d[s.id]) ?? "None"}</small>
              </button>
            ))}
          </div>
          <p className="pmx-help pmx-lock" data-pmx="locked-line">{LOCKED_LINE}</p>
        </>)}
      </div>
      <div className="pmx-pin">
        {step === "check"
          ? <button type="button" className="pmx-btn" disabled={!d.letter || saving} onClick={() => void save()} data-pmx="save">{saving ? "Saving…" : src ? "Save the copy" : "Save the package"}</button>
          : (step === "name" || step === "other" || (step !== "letter" && step !== "synopsis" && step !== "version"))
            ? <button type="button" className="pmx-btn" onClick={() => setAt(at + 1)} data-pmx="next">Next</button>
            : <button type="button" className="pmx-back" onClick={() => setAt(at + 1)} disabled={step === "letter" && !d.letter} data-pmx="next">{step === "letter" ? "Next" : "Skip"}</button>}
      </div>
    </div>
  );
};
