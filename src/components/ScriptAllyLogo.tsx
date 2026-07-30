import React from "react";

/**
 * ScriptAlly wordmark — renders the designed "ScriptAlly" title artwork
 * (/scriptally-title-v2.png) at the requested height. The image is height-locked and
 * keeps its own aspect ratio. `iconColor`/`textColor` are accepted for backwards-compat
 * with existing call sites but no longer apply (the artwork has fixed colours).
 */
export const ScriptAllyLogo: React.FC<{
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Exact pixel height — overrides `size` (additive escape; the rail lockup uses it). */
  heightPx?: number;
  /** Optional DOM id. It is a PROP, never a constant: this component mounts at several call
   *  sites at once (the bar, the panel, the mobile slim bar), and a hardcoded id made them
   *  duplicates — `getElementById` then returned whichever came first in the document, so
   *  inspecting the brand measured the wrong instance. Set it on the one you mean to inspect. */
  id?: string;
  iconColor?: string;
  textColor?: string;
}> = ({ className = "", size = "md", heightPx, id }) => {
  // Heights match the previous SVG wordmark so every call site keeps its on-page size.
  const heights = {
    sm: "h-6",
    md: "h-9",
    lg: "h-14",
  };

  return (
    <div
      className={`flex items-center select-none ${heightPx == null ? heights[size] : ""} ${className}`}
      style={heightPx != null ? { height: heightPx } : undefined}
      id={id}
    >
      <img
        src="/scriptally-title-v2.png"
        alt="ScriptAlly"
        className="h-full w-auto"
        style={{ maxWidth: "none" }}
      />
    </div>
  );
};
