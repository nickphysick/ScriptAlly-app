/**
 * Cloudflare Web Analytics, cookie-free visit counting (launch readiness, 2 Nov).
 *
 * The live build's index.html carries Cloudflare's beacon ONCE, with the token from
 * `VITE_CF_BEACON_TOKEN` (.env.production only: dev visits are not counted). With the variable unset,
 * nothing is emitted. It is a public beacon token, not a secret, so it is committed.
 *
 * It sets no cookie and needs no banner; the privacy page already names Cloudflare Web Analytics.
 * CF-1 holds both halves (src/lib/cfBeacon.test.ts, and the served page in tests/e2e/launchMeta).
 */
export const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

/** A Cloudflare beacon token is 32 hex characters. Anything else is refused rather than written into the page. */
export const isBeaconToken = (t) => typeof t === "string" && /^[0-9a-f]{32}$/.test(t);

export const beaconTag = (token) =>
  `<script defer src="${BEACON_SRC}" data-cf-beacon='{"token": "${token}"}'></script>`;

/** The page with the beacon before `</head>`, or the page unchanged when there is no valid token. */
export const injectBeacon = (html, token) => {
  if (!token) return html;
  if (!isBeaconToken(token)) throw new Error("VITE_CF_BEACON_TOKEN is not a 32-character hex token");
  if (html.includes(BEACON_SRC)) return html;
  return html.replace("</head>", `    ${beaconTag(token)}\n  </head>`);
};
