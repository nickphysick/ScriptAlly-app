/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { useScriptAllyDb } from "../lib/db";
import { ManuscriptStatus } from "../types";
import { OnboardingCard, SelectRow, BookMotif, FONT_MONO } from "./onboarding/chrome";
import { onbFaint, onbGround, onbMuted } from "../lib/designTokens";
import { BranchA, BranchAResult } from "./onboarding/BranchA";
import { BranchB } from "./onboarding/BranchB";
import { ManuscriptFieldsState } from "./onboarding/ManuscriptFields";
import { buildManuscriptPayload, manuscriptLimitError, ensureManuscriptOnce, ManuscriptIdCache } from "../lib/manuscripts";
import { effectiveQueryingStage, importDefaultForStage } from "../lib/onboardingStage";
import { spineFor, spineIndex, stepOfLabel, SpineId } from "../lib/onboardingSpine";
import { OnboardingHeader } from "./onboarding/OnboardingHeader";
import { Check } from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
/* ⚠️ THE LOCAL PALETTE IS GONE. This file carried its own 19-hex token object — a parchment
   ground, a burgundy primary, a pink dusty border — none of it shared with the app and none of it
   matching the dashboard a writer lands on 40 seconds later. Every colour in this journey now
   comes from designTokens (the `onb*` group), which restates the app's own card. If a screen here
   ever needs a colour that group does not have, that is a signal the card is under-specified, not
   an invitation to add a local hex. */

// ─── Types ────────────────────────────────────────────────────────────────────
interface OnboardingProps {
  onComplete: () => void;
}

interface ProgressData {
  step: number;
  manuscriptTitle: string;
  manuscriptGenre: string;
  queryingStage: QueryingStage | null;
}

// Where the writer is in their querying journey — captured on the welcome step (step 0).
// Persisted to the user profile; does not branch the flow (everyone continues the same steps).
type QueryingStage = "starting" | "early" | "deep" | "interest";

const STAGE_OPTIONS: { id: QueryingStage; title: string; descriptor: string }[] = [
  { id: "starting", title: "Just getting started", descriptor: "Haven't sent any queries yet" },
  { id: "early",    title: "A few queries out",    descriptor: "Early days, waiting to hear back" },
  { id: "deep",     title: "Deep in it",           descriptor: "Lots of queries in flight" },
  { id: "interest", title: "Had some interest",    descriptor: "Requests or an offer on the table" },
];

// The branch a chosen stage routes into after the "Understood" beat:
//   starting → Branch A (manuscript-led setup); early/deep/interest → Branch B (capture + import).
// "Skip setup" is the only route to Branch C (exploring) and is handled separately.
type Branch = "A" | "B";
const STAGE_TO_BRANCH: Record<QueryingStage, Branch> = {
  starting: "A",
  early: "B",
  deep: "B",
  interest: "B",
};
// Distinct ScreenTransition keys per flow phase. Deliberately one key per BRANCH, not per branch
// step — the key remounts ScreenTransition's child, so a per-step key would wipe the branch
// component's internal state on every internal navigation.
const FLOW_KEY: Record<Branch, number> = { A: 100, B: 200 };

// Centres a screen in the full-height onboarding overlay.
const CenterWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: "100%", padding: "32px 16px", boxSizing: "border-box" }}>
    {children}
  </div>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Screen wrappers ──────────────────────────────────────────────────────────

// Keyed enter-only fade between screens. Deliberately NO framer-motion here: exit-completion
// callbacks don't reliably fire in this app (React 19 + motion), which either wedges the flow
// (mode="wait"), stacks invisible exited screens over the live one (default mode), or fails to
// swap the keyed child at all. A keyed plain div + CSS enter animation is fully robust.
const ScreenTransition: React.FC<{ stepKey: number; children: React.ReactNode }> = ({ stepKey, children }) => (
  <div key={stepKey} style={{ width: "100%", animation: "sa-screen-in 0.28s ease-out" }}>
    <style>{`@keyframes sa-screen-in { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }`}</style>
    {children}
  </div>
);

