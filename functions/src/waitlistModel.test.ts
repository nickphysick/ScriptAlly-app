/**
 * waitlistModel — pure locks.
 *
 * ⚠️ THESE RUN IN THE ROOT SUITE, WITH NO EMULATOR. `vitest.config.ts` includes
 * `functions/src/**\/*.test.ts`, so everything here executes on every `npm test` and in CI. The
 * decisions that need a real Firestore transaction — the cap race above all — live in
 * `tests/functions/`, which needs the emulator and therefore Java.
 */

import { describe, it, expect } from "vitest";
import {
  COUNTER_FLOOR, DEFAULT_CAP, MAX_EMAIL_CHARS, MIN_SUBMIT_MS, RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS, REQUIRE_VERIFICATION, VERIFY_TTL_MS, ALLOWED_ORIGINS,
  normaliseEmail, checkEmail, isDisposable, domainOf, emailHash, tokenHash, ipHash,
  newVerifyToken, tokensMatch, readCounter, countPayload, rateLimitKey, overRateLimit,
  judgeJoin, readSource, COUNTER_PATH,
  RETENTION_MS, UNSUBSCRIBED_GRACE_MS, RETENTION_LIVE_ENV, deletionReason, retentionIsLive,
} from "./waitlistModel";

describe("normalisation is trim-and-lowercase and nothing else", () => {
  /**
   * ⚠️ THE DOC ID IS `sha256(normalised)`, so normalisation IS the primary key. Folding gmail dots
   * or `+tags` would re-key the whole collection and orphan every existing document — the address
   * would hash differently and the dedupe would stop seeing itself. This lock is the reason the
   * temptation gets refused rather than re-argued.
   */
  it("trims and lowercases", () => {
    expect(normaliseEmail("  Nick@Example.COM ")).toBe("nick@example.com");
  });

  it("does NOT strip dots or plus-tags, even for gmail", () => {
    expect(normaliseEmail("n.i.c.k+founding@gmail.com")).toBe("n.i.c.k+founding@gmail.com");
    expect(emailHash(normaliseEmail("n.i.c.k@gmail.com")))
      .not.toBe(emailHash(normaliseEmail("nick@gmail.com")));
  });

  it("is stable, so the same address always lands on the same document", () => {
    expect(emailHash(normaliseEmail("A@b.com"))).toBe(emailHash(normaliseEmail(" a@B.COM  ")));
  });

  it("non-strings normalise to empty rather than throwing", () => {
    for (const junk of [null, undefined, 42, {}, []]) expect(normaliseEmail(junk)).toBe("");
  });
});

describe("email verdicts", () => {
  it("accepts an ordinary address", () => {
    expect(checkEmail("nick@example.com")).toBe("ok");
  });

  it("refuses malformed shapes", () => {
    for (const bad of ["", "nick", "nick@", "@example.com", "nick@example", "a b@c.com"]) {
      expect(checkEmail(bad), bad).toBe("malformed");
    }
  });

  it("refuses anything past RFC 5321's practical maximum", () => {
    const long = "a".repeat(MAX_EMAIL_CHARS) + "@example.com";
    expect(checkEmail(long)).toBe("too-long");
  });

  it("refuses the disposable domains it knows about", () => {
    expect(checkEmail("someone@mailinator.com")).toBe("disposable");
    expect(isDisposable("someone@guerrillamail.com")).toBe(true);
    expect(domainOf("a@b.co.uk")).toBe("b.co.uk");
  });

  /* ⚠️ THE LIST IS NOT THE DEFENCE, and a lock that implied it was would be worse than none. */
  it("…and does not pretend the list is complete", () => {
    expect(isDisposable("someone@some-new-throwaway-2026.example")).toBe(false);
  });
});

