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
  /**
   * ⚠️ THE CAST IS STATE, AND THE LAB IMPLEMENTS `updateAgent` OVER IT. The stub's Proxy answers
   * every unknown member with an async no-op, so a write from the page went nowhere: quick add
   * saved, the popover closed, and nothing changed — which is indistinguishable from a broken
   * write path and would have made every "the value appears in all four views" claim unmeasurable.
   * The lab is a sandbox now: it writes to its own copy, exactly as the ref's own script does, and
   * still touches no account.
   */
  const [cast, setCast] = useState<Agent[]>(CONTACT_FIXTURE_AGENTS);
  const updateAgent = React.useCallback(async (id: string, fields: Partial<Agent>) => {
    setCast((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...fields } as Agent) : a)));
  }, []);

  /* ⚠️ THE STUB IS SHAPED LIKE THE CONTEXT, NOT LIKE THE PAGE'S DESTRUCTURE. A hand-listed set of
     the eight fields `AgentList` happens to read today would go stale the moment it reads a ninth,
     and the failure would be a render crash in a lab rather than a clear "the stub is short". */
  const value = new Proxy(
    {
      currentUser: { id: "lab", name: "Nick Physick", email: "lab@example.com", plan: UserPlan.FREE, homeCountry: "GB" },
      collectionsReady: view !== "settling",
      agents: view === "cast" ? cast : view === "list" ? [SAMPLE] : [],
      queries: view === "cast" ? CONTACT_FIXTURE_QUERIES : [],
      manuscripts: view === "cast" ? CONTACT_FIXTURE_MANUSCRIPTS : [],
      activities: [], packages: [], versions: [], notes: [],
      communityAgents: [], journalEntries: [], tasks: [], userTasks: [], taskFlags: [], dismissedTasks: [],
      authReady: true, smartImportUsage: null,
      updateAgent,
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
        {/* ⚠️ NO ROUTER OF ITS OWN, AND THIS WAS TRIED AND REVERTED. The page keeps its view in
            the URL, and the view switch appeared to rewrite the address to `/?view=list` and drop
            `#/contact-lab` with it — so a MemoryRouter looked like the fix. It is not: this route
            renders INSIDE the app's own BrowserRouter, and a second one throws "You cannot render
            a <Router> inside another <Router>", which the error boundary catches and the whole lab
            becomes "Something went wrong". It failed only under the signed-in harness and rendered
            perfectly signed-out, which is the kind of difference a browser tab does not show you.

            ⚠️ THE WART IT WAS MEANT TO FIX IS REAL AND IS ACCEPTED. Switching views here leaves
            the address at `/?view=list` without the hash; the lab keeps rendering because the hash
            is read once rather than watched, but a REFRESH then lands on the app. It is a
            consequence of the lab being a hash route inside a router that owns the pathname, and
            the shipped route (`/agents`) has no such problem. */}
        <DbContext.Provider value={value as any}>
          {/* remounted per view so the page's load animation and measurements run from scratch */}
          <AgentList key={view} onNavigate={() => {}} />
        </DbContext.Provider>
      </div>
    </div>
  );
};