/**
 * The welcome step — the same card as every other screen in this journey.
 *
 * ⚠️ IT USED TO BE ITS OWN CARD, and that was the first of three styles a writer met on the way
 * in. `ModalCard` had no paper texture and no inset rim, so it matched neither the Form 11 branch
 * screens that followed nor the app it introduces; its band carried a burgundy "S" monogram
 * standing in for the wordmark. One card, one grammar: this screen is now `OnboardingCard` with a
 * book mark on the plate, like the manuscript screens it leads to.
 */
const WelcomeStageScreen: React.FC<{
  selected: QueryingStage | null;
  onSelect: (s: QueryingStage) => void;
  onContinue: () => void;
  stepLabel?: string;
}> = ({ selected, onSelect, onContinue, stepLabel }) => (
  <OnboardingCard
    step={stepLabel}
    pre="Getting set up"
    name="Let's set things up around your journey"
    sub="A calm home for every query, agent and deadline. No wrong answer here — it just shapes what you see first."
    motif={<BookMotif />}
    primaryLabel="Continue"
    primaryDisabled={!selected}
    onPrimary={onContinue}
  >
    <span
      style={{
        fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
        color: onbFaint, display: "block", marginBottom: 11,
      }}
    >
      Where are you in your querying journey?
    </span>
    {STAGE_OPTIONS.map((opt) => (
      <SelectRow
        key={opt.id}
        icon={null}
        title={opt.title}
        desc={opt.descriptor}
        selected={selected === opt.id}
        onClick={() => onSelect(opt.id)}
      />
    ))}
  </OnboardingCard>
);