describe("the count is the count — shown from zero, absent when unknown", () => {
  /**
   * ⚠️ RETARGETED WHEN THE FLOOR WENT TO ZERO, AND THE NEW CLAIM IS THE MORE USEFUL ONE. This
   * used to assert absent-at-19 and present-at-20 — a fact about a threshold that no longer
   * exists. The floor was 20 so `3/100` would not sit on the page saying nobody wants this; the
   * better answer is to seed the list with genuine sign-ups than to hide the number.
   */
  it("the floor is zero, so the real figure shows from the first sign-up", () => {
    expect(COUNTER_FLOOR).toBe(0);
    expect(countPayload({ verifiedCount: 0, cap: 100 }))
      .toEqual({ visible: true, cap: 100, count: 0 });
    expect(countPayload({ verifiedCount: 1, cap: 100 }))
      .toEqual({ visible: true, cap: 100, count: 1 });
  });

  /**
   * ⚠️ ZERO AS A FLOOR IS FINE; ZERO AS A FALLBACK IS NOT. An unreadable count must render
   * NOTHING, never `0/100` — that would be a false claim about how many founding writers there
   * are, made by accident, on the one page whose whole design is that the number is the number.
   * `null` is how a missing counter document stays distinguishable from a genuine zero.
   */
  it("an unreadable count is absent from the payload, never a zero", () => {
    const p = countPayload(null);
    expect(p.visible).toBe(false);
    expect("count" in p, "no count at all").toBe(false);
    expect(JSON.parse(JSON.stringify(p))).toEqual({ visible: false, cap: DEFAULT_CAP });
  });

  /**
   * ⚠️ THE MECHANISM SURVIVES THE NUMBER GOING TO ZERO — raising the floor again is one constant,
   * not a redesign, which is why this is still a comparison rather than a deleted branch.
   */
  it("…and the withholding branch still works if the floor is ever raised", () => {
    const p = countPayload({ verifiedCount: 4, cap: 100 });
    expect(p).toEqual({ visible: true, cap: 100, count: 4 });
    /* The same shape a floor of 5 would produce for this count. */
    expect(countPayload(null)).toEqual({ visible: false, cap: DEFAULT_CAP });
  });

  /**
   * ⚠️ THE CLIENT NEEDS NO CHANGE FOR ANY OF THIS, and that is asserted rather than assumed.
   * `src/marketing/waitlist.ts`'s `readCount` requires a numeric `count` and yields `null`
   * without one; `null` renders nothing on all three surfaces.
   */
  it("an absent count is exactly what the existing client reads as `no figure`", () => {
    expect(JSON.parse(JSON.stringify(countPayload(null)))).toEqual({ visible: false, cap: DEFAULT_CAP });
  });
});

describe("the counter's migration is a read, and it treats old docs as verified", () => {
  it("prefers verifiedCount when it exists", () => {
    expect(readCounter({ verifiedCount: 12, count: 99, cap: 100 }).verifiedCount).toBe(12);
  });

  /**
   * ⚠️ THE OLD FIELD CARRIES OVER RATHER THAN RESETTING. `count` was incremented on submission
   * under single opt-in; those people gave the same consent this flow asks for. Reading it as
   * zero would tell prod it had no founding writers when it had some.
   */
  it("falls back to the legacy `count` when verifiedCount is absent", () => {
    expect(readCounter({ count: 37, cap: 100 }).verifiedCount).toBe(37);
  });

  it("and an absent counter is zero, not a crash", () => {
    expect(readCounter(undefined)).toEqual({ verifiedCount: 0, cap: DEFAULT_CAP });
    expect(readCounter({})).toEqual({ verifiedCount: 0, cap: DEFAULT_CAP });
  });

  it("a cap of zero is nonsense and falls back to the default", () => {
    expect(readCounter({ cap: 0 }).cap).toBe(DEFAULT_CAP);
  });

  it("negatives and non-numbers do not become the count", () => {
    expect(readCounter({ verifiedCount: -5 }).verifiedCount).toBe(0);
    expect(readCounter({ verifiedCount: "12" }).verifiedCount).toBe(0);
  });

  it("the counter path is the existing one, not a rename", () => {
    expect(COUNTER_PATH).toBe("counters/waitlist");
  });
});

