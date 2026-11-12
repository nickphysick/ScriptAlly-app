/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings' email writes, as pure steps (non-workspace v1, Phase 2) — so the round trip and its Undo are tested as
 * behaviour, not as source text. The page hands in its two writers and its snackbar.
 *
 * ⚠️ EVERY SAVE RETURNS ITS OWN UNDO, and the Undo writes back exactly what was there before.
 * ⚠️ "FINISHED QUERYING" WRITES ONE THING: the two reminder emails off. It never touches the deletion record.
 */
import { marketingConsentRecord, type NotifyPrefs } from "./accountPrefs";

export type EmailToggle = "nudges" | "weekly" | "news";
export const EMAIL_LABEL: Record<EmailToggle, string> = { nudges: "Nudge reminders", weekly: "Weekly summary", news: "Product news" };

export interface SaveDeps {
  notify: NotifyPrefs;
  updateUserProfile: (patch: Record<string, unknown>) => Promise<unknown>;
}

/** The patch that turns one email on or off. Notify keys merge into the whole map (a lone key would drop the rest). */
export function emailPatch(kind: EmailToggle, on: boolean, notify: NotifyPrefs): Record<string, unknown> {
  switch (kind) {
    case "nudges": return { notifyPrefs: { ...notify, nudges: on } };
    case "weekly": return { notifyPrefs: { ...notify, weeklyDigest: on } };
    case "news": return { marketingConsent: marketingConsentRecord(on) };
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}

/** Save one email toggle. Resolves to its message and the Undo that puts the old value back. */
export async function saveEmailToggle(kind: EmailToggle, on: boolean, deps: SaveDeps): Promise<{ message: string; undo: () => Promise<void> }> {
  const before = deps.notify;
  await deps.updateUserProfile(emailPatch(kind, on, before));
  return {
    message: `${EMAIL_LABEL[kind]} ${on ? "on" : "off"}`,
    undo: async () => { await deps.updateUserProfile(emailPatch(kind, !on, before)); },
  };
}

/** "Just finished querying?" — the two reminder emails off, and nothing else. */
export async function finishQuerying(deps: SaveDeps): Promise<{ message: string; undo: () => Promise<void> }> {
  const before = deps.notify;
  await deps.updateUserProfile({ notifyPrefs: { ...before, nudges: false, weeklyDigest: false } });
  return {
    message: "Reminder emails off. Your records are staying put.",
    undo: async () => { await deps.updateUserProfile({ notifyPrefs: before }); },
  };
}
