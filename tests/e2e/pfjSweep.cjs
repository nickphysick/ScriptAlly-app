/** @license SPDX-License-Identifier: Apache-2.0
 * The phone journeys' leftover sweep (phone fixes v1): lists, and with --delete removes, the scriptally-dev Auth users
 * whose email starts with pfj- — the journeys' own fresh accounts — with every document under users/<uid>. It uses the
 * Firebase CLI's own login, needs no password, and prints nothing about any other account. */
const auth = require(process.cwd() + "/node_modules/firebase-tools/lib/auth.js");
(async () => {
  const acct = auth.getGlobalDefaultAccount();
  const tok = await auth.getAccessToken(acct.tokens.refresh_token, []);
  const H = { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" };
  const P = "https://identitytoolkit.googleapis.com/v1/projects/scriptally-dev";
  const r = await fetch(`${P}/accounts:query`, { method: "POST", headers: H, body: JSON.stringify({ returnUserInfo: true, limit: "1000" }) }).then((x) => x.json());
  if (r.error) { console.log("ERR", r.error.message); return; }
  const mine = (r.userInfo || []).filter((u) => /^pfj-/.test(u.email || ""));
  console.log("PFJ", mine.length, JSON.stringify(mine.map((u) => ({ email: u.email, uid: u.localId }))));
  if (process.argv.includes("--delete")) for (const u of mine) {
    const B = "https://firestore.googleapis.com/v1/projects/scriptally-dev/databases/(default)/documents";
    const { execFileSync } = require("node:child_process");
    try { execFileSync("firebase", ["firestore:delete", `users/${u.localId}`, "--recursive", "--force", "--project", "scriptally-dev", "--database", "(default)"], { stdio: "ignore" }); } catch { console.log("DATA-DELETE-FAILED", u.email); }
    const left = await fetch(`${B}/users/${u.localId}:listCollectionIds`, { method: "POST", headers: H, body: "{}" }).then((x) => x.json());
    if ((left.collectionIds || []).length) console.log("DATA-LEFT", u.email, JSON.stringify(left.collectionIds));
    const d = await fetch(`${P}/accounts:delete`, { method: "POST", headers: H, body: JSON.stringify({ localId: u.localId }) }).then((x) => x.json());
    console.log("DEL", u.email, d.error ? d.error.message : "ok");
  }
})();
