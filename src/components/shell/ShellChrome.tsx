/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Data-connected chrome bits for the SidebarShell — the account chip (rail foot) and the top-strip
 * utility cluster. Kept separate from the presentational shell components so SidebarNav/TopStrip stay
 * page-agnostic. Both read the session via useScriptAllyDb.
 *
 * Phase 1 scope: help / settings / avatar route via onNavigate; the bell carries the live unread
 * count (derived tasks + overdue dated notes, same source as the legacy top Nav) and opens the
 * dashboard to-do list. The richer notification + account dropdowns are a follow-up.
 */
import React from "react";
import { HelpCircle, Bell, Settings, ChevronDown } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { FONT_SERIF, FONT_SANS, burgundy, bodyInk } from "../../lib/designTokens";
import { isOverdue } from "../notes/notesUtils";
import { cardCream, chromeWhite, shellHairline, pinkHover, mutedShell } from "./shellTokens";

const Avatar: React.FC<{ initial: string; size?: number }> = ({ initial, size = 30 }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: cardCream,
      border: "1px solid rgba(124,58,42,0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT_SERIF,
      fontWeight: 600,
      fontSize: Math.round(size * 0.45),
      color: burgundy,
      flexShrink: 0,
    }}
  >
    {initial}
  </span>
);

/** Account chip pinned to the sidebar foot — avatar + name + chevron → Account settings. */
export const ShellAccountChip: React.FC<{ onNavigate: (tab: string, sub?: string) => void }> = ({ onNavigate }) => {
  const { currentUser } = useScriptAllyDb();
  if (!currentUser) return null;
  return (
    <button
      type="button"
      onClick={() => onNavigate("account")}
      style={{
        marginTop: "auto",
        paddingTop: 13,
        borderTop: `0.5px solid ${shellHairline}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
      }}
      title="Account settings"
    >
      <Avatar initial={currentUser.name[0]?.toUpperCase() ?? "?"} size={29} />
      <span style={{ flex: 1, fontFamily: FONT_SANS, fontSize: 12.5, color: bodyInk }}>{currentUser.name}</span>
      <ChevronDown style={{ width: 13, height: 13, color: mutedShell }} />
    </button>
  );
};

const IconButton: React.FC<{ title: string; onClick: () => void; children: React.ReactNode; badge?: string }> = ({
  title,
  onClick,
  children,
  badge,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    style={{
      width: 31,
      height: 31,
      borderRadius: 9,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: burgundy,
      position: "relative",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = pinkHover; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
  >
    {children}
    {badge && (
      <span
        style={{
          position: "absolute",
          top: 1,
          right: 1,
          background: burgundy,
          color: chromeWhite,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 7,
          fontWeight: 600,
          padding: "1px 3px",
          borderRadius: 5,
          lineHeight: 1,
        }}
      >
        {badge}
      </span>
    )}
  </button>
);

/** Top-strip utility cluster — help · notifications (live count) · settings · avatar. */
export const ShellUtilityCluster: React.FC<{ onNavigate: (tab: string, sub?: string) => void }> = ({ onNavigate }) => {
  const { currentUser, tasks, notes } = useScriptAllyDb();
  const overdueNotes = notes.filter((n) => !n.done && isOverdue(n.dueDate));
  const count = tasks.length + overdueNotes.length;
  const badge = count > 0 ? (count > 9 ? "9+" : String(count)) : undefined;
  return (
    <>
      <IconButton title="Help Centre" onClick={() => onNavigate("help")}>
        <HelpCircle style={{ width: 16, height: 16 }} />
      </IconButton>
      <IconButton title="Notifications" onClick={() => onNavigate("dashboard")} badge={badge}>
        <Bell style={{ width: 16, height: 16 }} />
      </IconButton>
      <IconButton title="Settings" onClick={() => onNavigate("account")}>
        <Settings style={{ width: 16, height: 16 }} />
      </IconButton>
      {currentUser && (
        <button
          type="button"
          onClick={() => onNavigate("account")}
          style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
          title="Account settings"
          aria-label="Account settings"
        >
          <Avatar initial={currentUser.name[0]?.toUpperCase() ?? "?"} size={30} />
        </button>
      )}
    </>
  );
};
