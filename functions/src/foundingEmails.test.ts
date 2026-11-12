/**
 * Founding emails v1 (1 Nov) — EM-1, EM-2 (rendering half), EM-3 (decision half), EM-4.
 * The stored-number and send-once halves run against the emulator in waitlist.emulator.spec.ts.
 *
 * ⚠️ THE STRINGS BELOW ARE TYPED FROM THE BRIEF, NOT IMPORTED FROM emailCopy. A lock that imports
 * the constant it checks agrees with any edit to that constant; these fail when the wording drifts.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prepareConfirm, prepareWaiting, prepareWelcome, type Prepared } from "./emailTemplates";
type Email = Extract<Prepared, { ok: true }>["email"];
import { resolveMailConfig } from "./emailConfig";
import { emailAfterVerify } from "./waitlistModel";

const PROD = resolveMailConfig({ WAITLIST_PUBLIC_URL: "https://queryhawk.net" });
const ok = (p: Prepared) => { expect(p.ok, JSON.stringify(p)).toBe(true); return (p as Extract<Prepared, { ok: true }>).email; };
const confirm = ok(prepareConfirm(PROD, "tok", "unsub"));
const welcome = ok(prepareWelcome(PROD, 14, 50, "unsub"));
const waiting = ok(prepareWaiting(PROD, "unsub"));

/** The HTML as a reader sees its words: tags gone, entities decoded, whitespace collapsed. */
/* ⚠️ AN IMAGE READS AS ITS ALT TEXT, IN PLACE (privacy page v1): the pass, the headings and the sign-off
   are images, and an email with images off reads them by their alts, so that is how this reads them. */
