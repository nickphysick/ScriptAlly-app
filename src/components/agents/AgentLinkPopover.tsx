/**
 * AgentLinkPopover — inline URL editor for the hero link pills (interaction layer 6a). Portalled to
 * document.body inside a .t-f12 wrapper (tokens resolve, no clip), positioned by the caller's
 * useFixedMenu `style`. URL is validated; Save is disabled until it's valid. A populated field can
 * be removed. We never navigate here — the caller does the write.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** A permissive-but-real URL check: accepts bare domains ("agency.com") + full URLs, requires a dot. */
export const isValidLinkUrl = (v: string): boolean => {
  const s = v.trim();
  if (!s || /\s/.test(s)) return false;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes(".") && u.hostname.length >= 3;
  } catch {
    return false;
  }
};

/** The display domain for a saved link ("www.foo.com/x" → "foo.com"). */
export const linkDomain = (v: string): string => {
  const s = v.trim();
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch {
    return s;
  }
};

export const AgentLinkPopover: React.FC<{
  label: string;
  value?: string;
  style?: React.CSSProperties;
  onSave: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}> = ({ label, value, style, onSave, onRemove, onClose }) => {
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || (t instanceof Element && t.closest(".f12-popwrap"))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const valid = isValidLinkUrl(draft);
  const save = () => { if (valid) onSave(draft.trim()); };

  return createPortal(
    <div className="t-f12">
      <div ref={ref} className="ag-linkpop" style={{ zIndex: 60, ...style }} role="dialog" aria-label={`Edit ${label}`}>
        <div className="ag-linkpop-h">{label}</div>
        <input
          ref={inputRef}
          type="url"
          value={draft}
          placeholder="https://…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
          aria-label={`${label} URL`}
        />
        <div className="ag-linkpop-fa">
          {value ? <button type="button" className="ag-linkpop-rm" onClick={onRemove}>Remove</button> : <span />}
          <button type="button" className="ag-linkpop-save" disabled={!valid} onClick={save}>Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
};
