/**
 * List-row "queried" date for the Queries Hub — bare, quiet "14 Mar" (UK day-month); the year
 * shows only when it isn't the current year ("30 Jun 2024").
 *
 * Returns null when dateSent is absent or unparseable, and the row renders a muted em-dash
 * instead. An absent dateSent is a LEGAL document state, not corruption: the Firestore rule
 * treats the field as optional, and provisional imported records (Smart Import) are written
 * without one until the writer confirms the send.
 *
 * Pure + Firebase-free so tests can import it without dragging in the app's firebase init
 * (the searchSuggestionsCore lesson). `now` is injectable for deterministic tests.
 */
export function formatListRowDate(dateSent: unknown, now: Date = new Date()): string | null {
  if (dateSent == null || dateSent === "") return null;
  if (typeof dateSent !== "string" && typeof dateSent !== "number" && !(dateSent instanceof Date)) return null;
  const d = new Date(dateSent as string | number | Date);
  if (isNaN(d.getTime())) return null;
  const base = `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}
