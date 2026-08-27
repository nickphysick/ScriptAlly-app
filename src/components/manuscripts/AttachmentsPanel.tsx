/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ ATTACHMENTS — the files kept with a manuscript ════════════════════════════════════════════
 *
 * ⚠️ THE STYLING IS APPROVED AND IS NOT TOUCHED HERE. Playfair heading one step down, mono meta,
 * full-width hairline, plain rows, dashed add, footnote — the grammar the pitch and the synopsis
 * use. This file adds behaviour to that panel and changes none of its treatment.
 *
 * ⚠️ THE LIST IS THE FIRESTORE LISTENER'S. In-flight uploads live in local state and reach the
 * screen only through `attachmentRows`, which cannot mark them committed. A file shows as attached
 * once its RECORD exists and not before — the structural half of "a denied upload cannot render as
 * success", with the pure half asserted in attachmentRows.test.ts.
 *
 * ⚠️ AND THE 20-FILE CAP IS A UI LIMIT, NOT A CONTROL. `storage.rules` enforces 25 MB and the type
 * allowlist; nothing counts files, because Storage rules see one request and never a directory. The
 * message below says what applies without implying a server refusal.
 */
import React, { useRef, useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { SectionHeader } from "../containers/SectionHeader";
import { attachmentRows, UploadState } from "../../lib/attachmentRows";
import {
  MAX_ATTACHMENTS, ALLOWED_EXTENSIONS, formatBytes, rejectUpload, MAX_ATTACHMENT_BYTES,
} from "../../lib/attachments";
import { ATTACHMENTS_NOTE } from "../../lib/manuscriptProfile";

/** Why an upload was refused, in the writer's terms. States the limit; passes no judgement. */
const refusalCopy = (reason: "size" | "type" | "count"): string => {
  if (reason === "size") return `Files are limited to ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
  if (reason === "type") return `That file type isn’t supported. ${ALLOWED_EXTENSIONS}.`;
  return `This manuscript is at ${MAX_ATTACHMENTS} files.`;
};

export const AttachmentsPanel: React.FC<{ manuscriptId: string }> = ({ manuscriptId }) => {
  const { attachments, addAttachment, deleteAttachment, attachmentUrl } = useScriptAllyDb();
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [pct, setPct] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const mine = attachments.filter((a) => a.manuscriptId === manuscriptId);
  const rows = attachmentRows(mine, uploads);
  const atCap = mine.length >= MAX_ATTACHMENTS;

  const meta = mine.length === 0 ? "None yet" : `${mine.length} file${mine.length === 1 ? "" : "s"}`;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    /* The same input is reused, so clearing it is what lets the identical file be chosen twice. */
    e.target.value = "";
    if (!file) return;

    const id = `${Date.now()}-${file.name}`;
    const refused = rejectUpload(file, mine.length);
    if (refused) {
      setUploads((u) => [...u, { kind: "failed", id, fileName: file.name, reason: refusalCopy(refused) }]);
      return;
    }

    setUploads((u) => [...u, { kind: "uploading", id, fileName: file.name, size: file.size }]);
    try {
      await addAttachment(manuscriptId, file, (p) => setPct((m) => ({ ...m, [id]: p })));
      /* ⚠️ THE PENDING ROW IS DROPPED ONLY ON SUCCESS, and the file then appears because the
         LISTENER delivered its record — not because this handler put it there. */
      setUploads((u) => u.filter((x) => x.id !== id));
    } catch (err) {
      /**
       * ⚠️ THE FAILURE REPLACES THE PENDING ROW RATHER THAN REMOVING IT. A refused upload that
       * simply disappeared would tell the writer nothing, which is the same silent discard as
       * rendering it wrongly as stored.
       */
      const msg = (err as { code?: string })?.code === "storage/unauthorized"
        ? "That upload was refused."
        : "That upload didn’t complete.";
      setUploads((u) => u.map((x) => (x.id === id ? { kind: "failed", id, fileName: file.name, reason: msg } : x)));
    } finally {
      setPct((m) => { const n = { ...m }; delete n[id]; return n; });
    }
  }

  async function onDownload(storagePathOwner: Parameters<typeof attachmentUrl>[0]) {
    try {
      window.open(await attachmentUrl(storagePathOwner), "_blank", "noopener");
    } catch {
      /* A broken link is worth saying so about — an <a href=""> that does nothing is not. */
      setUploads((u) => [...u, {
        kind: "failed", id: `dl-${storagePathOwner.id}`,
        fileName: storagePathOwner.fileName, reason: "That file couldn’t be opened just now.",
      }]);
    }
  }

  return (
    <aside className="msp-ovside">
      <SectionHeader title="Attachments" meta={meta} className="msp-attsec" />

      {rows.length === 0 && <p className="msp-empty">Nothing kept with this manuscript yet.</p>}

      {rows.map((r) => (
        <div className="msp-attrow" key={r.key} data-status={r.status}>
          <span className="msp-attname">{r.fileName}</span>
          {r.status === "committed" && (
            <>
              <span className="msp-attmeta">{formatBytes(r.size ?? 0)}</span>
              <button type="button" className="msp-attlink" onClick={() => r.attachment && onDownload(r.attachment)}>
                Open
              </button>
              <button type="button" className="msp-attlink" onClick={() => r.attachment && deleteAttachment(r.attachment.id)}>
                Remove
              </button>
            </>
          )}
          {r.status === "uploading" && (
            <span className="msp-attmeta">{pct[r.key.slice(3)] != null ? `${pct[r.key.slice(3)]}%` : "Uploading"}</span>
          )}
          {r.status === "failed" && (
            <>
              <span className="msp-attfail">{r.reason}</span>
              <button type="button" className="msp-attlink" onClick={() => setUploads((u) => u.filter((x) => `up-${x.id}` !== r.key))}>
                Dismiss
              </button>
            </>
          )}
        </div>
      ))}

      <input
        ref={inputRef}
        type="file"
        onChange={onPick}
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        className="msp-attadd"
        onClick={() => inputRef.current?.click()}
        disabled={atCap}
      >
        {atCap ? `${MAX_ATTACHMENTS} files is the limit here` : "Add a file"}
      </button>

      <p className="msp-footnote">{ATTACHMENTS_NOTE}</p>
    </aside>
  );
};
