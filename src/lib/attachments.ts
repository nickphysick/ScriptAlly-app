/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ MANUSCRIPT ATTACHMENTS — the caps, and which of them are real ═════════════════════════════
 *
 * ⚠️ TWO OF THESE THREE CAPS ARE ENFORCED AND ONE IS NOT, AND THE DIFFERENCE IS STATED HERE SO NO
 * COMMENT ELSEWHERE HAS TO IMPLY IT.
 *
 *   MAX_ATTACHMENT_BYTES  — ENFORCED. `storage.rules` measures `request.resource.size` itself, so
 *                           this is not forgeable by a caller.
 *   ALLOWED_CONTENT_TYPES — ENFORCED, as a type GATE rather than content sniffing: the content type
 *                           is declared by the client, so a caller driving the SDK by hand can
 *                           mislabel a file. Accepted; the size cap is what bounds cost.
 *   MAX_ATTACHMENTS       — **NOT ENFORCED. A UI LIMIT AND NOTHING MORE.** Storage rules see one
 *                           request, never a directory, so there is nothing to count.
 *
 * ⚠️ THE FILE-COUNT CAP WAS *DELIBERATELY* LEFT UNENFORCED, having been costed. The enforceable
 * shape is a denormalised counter on the manuscript with the rules asserting an increment — and its
 * failure mode is that one failed delete leaves the counter permanently high and locks the writer
 * out of their own manuscript, with no way to correct it. That is a worse failure than a bypass
 * requiring somebody to drive the SDK by hand, and it fails toward the thing you CANNOT see, which
 * is the opposite of the rule the deletion cascade is built on.
 *
 * ⚠️ SO: DO NOT WRITE A COMMENT, A LABEL OR A MESSAGE ANYWHERE THAT IMPLIES THE COUNT IS A CONTROL.
 * A guard that is believed and absent is worse than one that is merely absent.
 */

/** 25 MB. ⚠️ ARTEFACT-LOCKED to the same literal in `storage.rules` AND `firestore.rules` — three
 *  copies of one number is two too many, so `attachments.test.ts` asserts all three agree. If they
 *  drift, the client permits an upload the rules then deny SILENTLY. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/** ⚠️ A UI LIMIT. Not in any rule. See the header — do not describe this as enforced. */
export const MAX_ATTACHMENTS = 20;

/**
 * ⚠️ ARTEFACT-LOCKED to `storage.rules`'s `allowedType()`. The variants are not padding: browsers
 * disagree about several of these (.rtf as application/rtf or text/rtf, .md as text/markdown or
 * text/x-markdown, .csv sometimes as application/csv), and listing one spelling each would reject
 * files on some machines and not others — unreproducible for whoever reports it.
 */
export const ALLOWED_CONTENT_TYPES: readonly string[] = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "application/rtf", "text/rtf",
  "text/plain",
  "text/markdown", "text/x-markdown",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv", "application/csv",
  "image/jpeg",
  "image/png",
];

/** What the writer is told they may attach — extensions, not MIME types, because that is what they see. */
export const ALLOWED_EXTENSIONS = "PDF, DOC, DOCX, ODT, RTF, TXT, MD, XLSX, CSV, JPG, PNG";

/**
 * ⚠️ ONE BUILDER, BECAUSE THE RULES CHECK THIS PATH EXACTLY. `isValidAttachment` requires
 * `storagePath == 'users/' + uid + '/manuscripts/' + manuscriptId + '/attachments/' + id`, so a
 * second place that composes it by hand is a silent denial waiting to happen.
 */
export const attachmentStoragePath = (userId: string, manuscriptId: string, id: string): string =>
  `users/${userId}/manuscripts/${manuscriptId}/attachments/${id}`;

/**
 * ⚠️ THE ID IS THE STORAGE FILENAME AND MUST SATISFY `isValidId` — `^[a-zA-Z0-9_-]+$`. A generated
 * id built from display text is how this repo has been bitten before: `Revise & Resubmit` contains
 * an ampersand, and every heal write for those queries was denied permanently and silently. So the
 * id is generated, never derived from the filename, and the filename is carried as a FIELD.
 */
export const newAttachmentId = (): string =>
  `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type RejectReason = "size" | "type" | "count";

/**
 * Why an upload cannot be attempted, or null if it can. Pure, so the UI and any future caller
 * cannot disagree about the answer.
 *
 * ⚠️ `count` IS THE UI LIMIT AND THE OTHER TWO ARE MIRRORS OF THE RULES. Returning them from one
 * function does not make them equal in force — the caller shows a message either way, but only the
 * first two would also be refused by the server.
 */
export const rejectUpload = (
  file: { size: number; type: string },
  existingCount: number,
): RejectReason | null => {
  if (existingCount >= MAX_ATTACHMENTS) return "count";
  if (file.size > MAX_ATTACHMENT_BYTES) return "size";
  if (!ALLOWED_CONTENT_TYPES.includes(file.type)) return "type";
  return null;
};

/** Bytes as a writer reads them. No decimals under a megabyte — nobody needs 0.03 MB. */
export const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
