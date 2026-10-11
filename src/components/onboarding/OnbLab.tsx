/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * #/onb-lab — a place to measure the screens before the app (onboarding v5).
 *
 * These screens are hard to reach signed in and impossible to hold in a given state by hand, so
 * each one is mounted here over fixtures, inside the REAL `SetupFrame`, chosen by a query:
 *
 *   #/onb-lab?s=frame&form=setup&flow=B&at=list&ms=1
 *   #/onb-lab?s=frame&form=account&mode=signin
 *   #/onb-lab?s=import-page&ent=free_available|free_used|pro_available|pro_month_used
 *
 * Served by every non-production build and gated at the call site on `MODE` (App.tsx), so
 * production carries none of it. No sign-in, and it writes nothing: every handler a screen is
 * given records its own name on `window.__onbLab.calls` and does nothing else, which is also how
 * the locks prove a button is wired to its own handler.
 */

import React from "react";
import { SetupFrame, SETUP_GROUP, ACCOUNT_GROUP } from "./SetupFrame";
import { spineFor, spineIndex, SpineId, OnboardingBranch } from "../../lib/onboardingSpine";
import { UserPlan } from "../../types";
import { Auth } from "../Auth";
import { Onboarding, WelcomeStageScreen } from "../Onboarding";
import { AckTitle } from "./v9/AckTitle";
import { BookMore } from "./v9/BookMore";
import type { V9Stage } from "../../lib/onboardingV9";
import { BranchB } from "./BranchB";
import { CaptureFork } from "./CaptureFork";
import { ConfirmScreen } from "./ConfirmScreen";
import { UsedFree, UsedProMonth, Unreadable, NothingImported, Unloaded } from "./DeadEnd";
import { emptyManuscriptFields } from "./ManuscriptFields";
import { ManuscriptStatus } from "../../types";
import { LabReading, LabImporting, LabOverview, LabReview, labCommit, labFixture, LAB_FILE, LAB_UID } from "./OnbLabImport";
import { HandoffNav, HANDOFF_TAB } from "./HandoffNav";
import { ExitMode } from "./BranchB";
import { useAskBeforeLeaving } from "./SkipSetupConfirm";
import { ImportPage } from "../import/ImportPage";
import type { SmartImportEntitlement } from "../../lib/smartImportEntitlement";


/** A handler that only records that it was called. */
export const labSpy = (name: string) => (arg?: unknown) => {
  if (typeof window === "undefined") return;
  (window.__onbLab ??= { calls: [] }).calls.push({
    name,
    arg: arg instanceof File ? { file: arg.name, size: arg.size } : typeof arg === "string" ? arg : undefined,
  });
};

export const labQuery = (): URLSearchParams => {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  const q = hash.indexOf("?");
  return new URLSearchParams(q === -1 ? "" : hash.slice(q + 1));
};

export const LAB_USER = { name: "Nick Physick", plan: UserPlan.FREE };
export const LAB_TITLE = "Murphy's Day Out";

/** The set-up frame, as `Onboarding` mounts it, around one lab screen. */
export const LabSetup: React.FC<{
  flow: OnboardingBranch;
  at: SpineId;
  manuscript?: boolean;
  plan?: UserPlan;
  /** What the frame's way out is, as the branch reports it: the loaders draw none; the summary and
   *  the review ask first. */
  exit?: "open" | "ask" | "none";
  /** The importing loader is up: the frame takes the dashboard's page tokens. */
  appMode?: boolean;
  /** The hand-off has begun: the tab names the dashboard and the app's nav fades in. */
  handingOff?: boolean;
  children: React.ReactNode;
}> = ({ flow, at, manuscript, plan, exit = "open", appMode, handingOff, children }) => {
  const steps = spineFor(flow);
  const index = Math.max(0, spineIndex(steps, at));
  const leaving = useAskBeforeLeaving(exit, labSpy("skip"));
  const hideExit = exit === "none";
  return (
    <SetupFrame
      form="setup"
      group={handingOff ? HANDOFF_TAB.group : SETUP_GROUP}
      name={handingOff ? HANDOFF_TAB.name : steps[index]?.label ?? ""}
      appMode={appMode}
      handoff={appMode ? { on: !!handingOff, nav: <HandoffNav /> } : null}
      steps={steps}
      activeIndex={index}
      manuscriptTitle={manuscript ? LAB_TITLE : null}
      user={{ ...LAB_USER, plan: plan ?? UserPlan.FREE }}
      exitLabel="Skip for now"
      onExit={exit === "open" ? labSpy("exit") : leaving.onExit}
      hideExit={hideExit}
    >
      {children}
      {leaving.confirm}
    </SetupFrame>
  );
};

