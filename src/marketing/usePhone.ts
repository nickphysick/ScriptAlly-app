/**
 * The phone layout's one breakpoint (landing hero on phones, 23 Oct; ref
 * design-refs/landing-hero-mobile-v1.html). At and below 760px the marketing nav carries the founding
 * pill and the landing hero becomes the card-under-the-header stage with its pull-up drawer.
 * 761–899px keeps the v3 stacked hero untouched.
 *
 * ⚠️ A HOOK, NOT ONLY A MEDIA QUERY, because the phone hero is a different TREE: the drawer wraps the
 * rest of the page, and the desktop H1 is not rendered at all (so "No more winging it." is on the
 * page exactly once — as the drawer's strapline). The CSS for the same width lives in the
 * `@media (max-width: 760px)` blocks, and both read `PHONE_QUERY`'s number.
 *
 * It reads the query on the FIRST render, so a phone never paints the desktop tree for a frame;
 * where there is no `matchMedia` (the node test environment) it answers "not a phone".
 */
import { useEffect, useState } from "react";

export const PHONE_MAX = 760;
export const PHONE_QUERY = `(max-width: ${PHONE_MAX}px)`;

const read = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(PHONE_QUERY).matches;

export function usePhone(): boolean {
  const [phone, setPhone] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}
