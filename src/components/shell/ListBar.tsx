/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIGHT BAR ABOVE A LIST — extracted from Query Centre v153's `QcBar153` (its frame, markup unchanged) so the
 * Contact list mounts the same bar (Contact list — Query Centre layout v1): an optional lead (the Query Centre's List /
 * Birds-eye switch), the count, Find taking the rest of the width with its "/" key hint (or a clear button while it
 * holds text), then the page's own chips and their menus (`children`).
 *
 * ⚠️ IT RENDERS THE QUERY CENTRE'S OWN CLASSES (`qc153-bar`, `qc153-find`, queries/centre/qcv153.css; the sticky strip
 *    the caller wraps it in is `qc154-tbw`, qcv154/1541/156.css), whose page-scoped rules name `.cl27` beside
 *    `.qc151.qc153`. `QcBar153` renders through this and the markup is held byte-identical.
 * ⚠️ "/" IS NOT BOUND HERE: each page binds it once (the Query Centre's useQcListKeys, the Contact list's own key handler)
 *    and focuses this field.
 * ⚠️ THE `data-*` PROBES ARE THE CALLER'S (`attrs`, `find.attrs`, `find.clearAttrs`).
 */
import React from "react";

type Attrs = Record<string, string>;
const FIND_I = <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>;
const CROSS = <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>;

export const ListBar: React.FC<{
  attrs: Attrs;
  /** before the count (the Query Centre's view switch) */
  lead?: React.ReactNode;
  /** the count cell, whole (its class and probes are the caller's) */
  count: React.ReactNode;
  find: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    inputRef?: React.Ref<HTMLInputElement>;
    disabled?: boolean;
    attrs: Attrs;
    clearAttrs: Attrs;
  };
  /** the chips, then their menus */
  children?: React.ReactNode;
}> = ({ attrs, lead, count, find: f, children }) => (
  <div className="qc153-bar" {...attrs}>
    {lead}
    {count}
    <label className="qc153-find" {...f.attrs}>
      {FIND_I}
      <input ref={f.inputRef} value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.placeholder} aria-label={f.placeholder} autoComplete="off" disabled={f.disabled} />
      {f.value
        ? <button type="button" className="qc153-findx" aria-label="Clear the search" {...f.clearAttrs} onClick={() => f.onChange("")}>{CROSS}</button>
        : <kbd aria-hidden="true">/</kbd>}
    </label>
    {children}
  </div>
);