/**
 * The real branch from the summary to the hand-over, wired the way `Onboarding` wires it: the
 * branch reports its exit mode, that it is importing, and the hand-off; this owns the frame. The
 * commit is a stand-in that writes nothing. When the import completes the frame is left in its
 * handed-over state (the app cannot mount signed out) and the call is recorded.
 */
const LabFlow: React.FC<{ fx: string | null; skip: number; none: boolean; floorMs: number }> = ({ fx, skip, none, floorMs }) => {
  const [exit, setExit] = React.useState<ExitMode>("ask");
  const [importing, setImporting] = React.useState(false);
  const [handingOff, setHandingOff] = React.useState(false);
  const [arrived, setArrived] = React.useState(false);
  const lab = React.useMemo(() => ({ result: labFixture(fx), fileName: LAB_FILE, title: LAB_TITLE, commit: labCommit({ skip, none }), uid: LAB_UID, floorMs }), [fx, skip, none, floorMs]);
  return (
    <LabSetup flow="B" at="list" manuscript exit={arrived ? "none" : exit} appMode={importing || arrived} handingOff={handingOff}>
      <div data-lab-flow={arrived ? "arrived" : "running"} style={{ display: "contents" }}>
        <BranchB
          lab={lab}
          onSkip={labSpy("skip")} onExit={labSpy("back")} onSaveBook={async () => false} onEnsureManuscript={async () => "lab-ms"}
          onAddByHand={labSpy("byhand")} onOpenImportDesk={labSpy("importDesk")}
          onExitMode={setExit} onImporting={setImporting} onHandoff={() => setHandingOff(true)}
          onImportComplete={(_o, destination) => { labSpy("importComplete")(destination); setArrived(true); }}
        />
      </div>
    </LabSetup>
  );
};

const LabWelcome: React.FC = () => {
  const [sel, setSel] = React.useState<"starting" | "early" | "deep" | "interest" | null>(null);
  return <WelcomeStageScreen name={labQuery().get("name")} selected={sel} onSelect={setSel} onContinue={labSpy("continue")} />;
};

/** The confirm with a real picker behind "Change", wired the way BranchB wires it: choosing a
 *  second file replaces the pending one and the name shown, and reads nothing. */
const LabConfirm: React.FC<{ tier: "free" | "pro" }> = ({ tier }) => {
  const [file, setFile] = React.useState<{ name: string; size: number }>({ name: "my agents FINAL v3.csv", size: 14_300 });
  const input = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={input} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} data-picker="smart"
             onChange={(e) => { const f = e.target.files?.[0]; if (f) { labSpy("pickFile")(f); setFile({ name: f.name, size: f.size }); } e.target.value = ""; }} />
      <ConfirmScreen fileName={file.name} fileSize={file.size}
                     onChange={() => input.current?.click()} onBack={labSpy("back")} onRead={labSpy("runMapping")} />
    </>
  );
};

const Filler: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div data-lab="filler">
    {Array.from({ length: rows }, (_, i) => (
      <p key={i} style={{ maxWidth: 620, margin: "0 0 14px" }}>
        Lab filler — the frame is the subject here, not this text.
      </p>
    ))}
  </div>
);

