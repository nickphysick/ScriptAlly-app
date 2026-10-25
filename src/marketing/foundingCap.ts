/**
 * The founding cap — ONE place (25 Oct: Nick cut it from 100 to 50).
 *
 * Every counter (the landing hero's places counter, the nav's pill, the Pricing page's panel and the
 * sealed band) draws "places left" against this, through `foundingStore`, and every copy string that
 * states the number derives it from here. `functionsCap.test.ts` holds the server's `DEFAULT_CAP`
 * (functions/src/waitlistModel.ts) equal to it.
 *
 * ⚠️ THE SERVER'S ENFORCED CAP IS THE COUNTER DOCUMENT'S OWN `cap` FIELD (`counters/waitlist`), with
 * `DEFAULT_CAP` only as the fallback when the document has none — and every write stores the cap back
 * onto the document. So enforcing 50 needs the functions deploy AND that field set to 50 on each
 * project. Until then the endpoint still answers `cap: 100`, and the client draws against this value.
 */
export const FOUNDING_CAP = 50;
/** The cap in words, for the sentences that spell it out ("All fifty founding places …"). */
export const FOUNDING_CAP_WORD = "fifty";
