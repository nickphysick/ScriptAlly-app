#!/bin/bash
# App shell v2 — prove each SH2 lock red by its named mutation (sh2Lib MUTATIONS), in the page, without a rebuild.
# Usage: SA_E2E_BASE_URL=http://127.0.0.1:<port> bash tests/e2e/sh2Mutations.sh   (a build of the branch)
# Writes reports/shell-v2/mutation-proofs.jsonl: one line per lock, with how many of THAT lock's readings went red.
set -u
OUT=reports/shell-v2/mutation-proofs.jsonl; : > "$OUT"
run() { # lock, test-title pattern, ledger glob
  local lock="$1" pat="$2" glob="$3"
  rm -f reports/shell-v2/ledger/$glob
  SH2_MUTATE="$lock" npx playwright test shellV2.measure --workers=1 -g "$pat" > "reports/shell-v2/logs/mutate-$lock.log" 2>&1
  local code=$?
  node -e '
    const fs=require("fs"),path=require("path");const [lock,glob,code]=process.argv.slice(1);
    const dir="reports/shell-v2/ledger";const re=new RegExp("^"+glob.replace("*",".*")+"$");
    const rows=fs.readdirSync(dir).filter(f=>re.test(f)).flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")));
    const mine=rows.filter(r=>r.lock.startsWith(lock+" "));const red=mine.filter(r=>!r.ok);
    console.log(JSON.stringify({lock,exit:+code,readings:mine.length,red:red.length,first:red[0]?`${red[0].lock} · ${red[0].where} — ${red[0].detail}`.slice(0,260):null}));
  ' "$lock" "$glob" "$code" | tee -a "$OUT"
}
run S1 "S1 ·" "S1.json"
run S2 "S2 S3 S4" "S2-*.json"
run S3 "S2 S3 S4" "S3-*.json"
run S4 "S2 S3 S4" "S4-*.json"
run S5 "S5 ·" "S5.json"
run S6 "S6 ·" "S6.json"
run B1 "B1 ·" "B1.json"
run B2 "B2 B3" "B2.json"
run B3 "B2 B3" "B3.json"
run L1 "L1 ·" "L1.json"