export const OnbLab: React.FC = () => {
  const q = labQuery();
  const s = q.get("s") ?? "frame";
  const flow = (q.get("flow") === "A" ? "A" : q.get("flow") === "B" ? "B" : null) as OnboardingBranch;
  const at = (q.get("at") ?? "you") as SpineId;

  /* The account screens: the REAL `Auth`, held in a state by its lab prop. Nothing is submitted
     by mounting it; a lock that types into it and presses submit stops at the built validation. */
  if (s === "signup") return <Auth initialMode="signup" lab={{ showInvite: q.get("invite") === "1" ? true : q.get("invite") === "0" ? false : undefined }} />;
  if (s === "signin") return <Auth initialMode="login" />;
  if (s === "reset") return <Auth initialMode="login" lab={{ view: "reset" }} />;
  if (s === "reset-sent") return <Auth initialMode="login" lab={{ view: "reset", resetSent: true, email: "writer@example.com" }} />;

  /* The REAL set-up, start to finish, for the one claim that needs it: choosing a branch changes
     the steps. Signed out it has no user to write to. */
  if (s === "live") return <Onboarding onComplete={labSpy("complete")} />;

  if (s === "welcome") return <LabSetup flow={null} at="you"><LabWelcome /></LabSetup>;
  /* Step 2's opening (onboarding v9): the acknowledgement for a journey, then the title card. */
  if (s === "ack") {
    const stage = (["starting", "early", "deep", "interest"].includes(q.get("stage") ?? "") ? q.get("stage") : "early") as V9Stage;
    const titles: Record<V9Stage, string> = { starting: "Just getting started", early: "A few queries out", deep: "Deep in it", interest: "Had some interest" };
    return (
      <LabSetup flow={stage === "starting" ? "A" : "B"} at="book">
        <AckTitle stage={stage} stageTitle={titles[stage]} onChange={labSpy("change")} onContinue={(r) => labSpy("continue")(`${r.title}|${r.status ?? ""}`)} />
      </LabSetup>
    );
  }
  /* "Your book" (onboarding v9): the title page and the three structured fields. `filled=1` opens
     it with genres, an age category and a word count already held, as Back does. */
  if (s === "bookmore") {
    const title = q.get("title") ?? LAB_TITLE;
    const filled = q.get("filled") === "1";
    return (
      <LabSetup flow="B" at="book">
        <BookMore
          title={title} name={q.get("name")}
          initial={{ ...emptyManuscriptFields(), ageCategory: filled ? "Adult" : "", title, ...(filled ? { genre: "Fantasy", subGenres: ["Horror"], wordCount: "85000" } : {}) }}
          error={q.get("err") === "1" ? "You’ve reached the manuscript limit on the free plan." : null}
          onBack={labSpy("back")} onContinue={(f) => labSpy("saveBook")(JSON.stringify(f))}
        />
      </LabSetup>
    );
  }

  const tier = q.get("plan") === "pro" ? "pro" : "free";
  if (s === "fork") {
    return (
      <LabSetup flow="B" at="list" manuscript plan={tier === "pro" ? UserPlan.PRO : UserPlan.FREE}>
        <CaptureFork
          tier={tier}
          onChooseFile={labSpy("picker")} onDropFile={labSpy("pickFile")} onUploadTemplate={labSpy("templatePicker")}
          onAddByHand={labSpy("byhand")} onBack={labSpy("back")} onNothingYet={labSpy("skip")}
          onOpenImportDesk={labSpy("importDesk")} onDownloadTemplate={labSpy("download")}
        />
      </LabSetup>
    );
  }
  if (s === "confirm") return <LabSetup flow="B" at="list" manuscript plan={tier === "pro" ? UserPlan.PRO : UserPlan.FREE}><LabConfirm tier={tier} /></LabSetup>;

  /* The dead ends of "Your list" — each its own screen, each handler a spy. */
  const dead: Record<string, React.ReactNode> = {
    "used-free": <UsedFree onBack={labSpy("back")} onAddByHand={labSpy("byhand")} onUseTemplate={labSpy("useTemplate")} />,
    "used-pro": <UsedProMonth nextLabel="1 November 2026" onBack={labSpy("back")} onAddByHand={labSpy("byhand")} />,
    unreadable: <Unreadable onBack={labSpy("back")} onAddByHand={labSpy("byhand")} onDownload={labSpy("download")} />,
    nothing: (
      <NothingImported
        outcome={{ queriesImported: 0, agentsCreated: 0, agentsMerged: 0, queriesSkipped: 3, errors: q.get("errs") === "1" ? ["Row 4: no agent or agency name.", "Row 9: the date could not be read."] : [] }}
        skippedReasons={["No agent or agency name"]} onBackToReview={labSpy("review")}
      />
    ),
    unloaded: <Unloaded onAddByHand={labSpy("byhand")} onRestart={labSpy("restart")} />,
  };
  if (dead[s]) return <LabSetup flow="B" at="list" manuscript plan={s === "used-pro" ? UserPlan.PRO : UserPlan.FREE}>{dead[s]}</LabSetup>;

  /* The import's steps (part 2). Each sits where `Onboarding` puts it: on "Your list", with the
     manuscript card showing. */
  const imp = (node: React.ReactNode, exit: "ask" | "none") => (
    <LabSetup flow="B" at="list" manuscript exit={exit}>{node}</LabSetup>
  );
  /* The Import page (part 3): its tiles in each entitlement state, every press a spy. The flow's
     own screens are the ones above; on the real route they render in the app's sheet. */
  if (s === "import-page") {
    const reason = (q.get("ent") ?? "free_available") as SmartImportEntitlement["reason"];
    const ent: SmartImportEntitlement = {
      allowed: reason === "free_available" || reason === "pro_available",
      reason,
      tier: reason.startsWith("pro") ? "pro" : "free",
      ...(reason === "pro_month_used" ? { nextAvailable: "2026-11-01" } : {}),
    } as SmartImportEntitlement;
    /* `fx=` mounts the shared flow on its summary over a fixture, with a stand-in commit, so the
       in-app Cancel and the end of an import can be driven without an account. `live=1` leaves the
       tiles' real handlers on (the lab has no manuscript, so a press opens the book step). */
    const fx = q.get("fx");
    const flow = fx ? { result: labFixture(fx), fileName: LAB_FILE, title: LAB_TITLE, commit: labCommit({ skip: Number(q.get("skip") ?? 0), none: q.get("none") === "1" }), uid: LAB_UID, floorMs: Number(q.get("floor") ?? 300) } : undefined;
    const navigate = (tab: string) => labSpy("navigate")(tab);
    return (
      <div data-import-lab="" style={{ minHeight: "100vh", background: "var(--ws-page)" }}>
        <ImportPage onNavigate={navigate} lab={{ entitlement: ent, spy: fx || q.get("live") === "1" ? undefined : labSpy, flow, ensure: async () => { labSpy("ensureManuscript")(); return "lab-ms"; } }} />
      </div>
    );
  }

  if (s === "reading") return imp(<LabReading hold={q.get("hold")} />, "none");
  if (s === "importing") return <LabSetup flow="B" at="list" manuscript exit="none" appMode handingOff={q.get("handoff") === "1"}><LabImporting done={q.get("done") === "1"} loop={q.get("loop") === "1"} /></LabSetup>;
  if (s === "flow") return <LabFlow fx={q.get("fx")} skip={Number(q.get("skip") ?? 0)} none={q.get("none") === "1"} floorMs={Number(q.get("floor") ?? 600)} />;
  if (s === "overview") return imp(<LabOverview fx={q.get("fx")} title={LAB_TITLE} rows={q.get("rows") ? Number(q.get("rows")) : null} />, "ask");
  if (s === "review") return imp(<LabReview fx={q.get("fx")} />, "ask");

  if (s === "frame" && q.get("form") === "account") {
    const signin = q.get("mode") === "signin";
    return (
      <SetupFrame
        form="account"
        group={ACCOUNT_GROUP}
        name={signin ? "Sign in" : "Create account"}
        otherTab={signin ? { id: "signup", label: "Create account" } : { id: "signin", label: "Sign in" }}
        onTab={labSpy("tab")}
        exitLabel="Back to site"
        onExit={labSpy("exit")}
      >
        <Filler rows={Number(q.get("rows") ?? 3)} />
      </SetupFrame>
    );
  }
  return (
    <LabSetup flow={flow} at={at} manuscript={q.get("ms") === "1"} plan={q.get("plan") === "pro" ? UserPlan.PRO : UserPlan.FREE}>
      <Filler rows={Number(q.get("rows") ?? 3)} />
    </LabSetup>
  );
};
