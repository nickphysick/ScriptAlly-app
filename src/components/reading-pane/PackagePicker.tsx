/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ CHOOSING A SUBMISSION PACKAGE TO ATTACH (ref 173-package-attach.html) ════════════════════
 *
 * ⚠️ EVERY ROW STATES ITS CONTENTS BEFORE IT IS CHOSEN, and any overlap with what the send already
 * carries is declared on the row itself. The alternative is a picker that lists three names and
 * springs the collision afterwards — and the collision has no good silent answer: replacing loses
 * what the writer chose by hand, skipping loses what the package promised. So it is stated, both
 * copies land, and the writer removes whichever they meant to drop.
 *
 * ⚠️ NO SIZES ARE SHOWN, BECAUSE PACKAGES DO NOT STORE ANY. The ref draws `First 3 chapters`; a
 * `SubmissionPackage` holds three version ids and a `ManuscriptVersion` has no quantity and no
 * unit. Each item shows its type name and, when the version has one, its version name — which is
 * real data. See `packageAttach.ts`.
 */
import React from "react";
import type { ManuscriptVersion, QueryMaterial, SubmissionPackage } from "../../types";
import { packageItems, type PackageItem } from "../../lib/packageAttach";

export interface PackagePickerProps {
  packages: SubmissionPackage[];
  versions: ManuscriptVersion[];
  /* ⚠️ NO `existing` PROP. It fed the per-row overlap declarations and nothing else, so it went
     with them (D4) rather than being left accepted-and-unread — which is how a caller ends up
     passing data that silently goes nowhere. */
  style?: React.CSSProperties;
  panelRef?: React.RefObject<HTMLElement | null>;
  onPick: (pkg: SubmissionPackage, items: PackageItem[]) => void;
  onManage: () => void;
  onClose: () => void;
}

export const PackagePicker: React.FC<PackagePickerProps> = ({
  packages, versions, style, panelRef, onPick, onManage, onClose,
}) => {
  const selfRef = React.useRef<HTMLDivElement | null>(null);
  /**
   * ⚠️ ALL THREE ROUTES, AND THE ONE THAT WAS HERE DID NOT WORK (D1). The panel carried
   * `onKeyDown` for Escape — which only fires while focus is INSIDE it, and nothing focused it on
   * open. So a writer who opened this by accident had no way out at all: no key, no outside click,
   * no control. `useFixedMenu` positions and does not dismiss, which is easy to assume otherwise.
   *
   * ⚠️ ESCAPE IS DOCUMENT-LEVEL AND NOT STOPPED. `keydown` on the document fires wherever focus
   * sits, and the key is left to propagate for the reason `RemovePopover` states: this is a panel
   * over a page that owns its own Escape handling, and swallowing it here would reach past this
   * popover's business.
   *
   * ⚠️ AND DISMISSAL WRITES NOTHING (D2). Every route calls `onClose` and only `onClose`; the
   * attachment happens in `onPick` and nowhere else.
   */
  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const away = (e: PointerEvent) => {
      const el = selfRef.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", esc);
    /* ⚠️ THE LISTENER IS ADDED ON THE NEXT FRAME. Bound synchronously it catches the very
       pointerdown that opened the panel, and it closes on the click that asked for it. */
    const t = window.setTimeout(() => document.addEventListener("pointerdown", away), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", esc);
      document.removeEventListener("pointerdown", away);
    };
  }, [onClose]);

  return (
  <div
    ref={(el) => {
      selfRef.current = el;
      if (panelRef) (panelRef as React.MutableRefObject<HTMLElement | null>).current = el;
    }}
    className="qc-pkgpick"
    /* ⚠️ FLEX COLUMN + `minHeight: 0` — the cap from `useFixedMenu` has to squeeze the LIST and
       leave the foot's `Manage packages…` reachable (§1). */
    style={{ ...style, zIndex: 60, display: "flex", flexDirection: "column", minHeight: 0 }}
    role="dialog"
    aria-label="Attach a submission package"
  >
    <div className="qc-pkgpick-head">
      Attach a submission package
      {/* ⚠️ A VISIBLE WAY OUT, because the other two are invisible. A writer who does not know
          Escape works and does not think to click away needs something to press. */}
      <button type="button" className="qc-pkgpick-x" onClick={onClose} aria-label="Close">×</button>
    </div>

    <div className="qc-pkgpick-body">
      {packages.map((p) => {
        const items = packageItems(p, versions);
        return (
          <button key={p.id} type="button" className="qc-pkgrow" onClick={() => onPick(p, items)}>
            <span className="qc-pkgrow-top">
              <span className="qc-pkgname">{p.packageName}</span>
              <span className="qc-pkgcount">{items.length} {items.length === 1 ? "item" : "items"}</span>
            </span>
            {/* the contents, so what lands is visible before it lands */}
            <span className="qc-pkgitems">
              {items.map((i) => (
                <span key={i.versionId} className="qc-pkgitem">
                  {i.label}{i.versionName ? <em> · {i.versionName}</em> : null}
                </span>
              ))}
            </span>
            {/**
              * ⚠️ THE PER-ROW CONFLICT NOTE IS DELETED (D4), AND IT WAS ANNOUNCING A STATE THE MODEL
              * FORBIDS. It read "Covering letter is already attached — the package's copy will sit
              * beside it": a duplicate, declared before the fact, when a query holds a package OR a
              * loose list and never both. `materialsLinkWrites` clears one as it writes the other,
              * so there is no beside-it and never was — the copy described a write the code cannot
              * perform.
              *
              * ⚠️ THE REPLACEMENT IS STATED ONCE, IN THE CONFIRM, not per row. `switchToPackage`
              * asks before a package replaces a listed set, which is the honest place: a sentence
              * about what will happen to the whole send, not a warning stapled to each option.
              */}
          </button>
        );
      })}
    </div>

    {/* ⚠️ LABELLED AS LEAVING THE PAGE. `Manage packages…` sits at the foot and the ellipsis says it
        goes somewhere; a bare `Manage packages` beside three choosable rows reads as a fourth. */}
    <button type="button" className="qc-pkgmanage" onClick={onManage}>
      Manage packages…<span className="qc-pkgmanage-note">opens the Packages page</span>
    </button>
  </div>
  );
};
