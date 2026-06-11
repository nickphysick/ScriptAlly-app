import React from "react";
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
 * The locked ScriptAlly form shell: parchment card → inset burgundy mount → sage header band
 * (avatar chip + name block + corner-motif slot) → body → centred soft-pink button.
 * Every form is this shell with its header text, motif, fields, and button label swapped.
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
}) => {
  return (
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

      <div className="sa-body">
        {children}
        <div className="sa-btn-row">
          <button
            type="button"
            className="sa-btn"
            onClick={onSubmit}
            disabled={submitDisabled || submitting}
          >
            {submitting ? "Saving…" : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
