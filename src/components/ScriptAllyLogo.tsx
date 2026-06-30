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
  iconColor?: string;
  textColor?: string;
}> = ({ className = "", size = "md" }) => {
  // Heights match the previous SVG wordmark so every call site keeps its on-page size.
  const heights = {
    sm: "h-6",
    md: "h-9",
    lg: "h-14",
  };

  return (
    <div className={`flex items-center select-none ${heights[size]} ${className}`} id="scriptally-brand-logo-root">
      <img
        src="/scriptally-title-v2.png"
        alt="ScriptAlly"
        className="h-full w-auto"
        style={{ maxWidth: "none" }}
      />
    </div>
  );
};
