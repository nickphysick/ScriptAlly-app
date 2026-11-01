/**
 * Founding emails v1 (1 Nov) — EM-1, EM-2 (rendering half), EM-3 (decision half), EM-4.
 * The stored-number and send-once halves run against the emulator in waitlist.emulator.spec.ts.
 *
 * ⚠️ THE STRINGS BELOW ARE TYPED FROM THE BRIEF, NOT IMPORTED FROM emailCopy. A lock that imports
 * the constant it checks agrees with any edit to that constant; these fail when the wording drifts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prepareConfirm, prepareWaiting, prepareWelcome, type Prepared } from "./emailTemplates";
import { resolveMailConfig } from "./emailConfig";
import { emailAfterVerify } from "./waitlistModel";

const PROD = resolveMailConfig({ WAITLIST_PUBLIC_URL: "https://queryhawk.net" });
const ok = (p: Prepared) => { expect(p.ok, JSON.stringify(p)).toBe(true); return (p as Extract<Prepared, { ok: true }>).email; };
const confirm = ok(prepareConfirm(PROD, "tok", "unsub"));
const welcome = ok(prepareWelcome(PROD, 14, 50, "unsub"));
const waiting = ok(prepareWaiting(PROD, "unsub"));

/** The HTML as a reader sees its words: tags gone, entities decoded, whitespace collapsed. */
const words = (html: string) => html
  .replace(/<!--[\s\S]*?-->/g, " ").replace(/<\/?(a|b|span|u)\b[^>]*>/g, "").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#10003;/g, "✓").replace(/&nbsp;/g, " ").replace(/&#8199;|&#847;/g, "")
  .replace(/\s+/g, " ");
const flat = (s: string) => s.replace(/\s+/g, " ");

const FOOT = [
  "Questions, or something you'd like QueryHawk to do? Just reply, or write to hello@queryhawk.net. I read every one.",
  "QueryHawk · Made in the UK, for writers",
];

const EXPECT = {
  confirm: {
    email: confirm,
    subject: "Confirm your founding place",
    preheader: "One click and your place is yours. The link works for 48 hours.",
    strings: [
      "One click and you're on the list.",
      "Thanks for putting your name down as a QueryHawk founding writer. There's just one thing left to do.",
      "Confirm my place",
      "This link works for 48 hours.",
      "Your place isn't held until you click. There are fifty founding places and they go in the order people confirm. If the last one goes while this sits in your inbox, you'll go on the waiting list instead, and I'll tell you straight.",
      "Once you've confirmed, you'll get your founding writer pass, and your invite follows when your wave opens.",
      "Didn't ask for this? Just ignore it. Nothing happens without that click, and we won't write again.",
      "This takes you off the list and frees your place for another writer.",
      ...FOOT,
    ],
  },
  welcome: {
    email: welcome,
    subject: "You're in: founding writer No. 14",
    preheader: "Your pass is inside. Welcome to the first fifty.",
    strings: [
      "No. 14", "of 50",
      "That's your place confirmed.",
      "Welcome aboard. You're one of the first fifty writers to use QueryHawk, and this is your pass.",
      "Hi, I'm Nick, a keen writer with a background in simplifying data to drive smart decision making. I spent a year designing and building QueryHawk alongside my day job, driven by the belief that good stories shouldn't be lost to a messy querying campaign.",
      "I truly believe these tools give your manuscript the very best chance of landing with the right agent. Please use everything it has to offer, and let me know how you find it.",
      "Very best of luck with your campaign, and thank you for being part of the journey.",
      "Nick", "Founder, QueryHawk",
      "What you get",
      "QueryHawk Pro, free for your entire querying campaign",
      "A direct line to the founder",
      "Smart Import to bring your list across",
      "An exclusive Early Bird discount for the writers you invite when we launch",
      "What happens next",
      "We're opening QueryHawk to founding writers in waves rather than all at once, so we can fix what the first group finds before the next arrives. When your wave opens, you'll get an invite with a link to set up your account.",
      "All being well, we're talking weeks, not months, and I'll keep you up to date as often as I can.",
      "This takes you off the list and frees your place for another writer.",
      ...FOOT,
    ],
  },
  waiting: {
    email: waiting,
    subject: "You're first in line if a place opens",
    preheader: "The fifty places went, but you're on the waiting list.",
    strings: [
      "Waiting list",
      "The fifty places went, but you're next in line.",
      "Thanks for confirming. All fifty founding places were taken before your click came through, so you're on the waiting list, in the order people confirmed.",
      /* decision 2(b) */
      "You're on the list in the order people confirmed. If anything changes, you'll hear from me.",
      "You don't need to do anything else. Your address stays on the list, and you can take it off any time with the link below.",
      "I'm sorry it wasn't this time, and thank you for wanting in.",
      "Nick", "Founder, QueryHawk",
      "This takes you off the waiting list.",
      ...FOOT,
    ],
  },
} as const;

