#!/usr/bin/env -S npx tsx
/**
 * Non-workspace v1, 9d — open a wave: make each named founding writer's code and send them the invite.
 * Founder-only (Nick).
 *
 *   npx tsx scripts/founding-invite.ts (--writer <email>[,<foundingNo>] ... | --file <writers.csv|.json>) [--app-url <origin>] [--out <dir>]
 *   ALLOW_LIVE_FIRESTORE=1 RESEND_API_KEY=… WAITLIST_IP_SALT=… APP_PUBLIC_URL=… WAITLIST_PUBLIC_URL=… \
 *     npx tsx scripts/founding-invite.ts --project <id> --file <writers> --send --confirm
 *
 * ⚠️ A DRY RUN IS THE DEFAULT, AND IT TOUCHES NOTHING. It makes each code IN MEMORY ONLY (no `inviteCodes` doc is
 *    created), renders each invite from the arguments, writes them to reports/non-workspace-v1/emails/invites-dry-run/
 *    and prints who WOULD be emailed. It reads no project, loads no Firebase client and no mail transport, and needs
 *    no credentials. (src/test/foundingInvite.test.ts locks this.)
 * ⚠️ SENDING NEEDS BOTH `--send` AND `--confirm`, a named `--project`, and ALLOW_LIVE_FIRESTORE=1 (adminRest
 *    `target`). Then, per writer: the waitlist doc must be `verified` (a confirmed founding writer) — its stored
 *    founding number is used, never the argument's; the code doc is CREATED with an exists:false precondition
 *    (`inviteCodes/{CODE}` = { issuedToEmail, name, foundingNo, linkExpiresAt (now + 48h), createdAt }, the fields
 *    functions/src/inviteCode.ts reads); then the invite goes through `sendEmail`, the one transport, as kind
 *    "invite" (from Nick, `SENDER_OF`).
 * ⚠️ NO ADDRESS IS WRITTEN TO A FILE. The rendered invite names nobody (the ref has no greeting); files are named by
 *    their order and code. Addresses are printed to the terminal only — this repository is public.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveMailConfig, type MailConfig } from "../functions/src/emailConfig";
import { CODE_RE, newFounderCode, renderInvite } from "../functions/src/inviteEmail";
import type { RenderedEmail } from "../functions/src/email";

export const USAGE =
  "usage: npx tsx scripts/founding-invite.ts (--writer <email>[,<foundingNo>] ... | --file <writers>) [--app-url <origin>] [--out <dir>]\n" +
  "       add --project <id> --send --confirm (with ALLOW_LIVE_FIRESTORE=1) to create the codes and send";

export const DEFAULT_OUT = "reports/non-workspace-v1/emails/invites-dry-run";
/** The prod app's own hosting site; override with --app-url. Only shapes the dry run's links. */
export const DRY_APP_URL = "https://scriptally-app.web.app";
const DRY_PUBLIC_URL = "https://queryhawk.net";
/** The dry run signs nothing real: its unsubscribe links carry this and say so. */
const DRY_SALT = "dry-run-not-a-real-salt";
export const LINK_TTL_MS = 48 * 60 * 60 * 1000; // inviteCode.ts LINK_TTL_MS

export interface Writer { email: string; foundingNo: number | null; name: string | null }

const argOf = (argv: string[], name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const argsOf = (argv: string[], name: string) => argv.flatMap((a, i) => (a === name && argv[i + 1] ? [argv[i + 1]] : []));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const parseLine = (line: string): Writer | null => {
  const [email, no, ...rest] = line.split(",").map((x) => x.trim());
  if (!email || !EMAIL_RE.test(email)) return null;
  const n = no ? Number(no) : NaN;
  return { email: email.toLowerCase(), foundingNo: Number.isInteger(n) && n > 0 ? n : null, name: rest.join(",") || null };
};

/** Writers from `--writer` (repeatable) and/or `--file` (CSV lines `email[,foundingNo[,name]]`, or a JSON array). */
export function readWriters(argv: string[], read: (p: string) => string = (p) => readFileSync(p, "utf8")): Writer[] {
  const out: Writer[] = [];
  for (const w of argsOf(argv, "--writer")) { const p = parseLine(w); if (!p) throw new Error(`Not an address: ${w}`); out.push(p); }
  const file = argOf(argv, "--file");
  if (file) {
    const raw = read(file);
    if (file.endsWith(".json")) {
      for (const r of JSON.parse(raw) as { email: string; foundingNo?: number; name?: string }[]) {
        const p = parseLine(`${r.email},${r.foundingNo ?? ""},${r.name ?? ""}`);
        if (!p) throw new Error(`Not an address: ${r.email}`);
        out.push(p);
      }
    } else {
      for (const line of raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))) {
        const p = parseLine(line);
        if (!p) throw new Error(`Not an address: ${line}`);
        out.push(p);
      }
    }
  }
  const seen = new Set<string>();
  return out.filter((w) => (seen.has(w.email) ? false : (seen.add(w.email), true)));
}

/** What the live half needs. Absent in a dry run — and the dry run never asks for it. */
export interface LiveDeps {
  readDoc: (path: string) => Promise<Record<string, unknown> | null>;
  createDoc: (path: string, fields: Record<string, unknown>) => Promise<void>;
  send: (to: string, rendered: RenderedEmail) => Promise<{ ok: boolean; reason?: string }>;
  emailHash: (normalised: string) => string;
}

export interface RunDeps {
  log: (line: string) => void;
  write: (path: string, body: string) => void;
  mkdir: (dir: string) => void;
  now: () => number;
  newCode: () => string;
  /** Called ONLY for --send --confirm. */
  live: (argv: string[]) => Promise<LiveDeps>;
}

