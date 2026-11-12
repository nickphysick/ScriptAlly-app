/**
 * Non-workspace v1, 9f — write all twelve emails, as they would be sent under the production configuration, to
 * reports/non-workspace-v1/emails/<nn-name>.html and .txt (the text part, under its subject and sender).
 *
 *   npx tsx scripts/render-emails.ts [--out <dir>]
 *
 * ⚠️ RENDERS ONLY. Sample data from the ref (functions/src/emailSamples.ts); no project, no network, no send.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderSamples, SAMPLE_CFG } from "../functions/src/emailSamples";
import { senderFor } from "../functions/src/emailConfig";
import type { RenderedEmail } from "../functions/src/email";

const i = process.argv.indexOf("--out");
const out = resolve(i > 0 ? process.argv[i + 1] : "reports/non-workspace-v1/emails");
mkdirSync(out, { recursive: true });
let n = 0;
for (const s of renderSamples()) {
  if (s.prepared.ok === false) { console.error(`${s.id}: REFUSED (missing ${(s.prepared as { missing: string[] }).missing.join(", ")})`); process.exitCode = 1; continue; }
  const e = (s.prepared as { email: RenderedEmail }).email;
  writeFileSync(join(out, `${s.id}.html`), e.html);
  writeFileSync(join(out, `${s.id}.txt`), `From: ${senderFor(SAMPLE_CFG, s.kind).from}\nSubject: ${e.subject}\n\n${e.text}`);
  n++;
}
console.log(`${n} emails written to ${out}`);