describe("EM-1 · each email renders, HTML and text, with the brief's words", () => {
  for (const [name, e] of Object.entries(EXPECT)) {
    it(`${name}: subject, preheader and every string, verbatim, in both parts`, () => {
      expect(e.email.subject).toBe(e.subject);
      expect(words(e.email.html)).toContain(e.preheader);
      for (const s of e.strings) {
        expect(words(e.email.html), `${name} HTML: ${s}`).toContain(s);
        expect(flat(e.email.text), `${name} text: ${s}`).toContain(s);
      }
      expect(e.email.text).toMatch(/Unsubscribe: https:\/\/queryhawk\.net\/api\/waitlist\/unsubscribe\?token=/);
    });

    it(`${name}: no capitalised "Founding Writer", no webp, no SVG; every image absolute https with width and height`, () => {
      for (const part of [e.email.subject, e.email.html, e.email.text]) {
        expect(part).not.toMatch(/Founding Writer/);
        expect(part).not.toMatch(/\.webp/i);
      }
      expect(e.email.html).not.toMatch(/<svg/i);
      const imgs = e.email.html.match(/<img\b[^>]*>/g) ?? [];
      expect(imgs.length, "the logo, and the bird where there is a pass").toBe(name === "confirm" ? 1 : 2);
      for (const img of imgs) {
        expect(img).toMatch(/\ssrc="https:\/\/queryhawk\.net\/images\/[^"]+\.png(\?v=[0-9a-f]{8})?"/);
        expect(img).toMatch(/\swidth="\d+"/);
        expect(img).toMatch(/\sheight="\d+"/);
        expect(img).toMatch(/\salt=""/);
      }
      /* tables and inline styles only */
      expect(e.email.html).not.toMatch(/<style|class="|display:\s*flex|position:\s*absolute|rgba\(/);
    });
  }

  it("every image the emails name exists in public/, and the versions are their md5s", async () => {
    const { createHash } = await import("node:crypto");
    for (const html of [welcome.html, waiting.html]) {
      for (const m of html.matchAll(/src="https:\/\/queryhawk\.net(\/images\/[^"?]+)\?v=([0-9a-f]{8})"/g)) {
        const file = readFileSync(join(process.cwd(), "public", m[1]));
        expect(createHash("md5").update(file).digest("hex").slice(0, 8), m[1]).toBe(m[2]);
      }
    }
  });
});

describe("EM-2 · the welcome's number is the number it is given (the stored one)", () => {
  for (const n of [1, 14, 50]) {
    it(`No. ${n}`, () => {
      const e = ok(prepareWelcome(PROD, n, 50, "unsub"));
      expect(e.subject).toBe(`You're in: founding writer No. ${n}`);
      expect(words(e.html)).toContain(`No. ${n} of 50`);
      expect(e.text).toContain(`FOUNDING WRITER PASS: No. ${n} of 50`);
    });
  }
});

describe("EM-3 · which email a confirmation sends", () => {
  it("verified → the welcome; waiting → email 3; every other outcome → nothing", () => {
    expect(emailAfterVerify("verified")).toBe("welcome");
    expect(emailAfterVerify("waiting")).toBe("waiting");
    for (const k of ["already", "expired", "unknown"]) expect(emailAfterVerify(k), k).toBeNull();
  });
  it("the confirm handler sends through that decision, and email 3 only on `waiting`", () => {
    const src = readFileSync(join(process.cwd(), "functions/src/waitlist.ts"), "utf8");
    expect(src).toContain("const mail = emailAfterVerify(outcome.kind);");
    expect(src).toMatch(/mail === "waiting" && outcome\.kind === "waiting"\)\s*\{\s*await sendWaiting\(/);
    expect(src.match(/await sendWaiting\(/g)?.length, "called from one place").toBe(1);
  });
});

describe("EM-4 · decision 2(b): nothing promises an email when a place opens", () => {
  const BANNED = [/email you if a place opens/i, /straight away/i];
  it("email 3, both parts", () => {
    for (const b of BANNED) { expect(waiting.html).not.toMatch(b); expect(waiting.text).not.toMatch(b); }
  });
  it("the sign-up's own words (landingCopy), with FOUNDING_FULL saying the order and no email", () => {
    const src = readFileSync(join(process.cwd(), "src/marketing/landingCopy.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const b of BANNED) expect(src).not.toMatch(b);
    expect(src).toContain("founding places have gone, so you're on the waiting list, in the order people confirmed.");
  });
});