// ─── Main Onboarding component ────────────────────────────────────────────────

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { currentUser, manuscripts, addManuscript, updateUserProfile } = useScriptAllyDb();

  const STORAGE_KEY = `scriptally_onboarding_progress_${currentUser?.id || "anon"}`;

  // Restore saved progress
  const loadProgress = (): Partial<ProgressData> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  };

  const saved = loadProgress();

  /* ⚠️ THERE IS ONLY ONE STEP NOW, AND `normalizeStep` IS WHAT KEEPS THAT TRUE FOR RETURNING
     WRITERS. Every numbered screen except the welcome is deleted, so a saved `step` from any
     earlier build — the old splash 1, the intro/path/manuscript 2–4, the agents 5 or the
     completion 6 — points at a screen that no longer exists. All of them resume at the welcome,
     which is a real screen that can reach everywhere else. Dropping this function instead would
     leave a mid-flight writer on a blank overlay with no way out. */
  const normalizeStep = (_s: number | undefined): number => 0;
  const [step, setStep] = useState(normalizeStep(saved.step));
  const [queryingStage, setQueryingStage] = useState<QueryingStage | null>(saved.queryingStage ?? null);
  // The post-welcome flow: null = on the welcome step, "A"/"B" = inside a branch. Branch C
  // (exploring) exits immediately and has no screen of its own.
  const [flow, setFlow] = useState<Branch | null>(null);
  const [manuscriptTitle, setManuscriptTitle] = useState(saved.manuscriptTitle ?? "");
  const [manuscriptGenre, setManuscriptGenre] = useState(saved.manuscriptGenre ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveProgress = (updates: Partial<ProgressData>) => {
    const current: ProgressData = {
      step,
      queryingStage,
      manuscriptTitle,
      manuscriptGenre,
      ...updates,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  };

  const goTo = (s: number) => {
    setStep(s);
    saveProgress({ step: s });
  };

  // Fire-and-forget profile write. Onboarding must never await Firestore: a field missing from
  // the rules' update allowlist is silently denied WITHOUT rejecting (see the affectedKeys
  // gotcha), so an awaited write can hang the flow forever. Each field goes in its own write so
  // one denied field can't take an allowed one down with it.
  const persistProfile = (fields: Partial<Parameters<typeof updateUserProfile>[0]>) => {
    Promise.resolve(updateUserProfile(fields)).catch((e) =>
      console.error("Onboarding profile write failed:", fields, e)
    );
  };

  /* Welcome step → straight into the branch the chosen stage maps to. Continue persists the
     stage (non-blocking).

     ⚠️ NO TRANSITION BEAT. A cream "Understood." card used to hold the flow for a fixed 1200ms
     between the answer and the branch — an unskippable pause with no Back and nothing to read,
     restating the click that had just happened. It also wore a third card style of its own, so
     the journey changed visual language twice in three screens. The answer is acknowledged by the
     next screen appearing. */
  const handleStageContinue = () => {
    if (!queryingStage) return;
    saveProgress({ queryingStage });
    persistProfile({ queryingStage });
    setSpineStep("book"); // both branches open on their manuscript screen
    setFlow(STAGE_TO_BRANCH[queryingStage]);
  };

  // "Skip setup" from the welcome step → Branch C (exploring): mark complete and go to the dashboard.
  // If the user entered a manuscript in Branch B then backed out here, honour it (create once) and
  // record them as querying rather than exploring.
  const handleStageSkip = async () => {
    if (b2DraftRef.current) {
      await ensureBranchBManuscript();
      await finishOnboarding();
      return;
    }
    await finishOnboarding();
  };

  // Save/limit error surfaced inside the active branch screen.
  const [branchError, setBranchError] = useState<string | null>(null);

  /* ⚠️ THE SPINE READS THE COMMITTED BRANCH, NOT THE PENDING RADIO. `flow` is null until Continue,
     so comparing options on the opening question cannot make the spine flicker between two and
     three dots — which would be the lengthening fault wearing a different coat. */
  const [spineStep, setSpineStep] = useState<SpineId>("you");
  const spineSteps = spineFor(flow);
  const spineAt = Math.max(0, spineIndex(spineSteps, spineStep));
  /* The card band states the same position in words, in its existing right-hand meta slot — one
     source, two renderings, so the dots and the sentence cannot disagree. */
  const stepLabel = stepOfLabel(spineAt, spineSteps.length);

  // The one manuscript writer for every onboarding branch (A3a, A3b, B2): shared payload shape +
  // shared Free-tier limit check, then the same addManuscript the rest of the app uses.
  // Returns the new manuscript id, or null when the save didn't land.
  const saveBranchManuscript = async (fields: ManuscriptFieldsState, status: ManuscriptStatus): Promise<string | null> => {
    const limitErr = manuscriptLimitError(currentUser?.plan, manuscripts.length);
    if (limitErr) {
      setBranchError(limitErr);
      return null;
    }
    setIsSubmitting(true);
    try {
      const res = await addManuscript(
        buildManuscriptPayload({
          title: fields.title.trim() || "Untitled manuscript",
          genre: fields.genre,
          subGenres: fields.subGenres,
          ageCategory: fields.ageCategory,
          wordCount: parseInt(fields.wordCount.replace(/\D/g, ""), 10) || 0,
          logline: fields.strapline, // the strapline IS the logline
          status,
        })
      );
      if (!res.success || !res.id) {
        setBranchError(res.error || "Couldn't save the manuscript — try again.");
        return null;
      }
      setBranchError(null);
      setManuscriptTitle(fields.title);
      saveProgress({ manuscriptTitle: fields.title, manuscriptGenre: fields.genre });
      return res.id;
    } catch (e) {
      console.error("Onboarding manuscript save failed:", e);
      setBranchError("Couldn't save the manuscript — try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  // A3a (Ready to Query / Revising): save, then finish onboarding onto the agent list — the same
  // exit A3b already used. Onboarding ends where the real work starts; the old in-flow agents step
  // asked for one agent through a lesser form than the app's own, then threw two of its four fields
  // away and stamped six invented defaults on what survived.
  const handleBranchASaveReady = async (r: BranchAResult) => {
    if (await saveBranchManuscript(r.fields, r.status)) {
      sessionStorage.setItem("scriptally_post_onboarding_tab", "agents");
      await finishOnboarding();
    }
  };

  // A3b (Still writing): save as Drafting, then finish onboarding straight into the agent
  // database — research-first, no query pipeline yet.
  const handleBranchAStillWriting = async (r: BranchAResult) => {
    if (await saveBranchManuscript(r.fields, r.status)) {
      sessionStorage.setItem("scriptally_post_onboarding_tab", "agents");
      await finishOnboarding();
    }
  };

  // B2 (Branch B): the book the pipeline attaches to. To avoid tripping the Free-tier 1-manuscript
  // cap mid-flow, NOTHING is written here — the entered details are HELD in flow state and the
  // manuscript is created exactly once, later, at commit/finish (ensureBranchBManuscript). Held in a
  // ref alongside state so the deferred create + idempotency guard read the latest value synchronously.
  const [b2Draft, setB2Draft] = useState<ManuscriptFieldsState | null>(null);
  const b2DraftRef = useRef<ManuscriptFieldsState | null>(null);
  const b2IdCache = useRef<ManuscriptIdCache>({ id: null }); // caches the id once the single write lands

  // B2 Continue: hold the details only — no Firestore write, no cap check at this step. (The cap can
  // therefore never fire mid-flow: there are 0 manuscripts until the single commit/finish write.)
  const handleBranchBSaveBook = async (fields: ManuscriptFieldsState): Promise<boolean> => {
    setBranchError(null);
    setB2Draft(fields);
    b2DraftRef.current = fields;
    setManuscriptTitle(fields.title);
    saveProgress({ manuscriptTitle: fields.title, manuscriptGenre: fields.genre });
    return true; // advance to the pipeline step; the manuscript is created later, exactly once.
  };

  // Deferred single write: create the Branch-B manuscript from the held details exactly once.
  // Idempotent and retry-safe — once created, the id is cached, so a re-run after a partial failure
  // reuses it rather than creating a second (the cap can't be tripped by a retry, and every imported
  // query attaches to one manuscript). Returns the id, or null if there's no draft / the write failed.
  const ensureBranchBManuscript = (): Promise<string | null> =>
    ensureManuscriptOnce(b2IdCache.current, !!b2DraftRef.current, () =>
      saveBranchManuscript(b2DraftRef.current!, ManuscriptStatus.QUERYING));

  // Abandoning the manuscript path (switching the Stage-1 answer away from Branch B) forgets the held
  // draft, so a later Skip can't resurrect a manuscript the user has moved on from.
  const forgetB2Draft = () => { setB2Draft(null); b2DraftRef.current = null; b2IdCache.current = { id: null }; };

  // The single completion path: mark onboardingComplete and exit to the
  // dashboard. Every "Skip setup" and every branch finish routes through here. Writes are
  // non-blocking (see persistProfile) so a denied field can never trap the exit.
  const finishOnboarding = async () => {
    localStorage.removeItem(STORAGE_KEY);
    persistProfile({ onboardingComplete: true });
    onComplete();
  };

  // Skipping with manuscript details already entered honours them: create the manuscript once (0
  // exist mid-flow, so the cap can't fire), then finish. A skip before any details writes nothing.
  const handleSkip = async () => {
    if (b2DraftRef.current) await ensureBranchBManuscript();
    await finishOnboarding();
  };

  /* ⚠️ THE HARDCODED-DEFAULTS AGENT WRITER IS GONE WITH THE SCREEN IT SERVED.
     It stamped six facts nobody had stated — starRating 3, responseTimeWeeks 12, submissionStatus
     OPEN, noResponseMeansNo false, submissionMethod EMAIL, materialsWanted ["Query Letter"] — on
     the writer's very first agent. Absence is a first-class state for the first three, so that
     agent was born in a condition the rest of the app treats as impossible for a new record, and
     the invented rating fed the agent list's default sort as if it were real. It also captured an
     email and a genre list and then dropped both on the floor. Agents are added on the agent list
     now, through the form that stores what it asks for. */

  // Overlay wrapper
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: onbGround,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* ⚠️ THE HEADER IS A SIBLING OF THE FLOW, NOT A CHILD OF ANY SCREEN. Rendered inside
          `ScreenTransition` it would animate in and out on every step change, so the one element
          whose job is to say "you are still in the same place" would be the one thing that kept
          moving. */}
      <OnboardingHeader
        steps={spineSteps}
        activeIndex={spineAt}
        onExit={handleStageSkip}
      />

      <div style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: step === 1 ? "stretch" : "center",
        justifyContent: "center",
      }}>
      <ScreenTransition stepKey={flow ? FLOW_KEY[flow] : step}>
        {/* Branch A — manuscript-led setup: A2 readiness → A3a details / A3b still-writing. */}
        {flow === "A" && (
          <CenterWrap>
            <BranchA
              stepLabel={stepLabel}
              onExit={() => { setBranchError(null); setFlow(null); setSpineStep("you"); }}
              onSaveReady={(r) => void handleBranchASaveReady(r)}
              onSaveStillWriting={(r) => void handleBranchAStillWriting(r)}
              error={branchError}
            />
          </CenterWrap>
        )}

        {/* Branch B — capture the book (B2), then bring the pipeline across (B3). */}
        {flow === "B" && (
          <CenterWrap>
            <BranchB
              stepLabel={stepLabel}
              onSkip={handleSkip}
              onStage={setSpineStep}
              onExit={() => { setBranchError(null); setFlow(null); setSpineStep("you"); }}
              onSaveBook={handleBranchBSaveBook}
              initialBook={b2Draft}
              onEnsureManuscript={ensureBranchBManuscript}
              /* ⚠️ READS THE STORED ANSWER, not this component's local state — see
                 lib/onboardingStage. The field used to be written to the profile and never read
                 back from it. */
              defaultImport={importDefaultForStage(effectiveQueryingStage(currentUser?.queryingStage, queryingStage))}
              onAddByHand={async () => {
                // Manual-add finish: create the held manuscript once, then finish onto the agent
                // list, where the app's real Add-an-agent form lives.
                if (await ensureBranchBManuscript()) {
                  setBranchError(null);
                  sessionStorage.setItem("scriptally_post_onboarding_tab", "agents");
                  await finishOnboarding();
                }
              }}
              onOpenImportDesk={async () => {
                // Escape hatch into the Import desk: create the manuscript first (best-effort), then finish.
                await ensureBranchBManuscript();
                sessionStorage.setItem("scriptally_post_onboarding_tab", "import");
                await finishOnboarding();
              }}
              onImportComplete={() => void finishOnboarding()}
              onUpgrade={() => {
                // Free import spent → leave onboarding into the Plans page via the existing
                // post-onboarding-tab hatch (App reads + clears it on completion).
                sessionStorage.setItem("scriptally_post_onboarding_tab", "plans");
                void finishOnboarding();
              }}
              error={branchError}
            />
          </CenterWrap>
        )}

        {!flow && step === 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            minHeight: "100%",
            padding: "32px 16px",
            boxSizing: "border-box",
          }}>
            <WelcomeStageScreen
              stepLabel={stepLabel}
              selected={queryingStage}
              onSelect={(s) => { setQueryingStage(s); saveProgress({ queryingStage: s }); if (STAGE_TO_BRANCH[s] !== "B") forgetB2Draft(); }}
              onContinue={handleStageContinue}
            />
          </div>
        )}

      </ScreenTransition>
      </div>

      {/* Submitting overlay */}
      {isSubmitting && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(247,244,238,0.72)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: onbMuted, letterSpacing: "0.08em" }}>
            Saving…
          </span>
        </div>
      )}
    </div>
  );
};
