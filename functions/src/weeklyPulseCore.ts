/**
 * The weekly pulse's pure half: what `sendWeeklyPulse` will accept. Kept apart from the callable so
 * the unit suite can test it without the Admin SDK.
 *
 * ⚠️ THE WEEK IS THE CLIENT'S LOCAL ISO WEEK (Monday start), so the server cannot recompute it and
 * must instead bound it: the key is accepted when it is the server's own ISO week, or the week either
 * side of it. A writer late on a Sunday in one timezone is then never refused by a server already in
 * Monday, and nobody can file an answer for a month ago or next year.
 */

export const WEEK_RE = /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/;

/** The ISO week of a UTC date, as `YYYY-Www`. */
export function isoWeekKeyUtc(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dow + 3);
  const year = t.getUTCFullYear();
  const jan4 = Date.UTC(year, 0, 4);
  const week = 1 + Math.round(((t.getTime() - jan4) / 86_400_000 - 3 + ((new Date(jan4).getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** The weeks the server will accept on `now`: its own, and one either side. */
export function acceptedWeeks(now: Date): string[] {
  const day = 86_400_000;
  return [-7, 0, 7].map((n) => isoWeekKeyUtc(new Date(now.getTime() + n * day)));
}

export type PulseInput = { mood: 1 | 2 | 3 | 4; week: string };

/** The fields, one at a time. Returns the reason for refusal, or the clean input. */
export function validatePulse(data: unknown, now: Date): { ok: true; value: PulseInput } | { ok: false; reason: string } {
  const d = (data ?? {}) as Record<string, unknown>;
  const mood = d.mood;
  if (typeof mood !== "number" || !Number.isInteger(mood) || mood < 1 || mood > 4) return { ok: false, reason: "Please choose one of the four faces." };
  const week = typeof d.week === "string" ? d.week.trim() : "";
  if (!WEEK_RE.test(week)) return { ok: false, reason: "That week is not one we recognise." };
  if (!acceptedWeeks(now).includes(week)) return { ok: false, reason: "That week is not this week." };
  return { ok: true, value: { mood: mood as 1 | 2 | 3 | 4, week } };
}
