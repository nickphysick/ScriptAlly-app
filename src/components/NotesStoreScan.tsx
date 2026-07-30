/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ TEMPORARY — DELETE AFTER THE NOTES-STORE MIGRATION IS PLANNED. ⚠️
 *
 * A one-off READ-ONLY scan of the two note stores, so the convergence pack can be planned against
 * real numbers instead of guesses:
 *   · users/{uid}/notes  — the post-it `Note` store
 *   · users/{uid}/tasks  — the `UserTask` store (what /todo + the dashboard tab now use)
 *
 * WHY A ROUTE AND NOT A SCRIPT: there is no admin SDK / ADC here, and repurposing the Firebase CLI's
 * stored tokens to read user data is off-limits. This uses the APP'S OWN auth + db, so it reads only
 * the signed-in user's own documents, enforced by the security rules — exactly as the app does.
 *
 * READ-ONLY BY CONSTRUCTION: the only Firestore call is getDocs. There is no write, update or delete
 * anywhere in this file, and nothing is migrated or backfilled.
 *
 * Deliberately NOT gated on import.meta.env.DEV: the prod-data scan runs a PRODUCTION build locally
 * (`npm run build` → .env.production, then `npm run preview`), where that flag is false.
 *   → visit #/notes-scan, sign in as normal, read the table, then this file + its route are deleted.
 */
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface Counts {
  notesTotal: number;
  notesWithContent: number;
  notesDone: number;
  notesWithDueDate: number;
  tasksTotal: number;
  tasksOpen: number;
  projectId: string;
}

export const NotesStoreScan: React.FC = () => {
  const [state, setState] = useState<"waiting" | "scanning" | "done" | "error">("waiting");
  const [counts, setCounts] = useState<Counts | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setState("waiting"); return; }
      setState("scanning");
      try {
        // READ-ONLY: getDocs only. Nothing is written, updated or deleted.
        const [notesSnap, tasksSnap] = await Promise.all([
          getDocs(collection(db, "users", user.uid, "notes")),
          getDocs(collection(db, "users", user.uid, "tasks")),
        ]);
        const notes = notesSnap.docs.map((d) => d.data() as Record<string, unknown>);
        const tasks = tasksSnap.docs.map((d) => d.data() as Record<string, unknown>);
        setCounts({
          notesTotal: notes.length,
          notesWithContent: notes.filter((n) => String(n.text ?? "").trim().length > 0).length,
          notesDone: notes.filter((n) => n.done === true || !!n.doneAt).length,
          notesWithDueDate: notes.filter((n) => !!n.dueDate).length,
          tasksTotal: tasks.length,
          tasksOpen: tasks.filter((t) => t.done !== true).length,
          projectId: (db as unknown as { app?: { options?: { projectId?: string } } }).app?.options?.projectId ?? "unknown",
        });
        setState("done");
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setState("error");
      }
    });
    return () => unsub();
  }, []);

  const row = (label: string, value: React.ReactNode, note?: string) => (
    <tr>
      <td style={{ padding: "7px 14px 7px 0", color: "#5d5245" }}>{label}</td>
      <td style={{ padding: "7px 14px 7px 0", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</td>
      <td style={{ padding: "7px 0", color: "#8a7d6e", fontSize: 12 }}>{note}</td>
    </tr>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#faf7f1", padding: "48px 32px", fontFamily: "Inter, sans-serif", color: "#2b2118" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, marginBottom: 6 }}>Notes-store scan</h1>
        <p style={{ color: "#8a7d6e", fontSize: 13, marginBottom: 26 }}>
          Read-only. Counts your own documents in both note stores, to size the convergence migration.
          Nothing is written, changed or deleted.
        </p>

        {state === "waiting" && <p>Sign in on this build, then return to <code>#/notes-scan</code>.</p>}
        {state === "scanning" && <p>Scanning…</p>}
        {state === "error" && (
          <p style={{ color: "#8a3a28" }}>Couldn’t read: {err}</p>
        )}

        {state === "done" && counts && (
          <>
            <p style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 14 }}>
              Firebase project: <b>{counts.projectId}</b>
            </p>
            <table style={{ borderCollapse: "collapse", fontSize: 14, width: "100%" }}>
              <tbody>
                <tr><td colSpan={3} style={{ paddingTop: 10, paddingBottom: 6, fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a7a66" }}>Post-it store — users/&#123;uid&#125;/notes</td></tr>
                {row("Total documents", counts.notesTotal)}
                {row("With real content", counts.notesWithContent, "non-empty text — the ones a migration must carry")}
                {row("Completed (done / doneAt)", counts.notesDone, "candidates to archive rather than migrate")}
                {row("Carrying a dueDate", counts.notesWithDueDate, "these would become dated TASKS")}
                <tr><td colSpan={3} style={{ paddingTop: 20, paddingBottom: 6, fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a7a66" }}>User-task store — users/&#123;uid&#125;/tasks</td></tr>
                {row("Total documents", counts.tasksTotal)}
                {row("Open (not done)", counts.tasksOpen, "what /todo + the dashboard tab show today")}
              </tbody>
            </table>
            <p style={{ marginTop: 24, fontSize: 12, color: "#8a7d6e" }}>
              Run this against the production build too (<code>npm run build</code> then <code>npm run preview</code>)
              for the numbers that matter to the migration.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