const words = (html: string) => html
  .replace(/<!--[\s\S]*?-->/g, " ").replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/g, " $1 ")
  .replace(/<\/?(a|b|span|u)\b[^>]*>/g, "").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#10003;/g, "✓").replace(/&#8226;/g, "•").replace(/&nbsp;/g, " ").replace(/&#8199;|&#847;/g, "")
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
      "Your place isn't held until you click. There are fifty founding places and they go in the order people confirm. If the last one goes while this sits in your inbox, you'll go on the reserve list instead, and I'll let you know.",
      "Once you've confirmed, you'll get your founding writer pass, and your invite follows when your wave opens.",
      "Didn't ask for this? Just ignore it. Nothing happens without that click, and we won't write again.",
      /* privacy page v1: the sign-off, and the link as text under a hairline */
      "Nick", "Founder, QueryHawk",
      "This takes you off the list and frees your place for another writer.",
      ...FOOT,
    ],
  },
  welcome: {
    email: welcome,
    subject: "You're on the list: founding writer No. 14",
    preheader: "Your founding writer pass is inside.",
    strings: [
      "No. 14", "of 50",
      "That's your place confirmed.",
      "Welcome aboard. You'll be one of the first fifty writers to use QueryHawk.",
      /* welcome page v1, phase 2: the note as founding-emails-v2 words it */
      "Hi, I'm Nick. I spent a year designing and building QueryHawk alongside my day job, driven by the belief that good stories shouldn't be lost to a messy querying campaign.",
      "I truly believe these tools give your manuscript the very best chance of landing with the right agent. Please use everything QueryHawk has to offer and let me know how you find it.",
      "Very best of luck with your campaign, and thank you for being part of the journey. We'll speak soon.",
      "Nick", "Founder, QueryHawk",
      "What you get",
      "QueryHawk Pro, free for your entire querying campaign",
      "A direct line to the founder",
      "Smart Import to bring your list across",
      "An exclusive Early Bird discount for the writers you invite when we launch",
      "What happens next",
      "We're opening QueryHawk to founding writers in waves rather than all at once, so we can fix what the first group finds before the next arrives. When your wave opens, you'll get an invite with a link to set up your account.",
      "This takes you off the list and frees your place for another writer.",
      ...FOOT,
    ],
  },
  waiting: {
    email: waiting,
    subject: "You're on the founding writers' reserve list",
    preheader: "The fifty places went, but you're on the reserve list.",
    strings: [
      "Reserve list",
      "All fifty places have gone, but you're on the reserve list.",
      "Thanks for confirming. All fifty founding places were taken before your click came through, so you're on the reserve list, in the order people confirmed.",
      /* decision 2(b) */
      "If a founding writer gives up their place, it goes to the next person in line, and I'll email you straight away if that's you.",
      "You don't need to do anything else. Your address stays on the reserve list, and you can take it off any time with the link below.",
      "Sorry we couldn't fit you in this time, and thank you for signing up.",
      "Nick", "Founder, QueryHawk",
      "This takes you off the reserve list.",
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
      /* privacy page v1: the logo, the pass, the heading and the sign-off. The logo's alt is empty because
         "QueryHawk" is printed beside it; every other image's alt is its words. */
      expect(imgs.length, "logo, pass, heading, sign-off").toBe(4);
      for (const img of imgs) {
        expect(img).toMatch(/\ssrc="https:\/\/queryhawk\.net\/images\/[^"]+\.png(\?v=[0-9a-f]{8})?"/);
        expect(img).toMatch(/\swidth="\d+(\.\d+)?"/);
        expect(img).toMatch(/\sheight="\d+(\.\d+)?"/);
        expect(img).toMatch(img.includes("queryhawk-logo") ? /\salt=""/ : /\salt="[^"]+"/);
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

describe("EM-1 · the sign-off and the pass label (welcome page v1; images since privacy page v1)", () => {
  for (const [name, e] of [["confirm", confirm], ["welcome", welcome], ["waiting", waiting]] as const) {
    it(`${name}: the sign-off is the "Nick" image (alt "Nick"), then "Founder, QueryHawk"; never handwritten`, () => {
      expect(e.html).toMatch(/<img src="https:\/\/queryhawk\.net\/images\/email\/signature-nick\.png\?v=[0-9a-f]{8}"[^>]*alt="Nick"[^>]*><p[^>]*>Founder, QueryHawk<\/p>/);
      expect(e.html).not.toMatch(/Caveat|cursive/);
    });
    it(`${name}: the pass label is sentence case in both parts; never capitals`, () => {
      for (const part of [e.html, e.text]) expect(part).not.toMatch(/FOUNDING WRITER PASS/);
      expect(words(e.html)).toMatch(/Founding writer pass: /);
    });
  }
  it("the HTML pass (the fallback for a number with no image) keeps its label: serif 600, #7a3420", () => {
    const fb = ok(prepareWelcome(PROD, 51, 50, "unsub"));
    expect(fb.html).toMatch(/<p style="[^"]*font-family:'Source Serif 4'[^"]*font-weight:600;[^"]*color:#7a3420">Founding writer pass<\/p>/);
  });
});

describe("EM-1 · the confirm email's link moved under the sign-off (privacy page v1)", () => {
  it("nothing but the expiry line between the button and the note; the link as text after the help line", () => {
    const h = confirm.html;
    const btn = h.indexOf("Confirm my place"), exp = h.indexOf("This link works for 48 hours."), help = h.indexOf("Button not working?");
    expect(btn).toBeGreaterThan(0); expect(exp).toBeGreaterThan(btn); expect(help).toBeGreaterThan(exp);
    expect(h.slice(btn, exp), "no link text between the button and the expiry line").not.toMatch(/>https:\/\/[^<]*verify\?token=/);
    expect(h.slice(help)).toMatch(/<a href="https:\/\/queryhawk\.net\/api\/waitlist\/verify\?token=[^"]+" style="[^"]*word-break:break-all">https:\/\/queryhawk\.net\/api\/waitlist\/verify\?token=/);
    expect(h).toContain("Confirm my place\u00a0 →");
    expect(h).toMatch(/padding:16px 30px/);
  });
});

describe("EM-2 · the welcome's number is the number it is given (the stored one)", () => {
  for (const n of [1, 14, 50]) {
    it(`No. ${n}`, () => {
      const e = ok(prepareWelcome(PROD, n, 50, "unsub"));
      expect(e.subject).toBe(`You're on the list: founding writer No. ${n}`);
      expect(words(e.html)).toContain(`No. ${n} of 50`);
      expect(e.text).toContain(`Founding writer pass: No. ${n} of 50`);
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

/* EM-4, THE PROMOTION BRANCH (launch readiness, 2 Nov). A freed place now goes to the next writer in line
   and they are emailed (PROMO-1), so the waiting copy says so; the 2(b) "no promise" assertions are retired
   with the reason they existed. */
describe("EM-4 · a freed place goes to the next writer in line, and the waiting copy says so", () => {
  it("email 3, both parts: the note's bold lead, then the promise of an email", () => {
    for (const part of [waiting.html, waiting.text]) {
      expect(part).toContain("If a founding writer gives up their place, it goes to the next person in line,");
      expect(part).toContain("and I'll email you straight away if that's you.");
      expect(part, "the old no-promise line is gone").not.toContain("If anything changes, you'll hear from me.");
    }
    expect(waiting.html, "the lead is bold").toMatch(/<(b|strong)\b[^>]*>If a founding writer gives up their place, it goes to the next person in line,<\/(b|strong)>/);
  });
  it("the sign-up's own words (landingCopy): FOUNDING_FULL promises the email", () => {
    const src = readFileSync(join(process.cwd(), "src/marketing/landingCopy.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).toContain("founding places have gone, but we've emailed you a link: click it to join the reserve list, and we'll email you if a place opens up.");
  });
  it("the unsubscribe path sends email 2 to the writer it promotes, from one place", () => {
    const src = readFileSync(join(process.cwd(), "functions/src/waitlist.ts"), "utf8");
    expect(src).toMatch(/if \(outcome\?\.promoted\) \{[\s\S]*?await sendWelcome\(outcome\.promoted\.docId, outcome\.promoted\.foundingNumber/);
  });
});

/* ══════════════ Privacy page v1, phase 2: the brand in images ══════════════ */

const imgsOf = (html: string) => (html.match(/<img\b[^>]*>/g) ?? []).map((t) => ({
  src: t.match(/\ssrc="([^"]+)"/)?.[1] ?? "", alt: t.match(/\salt="([^"]*)"/)?.[1] ?? null,
  width: Number(t.match(/\swidth="([\d.]+)"/)?.[1]), height: Number(t.match(/\sheight="([\d.]+)"/)?.[1]),
}));
const file = (src: string) => src.replace(/^https:\/\/queryhawk\.net\/images\/email\//, "").replace(/\?v=[0-9a-f]{8}$/, "");

describe("EM-6 · each email names the right images: absolute https PNG, with width, height and alt", () => {
  const WANT: Record<string, [Prepared, string[]]> = {
    confirm: [prepareConfirm(PROD, "tok", "unsub"), ["pass-pending.png", "heading-confirm.png", "signature-nick.png"]],
    welcome14: [prepareWelcome(PROD, 14, 50, "unsub"), ["pass-14.png", "heading-welcome.png", "signature-nick.png"]],
    waiting: [prepareWaiting(PROD, "unsub"), ["pass-waiting.png", "heading-waiting.png", "signature-nick.png"]],
  };
  for (const [name, [p, files]] of Object.entries(WANT)) {
    it(name, () => {
      const imgs = imgsOf(ok(p).html).filter((i) => !i.src.includes("queryhawk-logo"));
      expect(imgs.map((i) => file(i.src))).toEqual(files);
      for (const i of imgs) {
        expect(i.src).toMatch(/^https:\/\/queryhawk\.net\/images\/email\/[a-z0-9-]+\.png\?v=[0-9a-f]{8}$/);
        expect(i.width).toBeGreaterThan(0); expect(i.height).toBeGreaterThan(0);
        expect(i.alt, `${file(i.src)} has words for its alt`).toMatch(/\S/);
      }
    });
  }
  it("writer 14's pass reads No. 14 in its alt; every number 1–50 has its own file", () => {
    expect(imgsOf(welcome.html).find((i) => file(i.src) === "pass-14.png")?.alt).toBe("Founding writer pass: No. 14 of 50");
    for (let n = 1; n <= 50; n++) {
      const pass = imgsOf(ok(prepareWelcome(PROD, n, 50, "unsub")).html).find((i) => /pass-\d\d\.png/.test(i.src));
      expect(file(pass!.src), `No. ${n}`).toBe(`pass-${String(n).padStart(2, "0")}.png`);
    }
  });
  it("51 has no image, so the welcome falls back to the HTML pass (and says so in the log)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fb = ok(prepareWelcome(PROD, 51, 50, "unsub"));
    expect(imgsOf(fb.html).some((i) => /pass-\d+\.png/.test(i.src))).toBe(false);
    expect(words(fb.html)).toContain("No. 51 of 50");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("No. 51"));
    warn.mockRestore();
  });
  it("every image the emails name exists in public/ at the version the URL carries", async () => {
    const { createHash } = await import("node:crypto");
    for (const [p] of Object.values(WANT)) for (const i of imgsOf(ok(p).html)) {
      const path = i.src.replace(/^https:\/\/queryhawk\.net/, "").replace(/\?v=.*/, "");
      const v = i.src.match(/\?v=([0-9a-f]{8})/)?.[1];
      const buf = readFileSync(join(process.cwd(), "public", path));
      expect(createHash("md5").update(buf).digest("hex").slice(0, 8), path).toBe(v);
      expect(buf.length, `${path} ≤ 60 KB`).toBeLessThanOrEqual(60 * 1024);
    }
  });
});

describe("EM-7 · no typewriter text is left as live text (it would be Courier in every client)", () => {
  for (const [name, e] of Object.entries({ confirm, welcome, waiting })) {
    it(name, () => {
      const live = e.html.replace(/<img\b[^>]*>/g, "");
      expect(live, "no live text in Special Elite or Courier").not.toMatch(/Special Elite|Courier/);
    });
  }
});

describe("images off (Outlook's default): the alts and the text still read in order", () => {
  const ORDER: Record<string, [Email, string[]]> = {
    confirm: [confirm, ["Founding writer pass: almost yours. One click to go.", "One click and you're on the list.",
      "Thanks for putting your name down", "Confirm my place", "This link works for 48 hours.", "Your place isn't held",
      "Once you've confirmed", "Nick", "Founder, QueryHawk", "Didn't ask for this?", "Button not working?"]],
    welcome: [welcome, ["Founding writer pass: No. 14 of 50", "That's your place confirmed.", "Welcome aboard.",
      "Hi, I'm Nick.", "Nick Founder, QueryHawk", "What you get", "What happens next"]],
    waiting: [waiting, ["Founding writer pass: Reserve list", "All fifty places have gone, but you're on the reserve list.",
      "Thanks for confirming.", "If a founding writer gives up their place, it goes to the next person in line,", "Nick Founder, QueryHawk"]],
  };
  for (const [name, [e, seq]] of Object.entries(ORDER)) {
    it(name, () => {
      const t = words(e.html);
      let at = -1;
      for (const piece of seq) { const i = t.indexOf(piece, at + 1); expect(i, `"${piece}" after the one before`).toBeGreaterThan(at); at = i; }
    });
  }
});

/* ══════════════ Launch readiness (2 Nov): one-click unsubscribe headers ══════════════ */

describe("EM-9 · every waitlist email carries List-Unsubscribe and the one-click marker", () => {
  const all: Record<string, Prepared> = {
    confirm: prepareConfirm(PROD, "tok", "unsub-tok"),
    welcome: prepareWelcome(PROD, 14, 50, "unsub-tok"),
    waiting: prepareWaiting(PROD, "unsub-tok"),
  };
  for (const [name, p] of Object.entries(all)) {
    it(name, () => {
      const e = ok(p);
      const href = e.html.match(/href="([^"]*\/api\/waitlist\/unsubscribe\?token=[^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
      expect(href, "the footer's unsubscribe link").toBeTruthy();
      expect(e.headers?.["List-Unsubscribe"]).toBe(`<${href}>`);
      expect(e.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
      expect(e.headers?.["List-Unsubscribe"]).toMatch(/^<https:\/\//);
    });
  }
  it("the unsubscribe endpoint takes the one-click POST as well as the footer's GET", () => {
    const src = readFileSync(join(process.cwd(), "functions/src/waitlist.ts"), "utf8");
    expect(src).toMatch(/if \(req\.method !== "GET" && req\.method !== "POST"\) \{ res\.status\(405\)/);
  });
});

describe("EM-10 · failures log structured lines a Cloud Logging alert can match", () => {
  it("a failed waitlist request logs event waitlist.error; a failed send logs event email.send at error", () => {
    const wl = readFileSync(join(process.cwd(), "functions/src/waitlist.ts"), "utf8");
    expect(wl).toMatch(/console\.error\(JSON\.stringify\(\{\s*event: "waitlist\.error"/);
    expect(wl, "no unstructured error line left").not.toMatch(/console\.error\("waitlist: request failed:"/);
    const em = readFileSync(join(process.cwd(), "functions/src/email.ts"), "utf8");
    for (const outcome of ["no-key", "rejected"]) expect(em).toMatch(new RegExp(`console\\.error\\(JSON\\.stringify\\(\\{[\\s\\S]{0,80}event: "email\\.send"[\\s\\S]{0,80}outcome: "${outcome}"`));
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════════════
   NON-WORKSPACE v1 (12 Nov) — EM-11 to EM-14: all twelve emails (design-refs/emails-v1.html).
   ⚠️ THE EXPECTED WORDS ARE TYPED FROM THE REF, NOT IMPORTED FROM emailCopy (the inputs are emailSamples'). ══════ */

import { renderSamples } from "./emailSamples";
import { SENDER_OF, type EmailKind } from "./emailConfig";
import { sendEmail } from "./email";
import { afterEach } from "vitest";

const SAMPLES = Object.fromEntries(renderSamples().map((s) => [s.id, s]));
const mail = (id: string) => ok(SAMPLES[id].prepared);

const PRODUCT_FOOT = ["Something not right? Just reply, or write to hello@queryhawk.net.", "QueryHawk · Made in the UK, for writers"];
const ACCOUNT_FOOT = [...PRODUCT_FOOT, "You're getting this because it's about your account.", "Email settings"];

const TWELVE: Record<string, { subject: string; preheader: string; strings: string[] }> = {
  "01-confirm": { subject: "Confirm your founding place", preheader: "One click and your place is yours. The link works for 48 hours.", strings: EXPECT.confirm.strings as unknown as string[] },
  "02-welcome": { subject: "You're on the list: founding writer No. 14", preheader: "Your founding writer pass is inside.", strings: EXPECT.welcome.strings as unknown as string[] },
  "03-reserve": { subject: "You're on the founding writers' reserve list", preheader: "The fifty places went, but you're on the reserve list.", strings: EXPECT.waiting.strings as unknown as string[] },
  "04-invite": {
    subject: "Your QueryHawk invite: your wave is open",
    preheader: "Set up your account. The link works for 48 hours.",
    strings: [
      "Founding writer pass: No. 14 of 50",
      "Your wave is open.",
      "QueryHawk is ready for you. Set up your account, bring your querying across, and tell me what you find.",
      "Set up my account",
      "This link works for 48 hours. If it runs out, your place is still yours: ask for a fresh link on the sign-in page.",
      "https://scriptally-app.web.app/join/QH-7K2M-9XTD",
      "Your founder's code is QH-7K2M-9XTD. The button fills it in for you. Keep this email in case you're ever asked to type it.",
      "A good first ten minutes",
      "Bring your list across with Smart Import, or start from the template",
      "Add your manuscript, so every query has something to belong to",
      "Log the queries you've already sent, and QueryHawk works out what's due and when",
      "Then tell me what you find",
      "There's a Feedback button on every page. Use it for anything that's wrong, missing or slow. That's the whole point of being a founding writer.",
      "This gives up your founding place.",
      ...FOOT,
    ],
  },
  "05-signin": {
    subject: "Your QueryHawk sign-in link",
    preheader: "It works once, for the next hour.",
    strings: [
      "Here's your sign-in link.",
      "Use it on this device and you're straight in. No password needed.",
      "Sign in to QueryHawk",
      "It works once, for the next hour.",
      "Didn't ask for this? Ignore it. Nobody can sign in without this email.",
      ...ACCOUNT_FOOT,
    ],
  },
  "06-reset": {
    subject: "Choose a new QueryHawk password",
    preheader: "The link works for the next hour.",
    strings: [
      "Choose a new password.",
      "Someone asked to reset the password for this QueryHawk account. If that was you, choose a new one here.",
      "This link works for the next hour.",
      "Wasn't you? Ignore this and your password stays as it is.",
      ...ACCOUNT_FOOT,
    ],
  },
  "07-new-email": {
    subject: "Confirm your new email address",
    preheader: "One click and QueryHawk uses this address from now on.",
    strings: [
      "Confirm this is your address.",
      "You asked to change your QueryHawk email address to this one. Confirm it and it becomes the address you sign in with, and where our emails go.",
      "Confirm this address",
      "This link works for 24 hours. Until you click, nothing changes.",
      "Didn't ask for this? Ignore it and nothing happens.",
      ...ACCOUNT_FOOT,
    ],
  },
  "08-email-changed": {
    subject: "Your QueryHawk email address was changed",
    preheader: "If this was you, there is nothing to do.",
    strings: [
      "Your email address was changed.",
      "Your QueryHawk account now uses a different email address.",
      "Changed from", "maya.ellison@example.com",
      "Changed to", "m•••@newmail.example",
      "When", "Thursday 12 November, 6.47pm",
      "If that was you, there's nothing to do.",
      "Wasn't you? Reply to this email straight away and I'll put it back and lock the account while we sort it out.",
      ...ACCOUNT_FOOT,
    ],
  },
  "09-nudge": {
    subject: "A nudge is due: Eleanor Whitfield",
    preheader: "A reply was expected by 5 November.",
    strings: [
      "A nudge to Eleanor Whitfield is due.",
      "Agent", "Eleanor Whitfield", "Greenfield Literary",
      "Manuscript", "The Salt Road",
      "Query sent", "10 September",
      "Reply expected by", "5 November",
      "Since then", "No reply logged",
      "You've set QueryHawk to suggest a nudge one week after the reply date. That's today.",
      "Open this query",
      "Already heard back? Log the reply and this reminder goes away.",
      "Turn off nudge reminders", "Change when a nudge is suggested", "Email settings",
      ...PRODUCT_FOOT,
    ],
  },
  "10-weekly": {
    subject: "Your week in querying: two replies, one a request",
    preheader: "And three things coming up this week.",
    strings: [
      "Last week: two replies, one of them a request.",
      "Monday 2 to Sunday 8 November",
      "What happened",
      "Full requested by Eleanor Whitfield, Greenfield Literary",
      "A no from Tom Aldous, Aldous & Finch",
      "Three queries sent, to Priya Raman, James Okafor and Clare Mott",
      "Coming up this week",
      "Send the full to Eleanor Whitfield by Friday 13 November",
      "A nudge is due to Hannah Reyes on Thursday 12 November",
      "Two replies expected, from Daniel Shaw and Lucy Marsh",
      "Queries out", "14",
      "Requests so far", "3, from 22 queries sent",
      "Gone quiet", "2",
      "Open your dashboard",
      "Turn off the weekly summary", "Email settings",
      ...PRODUCT_FOOT,
    ],
  },
  "11-trial-ending": {
    subject: "Your 14 days of Pro end on Thursday",
    preheader: "Nothing is deleted. Here is what changes.",
    strings: [
      "Your 14 days of Pro end on Thursday.",
      "From Thursday 26 November you're on Free. Nothing you've made is deleted.",
      "What carries on",
      "✓ One manuscript, with unlimited agents and queries",
      "✓ Response tracking, your to-do list and reminders",
      "✓ Everything you've already imported",
      "What you can read but not change",
      "• Your query letters, manuscript versions and submission packages",
      "• Your comparable titles",
      "Pro keeps all of that working, from £3.75 a month.",
      "See the plans",
      "Happy on Free? Do nothing. We won't charge you, because we don't have your card.",
      ...ACCOUNT_FOOT,
    ],
  },
  "12-plan-ending": {
    subject: "Your 6-month plan ends on 19 May",
    preheader: "It carries on monthly at £7.99 unless you cancel.",
    strings: [
      "Your 6-month plan ends on 19 May.",
      "After that, Pro carries on month by month at £7.99 until you cancel.",
      "Plan", "Pro, 6 months",
      "Ends", "Wednesday 19 May",
      "Then", "£7.99 a month, taken on the 19th",
      "To stop it", "Cancel any time before 19 May",
      "Manage my plan",
      "Finished querying? Cancel and you keep everything on Free.",
      ...ACCOUNT_FOOT,
    ],
  },
};

describe("EM-11 · all twelve emails: subject, preview line and every string, verbatim, HTML and text", () => {
  it("there are twelve, in the ref's order", () => {
    expect(Object.keys(SAMPLES)).toEqual(Object.keys(TWELVE));
  });
  for (const [id, e] of Object.entries(TWELVE)) {
    it(id, () => {
      const m = mail(id);
      expect(m.subject).toBe(e.subject);
      expect(words(m.html)).toContain(e.preheader);
      for (const s of e.strings) {
        expect(words(m.html), `${id} HTML: ${s}`).toContain(s);
        expect(flat(m.text), `${id} text: ${s}`).toContain(s);
      }
      for (const part of [m.subject, m.html, m.text]) {
        expect(part, "reserve list, never waiting list").not.toMatch(/waiting list/i);
        expect(part).not.toMatch(/Founding Writer|invite code|overdue/);
        expect(part, "no gendered pronoun for an agent").not.toMatch(/\b(he|she|him|her|his|hers)\b/i);
      }
    });
  }
  it("the nudge, several at once: one email, every agent named, each with its own link", () => {
    const base = { agent: { name: "", agency: null }, manuscriptTitle: "The Salt Road", sentOn: "1 September", replyExpectedBy: "", queryUrl: "" };
    const p = ok(prepareNudge(PROD_APP, {
      items: [
        { ...base, agent: { name: "Eleanor Whitfield", agency: null }, replyExpectedBy: "5 November", queryUrl: "https://scriptally-app.web.app/q/1" },
        { ...base, agent: { name: "Tom Aldous", agency: null }, replyExpectedBy: "6 November", queryUrl: "https://scriptally-app.web.app/q/2" },
      ],
      nudgeAfter: "one week", turnOffUrl: "https://scriptally-app.web.app/x", changeWhenUrl: "https://scriptally-app.web.app/y",
    }));
    expect(p.subject).toBe("Nudges are due: Eleanor Whitfield and Tom Aldous");
    expect(words(p.html)).toContain("Nudges to Eleanor Whitfield and Tom Aldous are due.");
    expect(p.html).toContain('href="https://scriptally-app.web.app/q/1"');
    expect(p.html).toContain('href="https://scriptally-app.web.app/q/2"');
  });
  it("the weekly counts are derived from the lines, never passed in", () => {
    const p = ok(prepareWeekly(PROD_APP, {
      weekPhrase: "w", coming: [],
      happened: [
        { kind: "request", stage: "partial", agent: { name: "A" } }, { kind: "request", stage: "full", agent: { name: "B" } },
        { kind: "no", agent: { name: "C" } },
      ],
      standing: { queriesOut: 1, requests: 1, sent: 1, quiet: 0 }, turnOffUrl: "https://scriptally-app.web.app/x",
    }));
    expect(p.subject).toBe("Your week in querying: three replies, two requests");
    expect(words(p.html)).toContain("Last week: three replies, two of them requests.");
    expect(words(p.html)).toContain("And nothing due this week.");
  });
});

import { prepareNudge, prepareWeekly, prepareSignIn, prepareInvite } from "./emailTemplates";
const PROD_APP = resolveMailConfig({ WAITLIST_PUBLIC_URL: "https://queryhawk.net", APP_PUBLIC_URL: "https://scriptally-app.web.app" });

describe("EM-12 · the image rules hold for all twelve", () => {
  const WANT_IMAGES: Record<string, number> = {
    "01-confirm": 4, "02-welcome": 4, "03-reserve": 4, "04-invite": 2,
    "05-signin": 1, "06-reset": 1, "07-new-email": 1, "08-email-changed": 1,
    "09-nudge": 1, "10-weekly": 1, "11-trial-ending": 1, "12-plan-ending": 1,
  };
  for (const [id, n] of Object.entries(WANT_IMAGES)) {
    it(`${id}: ${n} image(s), each absolute https PNG on the public origin with width, height and alt; no SVG, class, flex, rgba; no live typewriter`, () => {
      const m = mail(id);
      const imgs = m.html.match(/<img\b[^>]*>/g) ?? [];
      expect(imgs.length).toBe(n);
      for (const img of imgs) {
        expect(img).toMatch(/\ssrc="https:\/\/queryhawk\.net\/images\/[^"]+\.png\?v=[0-9a-f]{8}"/);
        expect(img).toMatch(/\swidth="\d+(\.\d+)?"/);
        expect(img).toMatch(/\sheight="\d+(\.\d+)?"/);
        expect(img).toMatch(img.includes("queryhawk-logo") ? /\salt=""/ : /\salt="[^"]+"/);
      }
      expect(m.html).not.toMatch(/<svg|<style|class="|display:\s*flex|position:\s*absolute|rgba\(|\.webp/i);
      expect(m.html.replace(/<img\b[^>]*>/g, ""), "EM-7 for all twelve").not.toMatch(/Special Elite|Courier/);
      expect(m.text.length).toBeGreaterThan(80);
    });
  }
  it("the invite's pass is the writer's own numbered image", () => {
    expect(imgsOf(mail("04-invite").html).map((i) => file(i.src))).toEqual(["queryhawk-logo-60.png", "pass-14.png"]);
  });
  it("a link missing refuses the whole message: no app origin, no invite, no account email", () => {
    const noApp = resolveMailConfig({ WAITLIST_PUBLIC_URL: "https://queryhawk.net" });
    expect(prepareInvite(noApp, { code: "QH-7K2M-9XTD", foundingNo: 14, cap: 50, unsubToken: "u" })).toEqual({ ok: false, missing: ["joinUrl"] });
    expect(prepareSignIn(noApp, "https://x.example/l")).toEqual({ ok: false, missing: ["settingsUrl"] });
    expect(prepareSignIn(PROD_APP, null)).toEqual({ ok: false, missing: ["link"] });
  });
  it("only the founding emails carry the one-click unsubscribe headers; the account emails do not", () => {
    for (const id of ["01-confirm", "02-welcome", "03-reserve", "04-invite"]) expect(mail(id).headers?.["List-Unsubscribe-Post"], id).toBe("List-Unsubscribe=One-Click");
    for (const id of ["05-signin", "06-reset", "07-new-email", "08-email-changed", "11-trial-ending", "12-plan-ending"]) expect(mail(id).headers, id).toBeUndefined();
  });
});

describe("EM-13 · the sender split: four founding emails from Nick, everything else from QueryHawk", () => {
  const NICK = "Nick at QueryHawk <nick@queryhawk.net>";
  const QH = "QueryHawk <hello@queryhawk.net>";
  const KINDS: Record<string, EmailKind> = Object.fromEntries(renderSamples().map((s) => [s.id, s.kind]));
  const FROM: Record<string, string> = {
    "01-confirm": NICK, "02-welcome": NICK, "03-reserve": NICK, "04-invite": NICK,
    "05-signin": QH, "06-reset": QH, "07-new-email": QH, "08-email-changed": QH,
    "09-nudge": QH, "10-weekly": QH, "11-trial-ending": QH, "12-plan-ending": QH,
  };
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  for (const [id, from] of Object.entries(FROM)) {
    it(`${id} is from ${from}`, async () => {
      process.env.RESEND_API_KEY = "test-key";
      vi.spyOn(console, "info").mockImplementation(() => {});
      const stub = vi.fn(async (_u: string, _i?: RequestInit) => ({ ok: true, status: 200, json: async () => ({ id: "x" }) }) as unknown as Response);
      vi.stubGlobal("fetch", stub);
      await sendEmail("someone@example.com", KINDS[id], mail(id), { RESEND_API_KEY: "test-key", WAITLIST_REPLY_TO: "nick@queryhawk.net" });
      const body = JSON.parse(String(stub.mock.calls[0][1]?.body));
      expect(body.from).toBe(from);
      expect(body.reply_to).toBe(from === QH ? QH : "nick@queryhawk.net");
    });
  }
  it("one map decides it, and ACCOUNT_FROM overrides the product's sender per environment", async () => {
    expect(Object.entries(SENDER_OF).filter(([, v]) => v === "founding").map(([k]) => k).sort())
      .toEqual(["confirm", "feedback", "invite", "waiting", "welcome"]);
    process.env.RESEND_API_KEY = "test-key";
    vi.spyOn(console, "info").mockImplementation(() => {});
    const stub = vi.fn(async (_u: string, _i?: RequestInit) => ({ ok: true, status: 200, json: async () => ({ id: "x" }) }) as unknown as Response);
    vi.stubGlobal("fetch", stub);
    await sendEmail("a@b.com", "signin", mail("05-signin"), { RESEND_API_KEY: "k", ACCOUNT_FROM: "QueryHawk <dev@example.com>" });
    expect(JSON.parse(String(stub.mock.calls[0][1]?.body)).from).toBe("QueryHawk <dev@example.com>");
  });
});
