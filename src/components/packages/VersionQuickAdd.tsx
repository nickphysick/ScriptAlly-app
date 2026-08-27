/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `＋ Add` on the rail's Versions section — a name, a kind, and a write to the MANUSCRIPT (D11).
 *
 * ⚠️ IT ASKS FOR THE KIND. `BookVersionKind` has no neutral member, so defaulting it would write
 * "this is a revision" about an ordering the writer never described that way — the same
 * fabricated-value rule the package builder's own inline creator follows.
 *
 * ⚠️ AND IT IS NOT A SECOND WRITER. `onCreate` is the page's `createBookVersion`, which is what the
 * builder's `＋ New version…` already calls; this component owns two fields and nothing else.
 */
import React, { useState } from "react";
import { BOOK_VERSION_KINDS, KIND_LABEL } from "../../lib/bookVersions";
import type { BookVersionKind } from "../../types";

export interface VersionQuickAddProps {
  onCancel: () => void;
  onCreate: (name: string, kind: BookVersionKind) => Promise<string | null>;
}

export const VersionQuickAdd: React.FC<VersionQuickAddProps> = ({ onCancel, onCreate }) => {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<BookVersionKind>(BOOK_VERSION_KINDS[0]);
  const [busy, setBusy] = useState(false);

  return (
    <div className="bldr-vadd">
      <input
        type="text" autoFocus maxLength={80} placeholder="Prologue-first"
        value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } }}
      />
      <select aria-label="Kind of version" value={kind}
              onChange={(e) => setKind(e.target.value as BookVersionKind)}>
        {BOOK_VERSION_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
      </select>
      <button type="button" className="bldr-btn" disabled={!name.trim() || busy}
              onClick={async () => { setBusy(true); await onCreate(name.trim(), kind); setBusy(false); }}>
        Add
      </button>
      <button type="button" className="bldr-btn" onClick={onCancel}>Cancel</button>
    </div>
  );
};