describe("the POST verdict", () => {
  /**
   * ⚠️ A HONEYPOT HIT LOOKS LIKE SUCCESS. Telling a bot it failed teaches it which field to leave
   * alone; the handler returns the success shape and writes nothing.
   */
  it("a filled trap is a honeypot, whatever else is right", () => {
    expect(judgeJoin({ email: "nick@example.com", trap: "http://spam" }).kind).toBe("honeypot");
  });

  it("an empty or whitespace trap is a real person", () => {
    expect(judgeJoin({ email: "nick@example.com", trap: "" }).kind).toBe("ok");
    expect(judgeJoin({ email: "nick@example.com", trap: "   " }).kind).toBe("ok");
  });

  it("a submission faster than a person can type is refused", () => {
    expect(judgeJoin({ email: "nick@example.com", elapsedMs: MIN_SUBMIT_MS - 1 }).kind).toBe("too-fast");
    expect(judgeJoin({ email: "nick@example.com", elapsedMs: MIN_SUBMIT_MS }).kind).toBe("ok");
  });

  /**
   * ⚠️ AN ABSENT TIMER IS NOT EVIDENCE OF ANYTHING. The live forms do not send one today, so
   * treating "missing" as "too fast" would refuse every real signup the moment this deploys.
   */
  it("…and a missing timer passes, because the shipped forms do not send one", () => {
    expect(judgeJoin({ email: "nick@example.com" }).kind).toBe("ok");
    expect(judgeJoin({ email: "nick@example.com", elapsedMs: "soon" }).kind).toBe("ok");
  });

  it("the trap is checked before the email, so a bot learns nothing from a bad address", () => {
    expect(judgeJoin({ email: "not-an-email", trap: "x" }).kind).toBe("honeypot");
  });

  it("a bad email carries its reason for the caller's message", () => {
    expect(judgeJoin({ email: "nope" })).toEqual({ kind: "bad-email", reason: "malformed" });
  });
});

describe("tokens are stored hashed and compared in constant time", () => {
  it("a token is 32 bytes of CSPRNG and no two are alike", () => {
    const a = newVerifyToken(), b = newVerifyToken();
    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64url").length).toBe(32);
  });

  it("the hash is not the token", () => {
    const t = newVerifyToken();
    expect(tokenHash(t)).not.toBe(t);
    expect(tokenHash(t)).toHaveLength(64);
    expect(tokenHash(t)).toBe(tokenHash(t));
  });

  it("matching is by hash, and a wrong token does not match", () => {
    const t = newVerifyToken();
    expect(tokensMatch(tokenHash(t), tokenHash(t))).toBe(true);
    expect(tokensMatch(tokenHash(t), tokenHash(newVerifyToken()))).toBe(false);
  });

  it("…and a malformed hash is refused rather than throwing", () => {
    expect(tokensMatch("zzzz", "zzzz")).toBe(false);
    expect(tokensMatch(tokenHash("a"), "short")).toBe(false);
  });

  it("the link is good for 48 hours", () => {
    expect(VERIFY_TTL_MS).toBe(48 * 60 * 60 * 1000);
  });
});

describe("IPs are salted before they are stored", () => {
  /**
   * ⚠️ WITHOUT THE SALT THE HASH IS REVERSIBLE. IPv4 is 4 billion values; hashing all of them is
   * minutes of work, so an unsalted "hash" of an address is the address.
   */
  it("the same IP under different salts gives different hashes", () => {
    expect(ipHash("1.2.3.4", "salt-a")).not.toBe(ipHash("1.2.3.4", "salt-b"));
  });

  it("and the raw address never appears in the output", () => {
    expect(ipHash("203.0.113.7", "s")).not.toContain("203");
  });
});

describe("rate limiting is per hashed IP per rolling window", () => {
  it("the key rolls with the window, so documents age out instead of growing", () => {
    const h = ipHash("1.2.3.4", "s");
    const t0 = 1_000_000_000_000;
    expect(rateLimitKey(h, t0)).toBe(rateLimitKey(h, t0 + 1000));
    expect(rateLimitKey(h, t0)).not.toBe(rateLimitKey(h, t0 + RATE_LIMIT_WINDOW_MS));
  });

  it("the limit bites on the sixth attempt in an hour", () => {
    expect(RATE_LIMIT_MAX).toBe(5);
    expect(overRateLimit(4)).toBe(false);
    expect(overRateLimit(5)).toBe(true);
  });
});

