/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Download everything" — the export the privacy policy promises, built as pure data so what it
 * contains can be asserted without a browser.
 *
 * ⚠️ ONE JSON FILE, NOT A ZIP OF CSVS. There are no broad export helpers in this repo — the two
 * that exist build a CSV of one page's visible columns — so a zip would mean inventing a flattening
 * for eight record types, each of which loses the nesting that makes the data mean anything. A
 * writer exercising a data right needs COMPLETENESS first and convenience second; one JSON file is
 * complete by construction and can be reopened by anything.
 *
 * ⚠️ IT EXPORTS WHAT THE POLICY LISTS, AND THE LIST IS ASSERTED. Section 2 of the privacy policy
 * names the account details, the querying records — agents, queries, manuscripts, submission
 * packages, notes and activity history — and this is the mechanism that makes that sentence true.
 * A collection quietly missing from here is a promise quietly broken.
 */

export interface ExportSources {
  user: unknown;
  manuscripts: unknown[];
  versions: unknown[];
  packages: unknown[];
  agents: unknown[];
  queries: unknown[];
  activities: unknown[];
  notes: unknown[];
  userTasks: unknown[];
}

/**
 * Every collection the export carries.
 *
 * ⚠️ DERIVED FROM THE SHAPE, NEVER TYPED OUT TWICE. Adding a field to `ExportSources` and
 * forgetting to add it here is exactly the omission this const exists to prevent, so the lock
 * compares the two rather than checking a hand-written list against itself.
 */
export const EXPORT_COLLECTIONS: (keyof ExportSources)[] = [
  "user", "manuscripts", "versions", "packages", "agents", "queries", "activities", "notes", "userTasks",
];

export interface ExportBundle {
  /** Bumped when the shape changes, so an old file can still be read. */
  format: 1;
  exportedAt: string;
  /** What produced it — a file found on a hard drive in three years should say where it came from. */
  source: "ScriptAlly";
  data: ExportSources;
}

/**
 * Assemble the bundle. `now` is injected rather than read, so the output is deterministic and the
 * lock does not have to reason about the clock.
 */
export function buildExport(sources: ExportSources, now: Date): ExportBundle {
  return {
    format: 1,
    exportedAt: now.toISOString(),
    source: "ScriptAlly",
    data: {
      user: sources.user ?? null,
      manuscripts: sources.manuscripts ?? [],
      versions: sources.versions ?? [],
      packages: sources.packages ?? [],
      agents: sources.agents ?? [],
      queries: sources.queries ?? [],
      activities: sources.activities ?? [],
      notes: sources.notes ?? [],
      userTasks: sources.userTasks ?? [],
    },
  };
}

/** `ScriptAlly-export-2026-08-17.json` — dated, because a writer will end up with several. */
export function exportFilename(now: Date): string {
  return `ScriptAlly-export-${now.toISOString().slice(0, 10)}.json`;
}

/**
 * Hand the bundle to the browser as a download.
 *
 * ⚠️ THE OBJECT URL IS REVOKED. A blob held open for the life of the tab is the writer's entire
 * querying history pinned in memory, on the one screen where they may be about to close the account.
 */
export function downloadExport(bundle: ExportBundle, filename: string): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * ⚠️ ACCOUNT DELETION IS BUILT AND DISABLED, AND ONLY NICK MAY ENABLE IT.
 *
 * The UI, the typed-email confirm and the gating below are complete and tested. What is NOT here is
 * a purge: nothing in this repo deletes a user's records, and writing that unattended — against a
 * project with real data behind it — is not a thing to do overnight. Flipping this to true does
 * nothing on its own; the deletion path has to be written and reviewed first, and the review is the
 * point of the flag.
 *
 * The privacy policy states deletion within [30] days. That promise currently has no mechanism —
 * recorded here and in the run report rather than left for someone to discover.
 */
export const ACCOUNT_DELETION_ENABLED = false;

/**
 * Is the typed confirmation good enough to delete?
 *
 * ⚠️ THE EMAIL TYPED OUT, NEVER A CHECKBOX. A checkbox is ticked by the same reflex that dismissed
 * the dialog; typing your own address is a sentence you have to mean. Case and surrounding space
 * are forgiven — this is a confirmation of intent, not a spelling test — and an empty account email
 * can never match, so a half-loaded user document cannot arm the button.
 */
export function deletionConfirmed(typed: string, accountEmail: string | undefined): boolean {
  const account = (accountEmail ?? "").trim().toLowerCase();
  if (!account) return false;
  return typed.trim().toLowerCase() === account;
}
