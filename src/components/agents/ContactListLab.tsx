/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactListLab — DEV-only review surface for the Contact list's three states (#/contact-lab).
 *
 * ⚠️ IT MOUNTS THE REAL PAGE, NOT A RECONSTRUCTION OF IT. `AgentList` renders here exactly as it
 * renders on `/agents`; only the db behind it is a stub, supplied through `DbContext` directly.
 * That is the whole point. A lab that rebuilt the page's chrome would agree with itself while
 * describing a page the app never serves — the failure this repo has recorded four times — and it
 * would silently lose the `--agl-*` token layer that the empty state's every colour reads from.
 *
 * ⚠️ AND IT EXISTS BECAUSE THE BLANK STATE IS OTHERWISE UNREACHABLE. It renders only on an account
 * with no agents on file, so the dev harness account (sixteen agents) cannot show it, and the
 * alternatives were emptying somebody's data or creating an account to throw away. Four toggles
 * cover the states the page can actually be in; the theme toggle is here because the Agent list is
 * deliberately theme-INDEPENDENT (`agentList.css` carries one token set and no `.t-*` override
 * anywhere), and this is where that claim is cheap to check.
 *
 * ⚠️ "THE CAST" IS THE MEASUREMENT TARGET, AND IT IS WHY THIS LAB NOW EARNS ITS KEEP TWICE OVER.
 * `contactFixture` holds a purpose-built set covering the wishlist's three lengths, both genre
 * cases, both material cases, both socials cases, a never-queried agent and a shut door BOTH with
 * and without a live query. The dev harness ACCOUNT covers none of them — measured, it held zero
 * wishlists, one genre and no socials across 22 agents — so a geometric lock taken there would
 * have measured a page where every case is the same case. This route needs no sign-in and writes
 * nothing, so `tests/e2e/contactCard.measure.ts` can open the REAL page over known content.
 */
import React, { useState } from "react";
import { DbContext } from "../../lib/db";
import { AgentList } from "./AgentList";
import { Agent, SubmissionMethod, SubmissionStatus, UserPlan } from "../../types";
import { CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_MANUSCRIPTS, CONTACT_FIXTURE_QUERIES } from "./contactFixture";
import { FONT_MONO } from "../../lib/designTokens";

type Theme = "t-capp" | "t-bold" | "t-edn";
type View = "settling" | "blank" | "list" | "cast";

const SAMPLE: Agent = {
  id: "lab-a1", userId: "lab", name: "Ada Reader", agency: "Reader & Co", email: "ada@example.com",
  website: "", genres: ["Literary Fiction"], mswlNotes: "", starRating: 4,
  submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
  responseTimeWeeks: 8, materialsWanted: ["Query Letter"], country: "GB", city: "London",
  dateAdded: "2026-01-02T00:00:00.000Z", lastCheckedDate: "2026-01-02T00:00:00.000Z",
} as unknown as Agent;

const asyncNoop = async () => undefined;

const btn = (on: boolean): React.CSSProperties => ({
  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase",
  padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--bd)",
  background: on ? "var(--band)" : "#fffefb", color: on ? "var(--burg)" : "var(--ink)",
});

export const ContactListLab: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("t-capp");
  const [view, setView] = useState<View>("blank");

  /* ⚠️ THE STUB IS SHAPED LIKE THE CONTEXT, NOT LIKE THE PAGE'S DESTRUCTURE. A hand-listed set of
     the eight fields `AgentList` happens to read today would go stale the moment it reads a ninth,
     and the failure would be a render crash in a lab rather than a clear "the stub is short". */
  const value = new Proxy(
    {
      currentUser: { id: "lab", name: "Nick Physick", email: "lab@example.com", plan: UserPlan.FREE, homeCountry: "GB" },
      collectionsReady: view !== "settling",
      agents: view === "cast" ? CONTACT_FIXTURE_AGENTS : view === "list" ? [SAMPLE] : [],
      queries: view === "cast" ? CONTACT_FIXTURE_QUERIES : [],
      manuscripts: view === "cast" ? CONTACT_FIXTURE_MANUSCRIPTS : [],
      activities: [], packages: [], versions: [], notes: [],
      communityAgents: [], journalEntries: [], tasks: [], userTasks: [], taskFlags: [], dismissedTasks: [],
      authReady: true, smartImportUsage: null,
    } as Record<string, unknown>,
    {
      get: (t, k) => (typeof k === "symbol" ? undefined : k in t ? t[k as string] : asyncNoop),
      has: () => true,
    },
  );

  return (
    <div
      className={theme}
      style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--desk)", overflow: "hidden" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--bd)", flexWrap: "wrap", flexShrink: 0 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>#/contact-lab</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["settling", "blank", "list", "cast"] as View[]).map((v) => (
            <button key={v} type="button" data-lab-view={v} onClick={() => setView(v)} style={btn(view === v)}>
              {v === "settling" ? "Loading" : v === "blank" ? "No agents" : v === "list" ? "One agent" : "The cast"}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {(["t-capp", "t-bold", "t-edn"] as Theme[]).map((t) => (
            <button key={t} type="button" onClick={() => setTheme(t)} style={btn(theme === t)}>
              {t === "t-capp" ? "Cappuccino" : t === "t-bold" ? "Bold Pastille" : "Editorial"}
            </button>
          ))}
        </div>
      </div>

      {/* The route's own host: `<StagePage layout="fill" clip>` is a full-height clipped slot, and
          the page owns the scroll inside it. */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", background: "var(--shell-canvas)" }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <DbContext.Provider value={value as any}>
          {/* remounted per view so the page's load animation and measurements run from scratch */}
          <AgentList key={view} onNavigate={() => {}} />
        </DbContext.Provider>
      </div>
    </div>
  );
};