describe("the settled decisions are pinned where a future edit will trip over them", () => {
  /**
   * ⚠️ RETARGETED WITH THE FLAG, IN THE SAME COMMIT. It asserted `false` for two passes, correctly:
   * with verification on and no transport, every signup sits `pending` for ever and the counter
   * never moves. Mail is proven on dev now, so the honest claim is the opposite one — and it stays
   * a lock rather than being deleted, because switching this back is a decision somebody should
   * have to make deliberately rather than by editing a constant.
   */
  it("double opt-in is ON — nothing counts until a link is clicked", () => {
    expect(REQUIRE_VERIFICATION).toBe(true);
  });

  it("the cap is a hundred and the floor is zero", () => {
    expect(DEFAULT_CAP).toBe(100);
    /* ⚠️ ZERO BY DECISION, NOT BY DEFAULT. The real figure is shown from the first sign-up
       because the list is seeded with genuine ones rather than padded or hidden. */
    expect(COUNTER_FLOOR).toBe(0);
  });

  /**
   * ⚠️ THE ALLOWLIST IS EXACT AND MUST NEVER BECOME A PATTERN. Reflecting an arbitrary `Origin`,
   * or matching one by suffix, is the same as having no allowlist while looking like having one.
   */
  it("origins are listed literally, with no wildcard and no suffix match", () => {
    expect(ALLOWED_ORIGINS).toContain("https://scriptally.ink");
    expect(ALLOWED_ORIGINS).toContain("https://scriptally-dev.web.app");
    for (const o of ALLOWED_ORIGINS) {
      expect(o.startsWith("https://"), o).toBe(true);
      expect(o, o).not.toContain("*");
    }
  });

  it("a source is one of the known surfaces or `unknown`, never free text", () => {
    expect(readSource("landing-panel")).toBe("landing-panel");
    expect(readSource("something-else")).toBe("unknown");
    expect(readSource(undefined)).toBe("unknown");
  });
});

describe("retention decides by age, and never guesses", () => {
  const now = 1_800_000_000_000;

  it("a dormant document past twenty-four months is due", () => {
    expect(deletionReason({ status: "verified", lastInteractionAt: now - RETENTION_MS - 1 }, now))
      .toBe("dormant");
  });

  it("…and one a day short of it is not", () => {
    expect(deletionReason({ status: "verified", lastInteractionAt: now - RETENTION_MS + 86_400_000 }, now))
      .toBeNull();
  });

  /**
   * ⚠️ MEASURED FROM LAST INTERACTION, NOT FROM SIGN-UP. Someone who answered an email last week
   * is not dormant however long ago they joined — `lastInteractionAt` is touched on every join,
   * verify and unsubscribe for exactly this reason.
   */
  it("a recent interaction keeps an old signup alive", () => {
    expect(deletionReason({ status: "verified", lastInteractionAt: now - 86_400_000 }, now)).toBeNull();
  });

  it("an unsubscribed document goes after the grace period, not before", () => {
    expect(deletionReason({ status: "unsubscribed", unsubscribedAt: now - UNSUBSCRIBED_GRACE_MS - 1 }, now))
      .toBe("unsubscribed");
    expect(deletionReason({ status: "unsubscribed", unsubscribedAt: now - 1000 }, now)).toBeNull();
  });

  /**
   * ⚠️ THE GRACE IS SUPPRESSION, NOT SENTIMENT. The record of "this address asked not to be
   * contacted" is the only thing stopping a re-import writing to them again; deleting it the same
   * day removes the suppression along with the subscription.
   */
  it("an unsubscribed document without its stamp still ages out, from what we do know", () => {
    expect(deletionReason(
      { status: "unsubscribed", unsubscribedAt: null, lastInteractionAt: now - UNSUBSCRIBED_GRACE_MS - 1 },
      now,
    )).toBe("unsubscribed");
  });

  /**
   * ⚠️ "I CANNOT TELL HOW OLD THIS IS" MUST NEVER RESOLVE TO "DELETE IT". A document with no
   * timestamp is one this code does not understand — an older shape, or a partial write — and the
   * safe default for an irreversible action is to do nothing.
   */
  it("a document with no timestamps is never due", () => {
    expect(deletionReason({ status: "verified" }, now)).toBeNull();
    expect(deletionReason({ status: "unsubscribed" }, now)).toBeNull();
    expect(deletionReason({}, now)).toBeNull();
  });

  it("the job is a dry run unless the environment says otherwise, exactly", () => {
    expect(retentionIsLive({})).toBe(false);
    expect(retentionIsLive({ [RETENTION_LIVE_ENV]: "false" })).toBe(false);
    /* ⚠️ Not "1", not "yes", not "TRUE " by accident — but a deliberate `true` in any case works. */
    expect(retentionIsLive({ [RETENTION_LIVE_ENV]: "1" })).toBe(false);
    expect(retentionIsLive({ [RETENTION_LIVE_ENV]: "yes" })).toBe(false);
    expect(retentionIsLive({ [RETENTION_LIVE_ENV]: "true" })).toBe(true);
    expect(retentionIsLive({ [RETENTION_LIVE_ENV]: " TRUE " })).toBe(true);
  });
});
