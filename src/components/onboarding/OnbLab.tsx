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
import { BranchA } from "./BranchA";
import { BranchB } from "./BranchB";
import { CaptureFork } from "./CaptureFork";
import { ConfirmScreen } from "./ConfirmScreen";
import { UsedFree, UsedProMonth, Unreadable, NothingImported, Unloaded } from "./DeadEnd";
import { emptyManuscriptFields } from "./ManuscriptFields";
import { ManuscriptStatus } from "../../types";
import { LabReading, LabImporting, LabOverview, LabReview } from "./OnbLabImport";
import { useAskBeforeLeaving } from "./SkipSetupConfirm";


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
  children: React.ReactNode;
}> = ({ flow, at, manuscript, plan, exit = "open", children }) => {
  const steps = spineFor(flow);
  const index = Math.max(0, spineIndex(steps, at));
  const leaving = useAskBeforeLeaving(exit, labSpy("skip"));
  const hideExit = exit === "none";
  return (
    <SetupFrame
      form="setup"
      group={SETUP_GROUP}
      name={steps[index]?.label ?? ""}
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

const LabWelcome: React.FC = () => {
  const [sel, setSel] = React.useState<"starting" | "early" | "deep" | "interest" | null>(null);
  return <WelcomeStageScreen selected={sel} onSelect={setSel} onContinue={labSpy("continue")} />;
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
      <ConfirmScreen fileName={file.name} fileSize={file.size} tier={tier}
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
  if (s === "ready" || s === "details") {
    const st = q.get("status");
    const status = st === "drafting" ? ManuscriptStatus.DRAFTING : st === "revising" ? ManuscriptStatus.REVISING
      : st === "ready" ? ManuscriptStatus.READY_TO_QUERY : s === "details" ? ManuscriptStatus.READY_TO_QUERY : null;
    return (
      <LabSetup flow="A" at="book">
        <BranchA
          initialScreen={s === "details" ? "details" : "readiness"} initialStatus={status}
          onExit={labSpy("back")} onSaveReady={labSpy("saveReady")} onSaveStillWriting={labSpy("saveStillWriting")}
          error={q.get("err") === "1" ? "You’ve reached the manuscript limit on the free plan." : null}
        />
      </LabSetup>
    );
  }

  if (s === "book") {
    return (
      <LabSetup flow="B" at="book">
        <BranchB
          onSkip={labSpy("skip")} onExit={labSpy("back")}
          onSaveBook={async (f) => { labSpy("saveBook")(f.title); return false; }}
          initialBook={q.get("filled") === "1" ? { ...emptyManuscriptFields(), title: LAB_TITLE, genre: "Upmarket" } : null}
          onEnsureManuscript={async () => null}
          defaultImport="smart" onAddByHand={labSpy("byhand")} onOpenImportDesk={labSpy("importDesk")}
          onImportComplete={labSpy("importComplete")}
          error={q.get("err") === "1" ? "You’ve reached the manuscript limit on the free plan." : null}
        />
      </LabSetup>
    );
  }

  const tier = q.get("plan") === "pro" ? "pro" : "free";
  if (s === "fork") {
    const pick = q.get("pick");
    return (
      <LabSetup flow="B" at="list" manuscript plan={tier === "pro" ? UserPlan.PRO : UserPlan.FREE}>
        <CaptureFork
          ringed={pick === "template" ? "template" : pick === "byhand" ? "byhand" : "smart"} tier={tier}
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
  if (s === "reading") return imp(<LabReading hold={q.get("hold")} />, "none");
  if (s === "importing") return imp(<LabImporting done={q.get("done") === "1"} loop={q.get("loop") === "1"} />, "none");
  if (s === "overview") return imp(<LabOverview fx={q.get("fx")} title={LAB_TITLE} />, "ask");
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
