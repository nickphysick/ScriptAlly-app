# Comparable titles — Prompt 3: the Scout function

Design authority: the pack's Prompt 3, as amended by Amendments 1–3. Prompt 2's report is
`reports/comps-2-report.md`.

## ⚠️ Read this first: the API-key rotation is still unconfirmed

`CLAUDE.md` carries a standing instruction: *"`ANTHROPIC_API_KEY` rotation pending — the key was
pasted into chat in a prior session… **Verify rotation before any further Functions work.**"* That
has never been closed out, and `functions/src/assistAgentData.ts` carries the same warning in its own
header.

I have written code and touched no key, no secret and no deploy — authoring cannot leak a key, and
this session never had one. **But the rotation must be confirmed before you deploy this**, because
deployment is the point at which the secret is used. It is the first item in "Still pending Nick".

## ⚠️ This was a rewrite, not a greenfield function

`suggestComps` already existed — built with the flat-list pack, never deployed. Prompt 3 says
"replace the Prompt 2 stub"; there was no stub (Prompt 2's dev path is the `__SA_SUGGEST_COMPS_MOCK`
window hook), and there *was* a live-shaped function on the old contract. So this is a rewrite of
`suggestCompsCore.ts` + `suggestComps.ts` plus a new `compCatalogue.ts`.

## The change that matters: verification is code now, not prose

The old function's entire defence against invented books was a sentence in the system prompt:

> *"Inventing a title, author or year is far worse than returning fewer suggestions — if you are not
> certain a book is real, leave it out."*

**A model that follows that perfectly and a model that hallucinates produce byte-identical output.**
There was no `verification` field on the old contract because there was nothing to put in it.

Now: the model proposes **candidates**; `compCatalogue.ts` looks each one up in Google Books and
**drops anything the catalogue cannot confirm on title *and* author**. Only what survives becomes a
suggestion, carrying the record the client persists and the ✓ VERIFIED chip renders from.

Four properties, each locked:

- **A failed lookup drops the candidate, never downgrades it.** There is no unverified path — the
  row would otherwise sit under a footer claiming it had been checked.
- **A network or parse failure also drops it.** Failing open would make the footer's claim depend on
  Google's uptime.
- **The catalogue's facts win over the model's.** Title, author, year and publisher all come from the
  matched volume. Carrying the model's year beside a catalogue's verification would put an unchecked
  number inside a checked claim. A match with no publication year is dropped, because `year` is
  required on the wire.
- **The check is loose on typography, strict on words.** Smart quotes, `&` vs `and`, a subtitle after
  a colon and author initials all normalise away; different word content does not. The failure that
  matters is a *wrong* match, not a missed one — a missed match costs a suggestion, a wrong one puts
  a verified badge on a book nobody checked.

Google Books' public volumes endpoint needs no API key. That is deliberate: a verification step
gated on a second secret is one that silently stops running when the secret expires.

## Security fix: the client no longer describes the manuscript

The callable took `manuscriptTitle`, `ageCategory`, `genre`, `logline` and `shelfTitles` from the
caller. **A caller could therefore describe any manuscript they liked — including one they do not
own — and spend a Pro run against it.**

It now takes `{ manuscriptId }` and reads `users/{uid}/manuscripts/{manuscriptId}` server-side, under
the caller's own uid. Ownership is structural rather than checked, and the prompt inputs come from
the same place as the permission. The client contract narrowed to match.

## Other changes

- **`temperature` is gone, and its absence is load-bearing.** The old core set `temperature: 0.7`;
  sampling parameters are removed on this model tier and a request carrying one **returns a 400**.
  Asserted in the tests, because the failure is a deploy-time 400 on a function nobody can run
  locally. Variety now comes from web search returning genuinely current titles.
- **Web search** (`web_search_20260209`) — the point of the call. "Published in the last five years"
  cannot be honoured from training data older than the market the writer is querying into.
- **A refusal is not a parse failure.** This tier can decline outright, returning a successful
  response with no usable content; the old retry would have burned a second call nudging it to
  "return valid JSON". `ScoutRefusedError` surfaces it in one call.
