/**
 * Landing waitlist clarity v1 (2 Nov; ref design-refs/landing-waitlist-clarity-v1.html, section 4) — the
 * emails' half.
 *   WLC-4 · the welcome email says "You're on the list" and "You'll be one of the first fifty", and carries
 *           no date and no "weeks, not months"; the confirm email's wording is unchanged.
 *   WLC-5 · the overflow email calls it the "reserve list", never the "waiting list": subject, preheader,
 *           pass, heading, lead, the nothing-to-do line and the unsubscribe note, read as a reader sees them
 *           (images by their alt text).
 * ⚠️ TYPED FROM THE BRIEF, NOT IMPORTED: a lock that imports the constant agrees with any edit to it.
 */
import { describe, it, expect } from "vitest";
import { prepareConfirm, prepareWaiting, prepareWelcome, type Prepared } from "./emailTemplates";
import { resolveMailConfig } from "./emailConfig";
import { welcomeSubject } from "./emailCopy";

const PROD = resolveMailConfig({ WAITLIST_PUBLIC_URL: "https://queryhawk.net" });
const ok = (p: Prepared) => { expect(p.ok, JSON.stringify(p)).toBe(true); return (p as Extract<Prepared, { ok: true }>).email; };
const words = (html: string) => html
  .replace(/<!--[\s\S]*?-->/g, " ").replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/g, " $1 ")
  .replace(/<\/?(a|b|span|u)\b[^>]*>/g, "").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&#x27;/g, "'")
  .replace(/&#10003;/g, "✓").replace(/&nbsp;/g, " ").replace(/&#8199;|&#847;/g, "")
  .replace(/[’]/g, "'").replace(/\s+/g, " ");
type Mail = { subject: string; html: string; text: string };
const all = (m: Mail) => [m.subject, words(m.html), m.text.replace(/\s+/g, " ")].join(" \n ");

const MONTHS = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/;

describe("WLC-4 · the welcome email", () => {
  const m = ok(prepareWelcome(PROD, 14, 50, "unsub")) as Mail;

  it("subject: You're on the list: founding writer No. N", () => {
    expect(welcomeSubject(14)).toBe("You're on the list: founding writer No. 14");
    expect(m.subject).toBe("You're on the list: founding writer No. 14");
  });

  it("lead: Welcome aboard. You'll be one of the first fifty writers to use QueryHawk.", () => {
    expect(words(m.html)).toContain("Welcome aboard. You'll be one of the first fifty writers to use QueryHawk.");
    expect(all(m)).not.toContain("this is your pass");
    expect(all(m)).not.toMatch(/You're in\b/);
  });

  it("carries no date and no 'weeks, not months'", () => {
    expect(all(m)).not.toMatch(MONTHS);
    expect(all(m)).not.toMatch(/weeks, not months/i);
  });
});

describe("WLC-4 · the confirm email is left as it is", () => {
  const m = ok(prepareConfirm(PROD, "tok", "unsub")) as Mail;
  it("its subject and its lines", () => {
    expect(m.subject).toBe("Confirm your founding place");
    const w = words(m.html);
    for (const s of [
      "One click and you're on the list.",
      "Thanks for putting your name down as a QueryHawk founding writer. There's just one thing left to do.",
      "Your place isn't held until you click. There are fifty founding places and they go in the order people confirm. If the last one goes while this sits in your inbox, you'll go on the waiting list instead, and I'll let you know.",
    ]) expect(w).toContain(s);
  });
});
