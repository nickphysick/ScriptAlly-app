import React from "react";

export const ScriptAllyLogo: React.FC<{ 
  className?: string; 
  size?: "sm" | "md" | "lg";
  iconColor?: string;
  textColor?: string;
}> = ({ 
  className = "", 
  size = "md",
  iconColor = "var(--color-custom-primary, #7c3a2a)",
  textColor = "var(--color-custom-dark-text, #3a1c14)"
}) => {
  // Sizing definitions
  const heights = {
    sm: "h-6",
    md: "h-9",
    lg: "h-14"
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl"
  };

  return (
    <div className={`flex items-center gap-2 select-none ${heights[size]} ${className}`} id="scriptally-brand-logo-root">
      {/* SVG Lettering plus custom paper airplane tail */}
      <svg
        className={`w-auto ${heights[size]} transition-all duration-300`}
        viewBox="0 0 280 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ScriptAlly"
      >
        {/* The elegant branding name lettering "ScriptAlly" */}
        <text
          x="10"
          y="54"
          fill={textColor}
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
            fontSize: "44px",
            letterSpacing: "-0.5px"
          }}
        >
          Script
          <tspan 
            style={{ 
              fontWeight: 600, 
              fontStyle: "italic",
              fontFamily: '"Lora", Garamond, serif'
            }}
          >
            Ally
          </tspan>
        </text>

        {/* Cursive swoosh link trailing from 'y' loop upwards toward the paper airplane */}
        <path
          d="M214 58 C 220 68, 235 70, 246 54 C 255 42, 258 28, 261 18"
          stroke={iconColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* High-fidelity custom origami paper airplane */}
        <g transform="translate(242, 4)">
          {/* Main wing - left half */}
          <path
            d="M 19.5 31.5 L 34.5 9 L 4.5 24.75 Z"
            fill={iconColor}
            stroke={iconColor}
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
          {/* Main wing - right shaded half */}
          <path
            d="M 19.5 31.5 L 34.5 9 L 24.75 14.25 Z"
            fill="#000000"
            fillOpacity="0.22"
            stroke={iconColor}
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
          {/* Underfold shadow flap */}
          <path
            d="M 19.5 31.5 L 24.75 14.25 L 19.5 20.25 Z"
            fill={iconColor}
            stroke={iconColor}
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
};
