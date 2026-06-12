import React, { useState } from "react";
import "./forms.css";

/** Agent-fit meanings, indexed 1–5. Shared by the Add-Agent form and read-only displays. */
export const FIT_MEANING = ["Poor fit", "Average fit", "Good fit", "Great fit", "Perfect match"];

export interface FitStarsProps {
  /** Current rating, 1–5. 0 / undefined renders as unrated. */
  value: number;
  /** When provided, the stars are interactive (hover preview + click). Omit for read-only display. */
  onChange?: (value: 1 | 2 | 3 | 4 | 5) => void;
  /** Render the meaning badge beside the stars (default true). */
  showMeaning?: boolean;
  /** Star size in px (default 23, matching the Add-Agent form). */
  size?: number;
  ariaLabel?: string;
}

/**
 * Burgundy 5-star agent-fit control (Form 11). Interactive when `onChange` is given (hover
 * previews, click locks); otherwise a read-only display. The single source of the star + meaning
 * treatment shared by the Add-Agent form and the agent-database view.
 */
export const FitStars: React.FC<FitStarsProps> = ({
  value,
  onChange,
  showMeaning = true,
  size = 23,
  ariaLabel = "Agent fit",
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const interactive = !!onChange;
  const shown = interactive ? hover ?? value : value;
  const svgStyle = size !== 23 ? { width: size, height: size } : undefined;

  const renderStar = (v: number) => {
    const cls = `sa-aa-star${shown >= v ? " on" : ""}${interactive ? "" : " ro"}`;
    const svg = (
      <svg viewBox="0 0 24 24" style={svgStyle}>
        <path d="M12 2.2l2.95 6.32 6.85.86-5.05 4.74 1.32 6.78L12 18.4l-6.07 3.3 1.32-6.78L2.2 9.38l6.85-.86z" />
      </svg>
    );
    if (!interactive) {
      return (
        <span key={v} className={cls} aria-hidden="true">
          {svg}
        </span>
      );
    }
    return (
      <button
        key={v}
        type="button"
        role="radio"
        aria-checked={value === v}
        aria-label={`${v} — ${FIT_MEANING[v - 1]}`}
        className={cls}
        onMouseEnter={() => setHover(v)}
        onClick={() => onChange!(v as 1 | 2 | 3 | 4 | 5)}
      >
        {svg}
      </button>
    );
  };

  return (
    <div className="sa-aa-fit-rate">
      <div
        className="sa-aa-stars"
        role={interactive ? "radiogroup" : undefined}
        aria-label={interactive ? ariaLabel : undefined}
        onMouseLeave={interactive ? () => setHover(null) : undefined}
      >
        {[1, 2, 3, 4, 5].map(renderStar)}
      </div>
      {showMeaning && (
        <span className={`sa-aa-fit-meaning${shown ? "" : " empty"}`}>
          {shown ? FIT_MEANING[shown - 1] : "Not yet rated"}
        </span>
      )}
    </div>
  );
};
