/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ WHAT THE ATTACHMENTS PANEL MAY SHOW AS ATTACHED ═══════════════════════════════════════════
 *
 * ⚠️ THE COMMITTED LIST COMES FROM THE FIRESTORE LISTENER AND FROM NOWHERE ELSE. In-flight uploads
 * live in a SEPARATE array and are merged only at render, as rows that are visibly not stored. A
 * file therefore appears as attached only once Firestore has acknowledged its record — optimism
 * cannot leak in, because there is nowhere in the committed list to put it.
 *
 * ⚠️ THIS IS A PURE FUNCTION SO THE CLAIM IS TESTABLE AT ALL. This repo has no jsdom, so a
 * component cannot be driven through a failed upload in a test; putting the decision here means the
 * invariant is asserted directly rather than inferred from markup. Proved red against the naive
 * merge — six of seven cases, including "an unstored file rendered as attached".
 *
 * ⚠️ AND A FAILURE IS NEVER SIMPLY DROPPED. Rendering nothing for a refused upload is the same lie
 * told the other way round: the writer chose a file, watched it vanish, and was told nothing. The
 * pitch field discarded writing for months by exactly that route.
 */
import { Attachment } from "../types";

export type UploadState =
  | { kind: "uploading"; id: string; fileName: string; size: number }
  | { kind: "failed"; id: string; fileName: string; reason: string };

export interface AttachmentRow {
  key: string;
  fileName: string;
  /** `committed` means Firestore holds a record. The other two mean it does not. */
  status: "committed" | "uploading" | "failed";
  size?: number;
  reason?: string;
  /** Present only on a committed row — a download needs a real storagePath. */
  attachment?: Attachment;
}

/**
 * ⚠️ THE KEY PREFIXES ARE NOT DECORATION. An upload and a record can share an id (a retry of a file
 * whose record has since landed), and React would then reuse one DOM node for a pending row and a
 * stored one — the pending state visibly surviving onto a file that is actually fine.
 */
export const attachmentRows = (
  committed: Attachment[],
  uploads: UploadState[],
): AttachmentRow[] => [
  /* In-flight work first: it is what the writer just did, and in the failed case the thing that
     needs them. Under a long list it would be invisible. */
  ...uploads.map((u): AttachmentRow =>
    u.kind === "uploading"
      ? { key: `up-${u.id}`, fileName: u.fileName, status: "uploading", size: u.size }
      : { key: `up-${u.id}`, fileName: u.fileName, status: "failed", reason: u.reason }),

  /* Newest first. `uploadedAt` is an ISO string, so a lexical compare is a chronological one. */
  ...[...committed]
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map((a): AttachmentRow => ({
      key: `at-${a.id}`,
      fileName: a.fileName,
      status: "committed",
      size: a.size,
      attachment: a,
    })),
];