const realDeps = (): RunDeps => ({
  log: (l) => console.log(l),
  write: (p, b) => writeFileSync(p, b),
  mkdir: (d) => mkdirSync(d, { recursive: true }),
  now: () => Date.now(),
  newCode: () => newFounderCode(),
  live: async (argv) => {
    /* Loaded here and only here, so a dry run never imports a Firebase client, the REST client or the transport. */
    process.argv = [process.argv[0], process.argv[1], ...argv];
    const { target, client } = await import("./lib/adminRest.mjs");
    const t = target(USAGE);
    const c = await client(t);
    const { sendEmail } = await import("../functions/src/email");
    const { emailHash } = await import("../functions/src/waitlistModel");
    console.log(`${t.project} (${t.database}${t.isProd ? ", PRODUCTION" : ""})`);
    return {
      readDoc: c.readDoc as LiveDeps["readDoc"], createDoc: c.createDoc as LiveDeps["createDoc"], emailHash,
      send: (to, rendered) => sendEmail(to, "invite", rendered),
    };
  },
});

const fileBase = (i: number, code: string) => `${String(i + 1).padStart(2, "0")}-${code}`;

/** The whole script. Resolves with what it did, for the test and the summary. */
export async function run(argv: string[], deps: RunDeps = realDeps()): Promise<{ mode: "dry-run" | "sent"; rendered: number; created: number; sent: number }> {
  const writers = readWriters(argv);
  if (!writers.length) { deps.log(USAGE); throw new Error("No writers named."); }
  const send = argv.includes("--send");
  const confirm = argv.includes("--confirm");

  /* ══════════ DRY RUN (the default): render from the arguments, write files, touch nothing else ══════════ */
  if (!(send && confirm)) {
    if (send) deps.log("--send without --confirm: dry run only.");
    const cfg: MailConfig = {
      ...resolveMailConfig({}),
      publicUrl: DRY_PUBLIC_URL,
      appUrl: argOf(argv, "--app-url") ?? DRY_APP_URL,
    };
    const out = resolve(argOf(argv, "--out") ?? DEFAULT_OUT);
    deps.mkdir(out);
    let rendered = 0;
    deps.log(`DRY RUN — no code is created, nothing is sent. Rendering ${writers.length} invite(s) to ${out}`);
    writers.forEach((w, i) => {
      const code = deps.newCode();
      const p = renderInvite(cfg, { email: w.email, code, foundingNo: w.foundingNo }, DRY_SALT);
      if (p.ok === false) { deps.log(`  ${w.email}: REFUSED (missing ${(p as { missing: string[] }).missing.join(", ")})`); return; }
      const e = (p as { email: RenderedEmail }).email;
      deps.write(join(out, `${fileBase(i, code)}.html`), e.html);
      deps.write(join(out, `${fileBase(i, code)}.txt`), `Subject: ${e.subject}\n\n${e.text}`);
      rendered++;
      deps.log(`  would email ${w.email}  ${w.foundingNo ? `No. ${w.foundingNo}` : "(number from the waitlist doc)"}  code ${code} (not created)`);
    });
    deps.log(`${rendered} rendered. Codes above are samples and do not exist. Add --project <id> --send --confirm to send.`);
    return { mode: "dry-run", rendered, created: 0, sent: 0 };
  }

  /* ══════════ SEND: confirmed founders only, a created code each, one invite each ══════════ */
  const live = await deps.live(argv);
  const cfg = resolveMailConfig(process.env);
  const salt = process.env.WAITLIST_IP_SALT ?? "";
  if (!cfg.publicUrl || !cfg.appUrl || !salt || !process.env.RESEND_API_KEY) {
    throw new Error("Sending needs WAITLIST_PUBLIC_URL, APP_PUBLIC_URL, WAITLIST_IP_SALT and RESEND_API_KEY in the environment.");
  }
  let created = 0, sent = 0;
  for (const w of writers) {
    const wl = await live.readDoc(`waitlist/${live.emailHash(w.email)}`);
    if (!wl || wl.status !== "verified" || typeof wl.foundingNumber !== "number") {
      deps.log(`  ${w.email}: SKIPPED — not a confirmed founding writer (status ${String(wl?.status ?? "none")})`);
      continue;
    }
    const foundingNo = wl.foundingNumber as number;
    const code = deps.newCode();
    if (!CODE_RE.test(code)) throw new Error(`bad code ${code}`);
    const now = deps.now();
    const p = renderInvite(cfg, { email: w.email, code, foundingNo }, salt);
    if (p.ok === false) { deps.log(`  ${w.email}: REFUSED (missing ${(p as { missing: string[] }).missing.join(", ")})`); continue; }
    await live.createDoc(`inviteCodes/${code}`, {
      issuedToEmail: { stringValue: w.email },
      ...(w.name ? { name: { stringValue: w.name } } : { name: { nullValue: null } }),
      foundingNo: { integerValue: String(foundingNo) },
      linkExpiresAt: { timestampValue: new Date(now + LINK_TTL_MS).toISOString() },
      createdAt: { timestampValue: new Date(now).toISOString() },
    });
    created++;
    const o = await live.send(w.email, (p as { email: RenderedEmail }).email);
    if (o.ok) sent++;
    deps.log(`  ${w.email}: No. ${foundingNo}  code ${code}  ${o.ok ? "sent" : `NOT SENT (${o.reason ?? "?"}) — the code exists; the fresh-link path can resend`}`);
  }
  deps.log(`${created} code(s) created, ${sent} invite(s) sent.`);
  return { mode: "sent", rendered: created, created, sent };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run(process.argv.slice(2)).catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
}
