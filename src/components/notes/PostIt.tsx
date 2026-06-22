/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * <PostIt> — a coloured paper note. Presentational: paper + top sheen + folded bottom-right corner +
 * soft shadow + Caveat body, with an optional mono due chip. Positioning, fan transforms and the
 * hover lift are the parent's job (the desk fan supplies `style`). Visual values locked to the mock.
 */
import React from "react";
import { Calendar } from "lucide-react";
import type { NoteColour } from "../../types";
import { FONT_MONO } from "../../lib/designTokens";
import { NOTE_THEMES, FONT_CAVEAT, type NoteTheme } from "./notesTheme";
import { formatDueLabel } from "./notesUtils";

export interface PostItProps {
  colour: NoteColour;
  /** Optional explicit theme override (e.g. the empty-state pale tints); falls back to NOTE_THEMES. */
  theme?: NoteTheme;
  /** Note body text. Optional when `children` is supplied (e.g. the empty-state copy). */
  text?: string;
  dueDate?: string | null; // "YYYY-MM-DD"
  /** Show the due chip — only the front/surfaced note carries it. Default true. */
  surfaced?: boolean;
  onClick?: () => void;
  /** Positioning / fan transform injected by the parent. */
  style?: React.CSSProperties;
  className?: string;
  width?: number | string;
  minHeight?: number | string;
  /** Larger body for the See-all overlay. */
  bodyFontSize?: number;
  /** Custom body content (overrides `text`) — e.g. the empty-state copy. Inherits Caveat + ink. */
  children?: React.ReactNode;
}

export const PostIt: React.FC<PostItProps> = ({
  colour,
  theme: themeOverride,
  text,
  dueDate,
  surfaced = true,
  onClick,
  style,
  className,
  width = 150,
  minHeight = 114,
  bodyFontSize = 17.5,
  children,
}) => {
  const theme = themeOverride ?? NOTE_THEMES[colour];
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        position: "relative",
        width,
        minHeight,
        // Critical colours inline — never Tailwind (known footgun).
        background: theme.fill,
        color: theme.ink,
        padding: "14px 15px 15px",
        borderRadius: 1,
        boxShadow: "1px 5px 13px rgba(58,28,20,0.16), 0 1px 2px rgba(58,28,20,0.1)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {/* glue-line sheen */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 18,
          background: `linear-gradient(180deg, ${theme.sheen}, transparent)`,
          pointerEvents: "none",
        }}
      />
      {/* folded bottom-right corner */}
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 20,
          height: 20,
          background: theme.fold,
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          boxShadow: "-2px -2px 4px rgba(58,28,20,0.13)",
        }}
      />
      <div
        style={{
          fontFamily: FONT_CAVEAT,
          fontSize: bodyFontSize,
          fontWeight: 500,
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}
      >
        {children ?? text}
      </div>
      {surfaced && dueDate ? (
        <div
          style={{
            marginTop: 8,
            fontFamily: FONT_MONO,
            fontSize: 8,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            opacity: 0.72,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Calendar size={9} strokeWidth={2} />
          {formatDueLabel(dueDate)}
        </div>
      ) : null}
    </div>
  );
};
