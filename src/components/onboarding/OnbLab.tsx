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

declare global {
  interface Window { __onbLab?: { calls: Array<{ name: string; arg?: unknown }> } }
}

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
  children: React.ReactNode;
}> = ({ flow, at, manuscript, plan, children }) => {
  const steps = spineFor(flow);
  const index = Math.max(0, spineIndex(steps, at));
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
      onExit={labSpy("exit")}
    >
      {children}
    </SetupFrame>
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
