#!/bin/bash
# Query Centre v135 — prove each QC135 lock red by its named mutation (qc135Lib MUTATIONS), in the page, without a rebuild.
# Usage: SA_E2E_BASE_URL=http://127.0.0.1:<port> bash tests/e2e/qc135Mutations.sh   (a build of the branch)
# Writes reports/qc-v135/mutation-proofs.jsonl: one line per lock, with how many of THAT lock's readings went red.
set -u
OUT=reports/qc-v135/mutation-proofs.jsonl; : > "$OUT"; mkdir -p reports/qc-v135/logs
run() { # lock, test-title pattern
  local lock="$1" pat="$2"
  rm -f "reports/qc-v135/ledger/$lock.json"
  QC135_MUTATE="$lock" npx playwright test qcV135.measure --workers=1 -g "$pat" > "reports/qc-v135/logs/mutate-$lock.log" 2>&1
  local code=$?
  node -e '
    const fs=require("fs");const [lock,code]=process.argv.slice(1);const f=`reports/qc-v135/ledger/${lock}.json`;
    const rows=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8")):[];const red=rows.filter(r=>!r.ok);
    console.log(JSON.stringify({lock,exit:+code,readings:rows.length,red:red.length,first:red[0]?`${red[0].lock} · ${red[0].where} — ${red[0].detail}`.slice(0,260):null}));
  ' "$lock" "$code" | tee -a "$OUT"
}
for l in A1 A2 A3 A4; do run $l "A1 A2 A3 A4"; done
run A5 "A5 ·"
for l in B1 B2 B3 B4 B5 B6; do run $l "B1 B2 B3 B4 B5 B6"; done
run B7 "B7 ·"; run B8 "B8 ·"; run B9 "B9 ·"