- **Rate limit**: 10 runs per user per UTC day, claimed in a transaction **before** the model call so
  a failed run still costs its slot. It lives in `scoutRateLimits/{uid}`, written with the Admin SDK
  — **which bypasses security rules, so this needs no rules block and is invisible to the client.** A
  limit the browser could read would tell a caller how many runs they had left; one it could write
  would not be a limit.
- **`runAt` is the server's clock.** The strip states when the Scout went out, not when the reader's
  device thinks it did.
- **`facts` was never added** (baked decision 20) — the client composes that chip at render.

## Fixture-vs-live diff (the pack's closing ask)

Prompt 2's contract and what the function now returns agree, with two notes:

| Field | Status |
|---|---|
| `title`, `author`, `year`, `publisher`, `media`, `why`, `matchAxis`, `verification`, `runAt` | match |
| `links` | **Not emitted.** The contract keeps the field and the client carries it unrendered; nothing populates it yet. Google Books returns a volume URL — wiring it is a small follow-up. |
| `agentMatch` | **Not emitted**, as designed — the matching logic is a later prompt's hook. |

**One real narrowing: non-book candidates are dropped.** A book catalogue cannot confirm a film, and
the contract has no unverified path, so a film candidate has nothing to stand on. The writer can
still add one by hand; what the Scout cannot do is claim it checked one. The prompt tells the model
to propose books unless a screen title is genuinely the closest comparison.

## Deliberate omissions, with reasons

**Structured outputs (`output_config.format`) are not used.** They would remove the parse-and-retry
path entirely, and I would normally reach for them. I did not, because their interaction with the
server-side web-search tool is not something I can verify here — no key, no deploy, and a wrong guess
surfaces only as a 400 in production. The existing parse + validate + single retry is proven in this
codebase (it is the shape `extractFromEmail` and the old function both use). **Worth revisiting as
the first change once the function can actually be exercised.**

**Node stays pinned at 20.** The pack says to note it rather than upgrade the whole project inside
this task, so: `functions/package.json` has `"node": "20"` and needs to reach 22 before October 2026.

**⚠️ The SDK pin wants a bump before deploy.** `@anthropic-ai/sdk` is `^0.39.0`, which predates both
the model id and the web-search tool version this function sends — its `stop_reason` union does not
even contain `"refusal"`. The core deliberately talks to a structural `AnthropicLike` interface
rather than SDK types, so it compiles and the request body passes through unaltered; but running on a
two-generations-old client is not something to discover at deploy time. Bump and re-run the gates
before shipping.

**No `synopsis`.** The pack lists it among the model's inputs. `Manuscript` has no synopsis field —
only `logline` and `notes` — so the prompt uses the logline. The core still accepts an optional
synopsis for when the field exists.

## Verification

- App `tsc` clean · production build clean · **Vitest 4546 passed, 274 files, 2 skipped**.
- `functions/` typechecks clean (`cd functions && npx tsc --noEmit`).
- 33 new/rewritten function tests: the request shape (no sampling params, web search present, model
  and thinking config), the system prompt's anti-appraisal and anti-invention clauses, candidate
  validation, the retry-once path, the refusal path, and the catalogue check in both directions.

**Not verified, and cannot be here:** anything requiring a live API call or a deploy — the real
model's output shape, whether web search and the JSON contract interact as expected in practice,
Google Books' hit rate on real candidates, and the rate limiter against a real Firestore.

## Still pending Nick

1. **Confirm the `ANTHROPIC_API_KEY` rotation** — standing item in `CLAUDE.md`, still open, blocks
   any Functions deploy.
2. **`firestore.rules` deploy** — `MAX_COMPS` at 100 (from `9ff9af2`). Unrelated to this function,
   still queued. `scoutRateLimits` needs **no** rules change (Admin SDK).
3. **Bump `@anthropic-ai/sdk`**, then `cd functions && npm install && npm run build`.
4. **Blaze plan / API-key gate**, then deploy: `firebase deploy --only functions:suggestComps
   --project <named target>` — never a bare deploy.
5. **Flip `SCOUT_LIVE`** in `src/lib/suggestComps.ts` (or set `window.__SA_SCOUT_LIVE` on dev to
   exercise it first). Until then the panel shows its "goes live soon" state and never fabricates.
