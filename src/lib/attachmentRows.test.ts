/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ WRITTEN BEFORE THE IMPLEMENTATION AND RUN RED FIRST. The claim it exists for is the one this
 * page has already got wrong once: the pitch field discarded what a writer typed for months because
 * a denied write returned successfully. An upload is the same shape with a worse outcome — a file
 * shown as attached that is not stored anywhere.
 */
import { describe, it, expect } from "vitest";
import { attachmentRows, UploadState } from "./attachmentRows";
import { Attachment } from "../types";

const att = (id: string, name: string, at: string): Attachment => ({
  id, userId: "u1", manuscriptId: "ms-1", fileName: name,
  size: 1024, contentType: "application/pdf",
  storagePath: `users/u1/manuscripts/ms-1/attachments/${id}`,
  uploadedAt: at,
});

describe("attachment rows — what may be shown as attached", () => {
  /**
   * ⚠️ THE ASSERTION THE WHOLE MODULE EXISTS FOR. No upload state, in any combination, may produce
   * a row a reader would take for a stored file. It is stated over the WHOLE output rather than
   * per input, because the failure would be a composition — one branch leaking into the other list.
   */
  it("no upload state can ever produce a committed row", () => {
    const uploads: UploadState[] = [
      { kind: "uploading", id: "u-1", fileName: "a.pdf", size: 10 },
      { kind: "failed", id: "u-2", fileName: "b.pdf", reason: "Upload was refused." },
    ];
    const rows = attachmentRows([], uploads);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status !== "committed"), "an unstored file rendered as attached").toBe(true);
  });

  /** A failed upload is FAILED — not absent, and not quietly retried into looking fine. */
  it("a failed upload renders as failed, carrying its reason", () => {
    const rows = attachmentRows([], [{ kind: "failed", id: "u-1", fileName: "b.pdf", reason: "Too large." }]);
    expect(rows[0].status).toBe("failed");
    expect(rows[0].reason).toBe("Too large.");
    expect(rows[0].fileName).toBe("b.pdf");
  });

  /**
   * ⚠️ AND THE FAILURE IS NOT SILENTLY DROPPED EITHER. Rendering nothing for a failed upload is the
   * same lie told the other way: the writer chose a file, saw it vanish, and is told nothing.
   */
  it("a failed upload is never simply omitted", () => {
    expect(attachmentRows([], [{ kind: "failed", id: "u-1", fileName: "b.pdf", reason: "x" }])).toHaveLength(1);
  });

  it("committed rows come from the records, newest first", () => {
    const rows = attachmentRows(
      [att("a1", "old.pdf", "2026-01-01T00:00:00Z"), att("a2", "new.pdf", "2026-06-01T00:00:00Z")],
      [],
    );
    expect(rows.map((r) => r.fileName)).toEqual(["new.pdf", "old.pdf"]);
    expect(rows.every((r) => r.status === "committed")).toBe(true);
  });

  /**
   * ⚠️ IN-FLIGHT WORK SITS ABOVE THE SETTLED LIST. It is what the writer just did and, in the
   * failed case, the thing needing attention — under a long list it would be invisible.
   */
  it("pending and failed sit above the committed list", () => {
    const rows = attachmentRows(
      [att("a1", "stored.pdf", "2026-01-01T00:00:00Z")],
      [{ kind: "uploading", id: "u-1", fileName: "busy.pdf", size: 10 }],
    );
    expect(rows.map((r) => r.status)).toEqual(["uploading", "committed"]);
  });

  /**
   * ⚠️ THE COMMITTED LIST IS THE LISTENER'S, AND UPLOAD STATE MAY NOT EDIT IT. A pending upload
   * that shadowed or replaced a record would put optimism back in by the side door.
   */
  it("upload state never adds to, removes from or reorders the committed rows", () => {
    const records = [att("a1", "one.pdf", "2026-01-01T00:00:00Z"), att("a2", "two.pdf", "2026-02-01T00:00:00Z")];
    const bare = attachmentRows(records, []).filter((r) => r.status === "committed");
    const withUploads = attachmentRows(records, [
      { kind: "uploading", id: "a1", fileName: "one.pdf", size: 10 },
      { kind: "failed", id: "a2", fileName: "two.pdf", reason: "x" },
    ]).filter((r) => r.status === "committed");
    expect(withUploads.map((r) => r.key)).toEqual(bare.map((r) => r.key));
  });

  /** Keys are unique across both lists, or React reuses a DOM node between a pending and a stored row. */
  it("keys are unique even when an upload shares an id with a record", () => {
    const rows = attachmentRows(
      [att("x", "one.pdf", "2026-01-01T00:00:00Z")],
      [{ kind: "uploading", id: "x", fileName: "one.pdf", size: 10 }],
    );
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});
