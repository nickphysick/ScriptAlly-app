/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ONE WAY A NOTE IS SENT (Dashboard v77). The sidebar's feedback panel (`FeedbackDock`) and the
 * dashboard's founding writer card both post through this helper to the `sendBetaFeedback` callable,
 * which validates, writes one `betaFeedback` doc (uid from the verified token) and emails the desk.
 *
 * ⚠️ THE PAYLOAD IS THE DOCK'S, FIELD FOR FIELD. It was lifted out of FeedbackDock unchanged; the card
 * fills the same fields (severity "", wantsReply true, no screenshot). Never add a field here that the
 * callable's `cleanFeedback` does not read.
 */
import { appVersionLabel, describeBrowser } from "./beta";

declare const __QH_BUILD_DATE__: string | undefined;
const BUILD = typeof __QH_BUILD_DATE__ !== "undefined" ? __QH_BUILD_DATE__ : undefined;

export interface FeedbackPayload {
  kind: string;
  message: string;
  severity: string;
  wantsReply: boolean;
  pageName: string;
  route: string;
  viewport: string;
  browser: string;
  browserName: string;
  appVersion: string;
  screenshotPath: string;
}

/** What the app knows about where a note was written: the same four facts the dock shows under "Sent with it". */
export function feedbackContext(): Pick<FeedbackPayload, "route" | "viewport" | "browser" | "browserName" | "appVersion"> {
  return {
    route: typeof location === "undefined" ? "" : location.pathname,
    viewport: typeof window === "undefined" ? "" : `${window.innerWidth} × ${window.innerHeight}`,
    browser: typeof navigator === "undefined" ? "" : navigator.userAgent,
    browserName: typeof navigator === "undefined" ? "" : describeBrowser(navigator.userAgent),
    appVersion: appVersionLabel(BUILD),
  };
}

/** Post one note. Resolves when the callable has accepted it; rejects with its error otherwise. */
export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const call = httpsCallable(getFunctions(undefined, "europe-west2"), "sendBetaFeedback");
  await call(payload);
}
