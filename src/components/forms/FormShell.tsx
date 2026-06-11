import React, { useEffect, useRef, useState } from "react";
import "./forms.css";

export interface FormShellProps {
  /** Small mono caption above the name, e.g. "Logging a query to". */
  preLabel: string;
  /** Header name — agent name, or a form title for non-agent forms. */
  name: string;
  /** Secondary line — agency or context. Optional. */
  subLine?: string;
  /** Avatar initials. If omitted, derived from `name`. Ignored when `avatarIcon` is given. */
  avatarInitials?: string;
  /** Icon to show in the avatar chip instead of initials (e.g. manuscript / settings forms). */
  avatarIcon?: React.ReactNode;
  /** The corner motif — Lottie, image, or line SVG. Varies per form; this is the only variable visual. */
  cornerMotif?: React.ReactNode;
  /** Body content — the fields, in order. */
  children: React.ReactNode;
  /** Centred soft-pink button label. */
  buttonLabel: string;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  /** When true, the button shows "Saving…" and is disabled. */
  submitting?: boolean;
  /**
   * Close-without-saving handler. When provided, the shell renders the dimmed overlay and owns
   * every exit affordance — the Cancel action, Escape, and a backdrop click — routed through one
   * guard. Omit it for a shell that can't be dismissed (rare).
   */
  onClose?: () => void;
  /**
   * Whether the form holds unsaved input. When true, any close affordance asks to confirm the
   * discard; when false it closes silently. Lets every form inherit the same "don't lose my work"
   * exit without per-form wiring.
   */
  dirty?: boolean;
  /** Optional left-aligned secondary footer action (e.g. "← Back" for a stepped form). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** When this changes, the scrollable field region resets to the top (e.g. on a step change). */
  scrollResetKey?: string | number;
}

const initialsFrom = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * The locked ScriptAlly form shell: dimmed overlay → parchment card → inset burgundy mount →
 * sage header band (avatar chip + name block + corner-motif slot) → body → centred soft-pink
 * button, with an inherited Cancel/discard exit. Every form is this shell with its header text,
 * motif, fields, and button label swapped.
 */
export const FormShell: React.FC<FormShellProps> = ({
  preLabel,
  name,
  subLine,
  avatarInitials,
  avatarIcon,
  cornerMotif,
  children,
  buttonLabel,
  onSubmit,
  submitDisabled,
  submitting,
  onClose,
  dirty,
  secondaryLabel,
  onSecondary,
  scrollResetKey,
}) => {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset the field region to the top when the caller signals a phase change (e.g. a wizard step),
  // so the next step never opens mid-scroll.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scrollResetKey]);

  // The single guarded exit shared by the Cancel action, Escape, and the backdrop: confirm first
  // when there's unsaved input, close silently when there isn't.
  const requestClose = () => {
    if (!onClose) return;
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmingDiscard) {
        setConfirmingDiscard(false);
        return;
      }
      if (!onClose) return;
      if (dirty) setConfirmingDiscard(true);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, confirmingDiscard, onClose]);

  return (
    <div
      className="sa-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div className="sa-overlay-inner">
        <div className="sa-form">
          <div className="sa-band">
            {cornerMotif && (
              <div className="sa-motif" aria-hidden="true">
                {cornerMotif}
              </div>
            )}
            <div className="sa-id">
              <div className="sa-avatar">{avatarIcon ?? avatarInitials ?? initialsFrom(name)}</div>
              <div>
                <div className="sa-prelabel">{preLabel}</div>
                <div className="sa-name">{name}</div>
                {subLine && <div className="sa-subline">{subLine}</div>}
              </div>
            </div>
          </div>

          <div className="sa-body" ref={scrollRef}>
            {children}
          </div>

          <div className="sa-footer">
            {confirmingDiscard ? (
              <div className="sa-discard" role="alertdialog" aria-label="Discard changes?">
                <span className="sa-discard-msg">Discard your changes?</span>
                <div className="sa-discard-actions">
                  <button type="button" className="sa-discard-keep" onClick={() => setConfirmingDiscard(false)}>
                    Keep editing
                  </button>
                  <button
                    type="button"
                    className="sa-discard-go"
                    onClick={() => {
                      setConfirmingDiscard(false);
                      onClose?.();
                    }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="sa-btn-row">
                  {onSecondary && (
                    <button type="button" className="sa-footer-secondary" onClick={onSecondary}>
                      {secondaryLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    className="sa-btn"
                    onClick={onSubmit}
                    disabled={submitDisabled || submitting}
                  >
                    {submitting ? "Saving…" : buttonLabel}
                  </button>
                </div>
                {onClose && (
                  <div className="sa-cancel-row">
                    <button type="button" className="sa-cancel" onClick={requestClose}>
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
