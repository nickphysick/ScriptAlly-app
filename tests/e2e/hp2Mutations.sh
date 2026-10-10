#!/bin/bash
# Header panel v2 — prove each HP2 lock red by its named mutation (hp2Lib MUTATIONS), in the page, without a rebuild.
# Usage: SA_E2E_BASE_URL=http://127.0.0.1:<port> bash tests/e2e/hp2Mutations.sh   (a build of the branch)
# Writes reports/header-panel-v2/mutation-proofs.jsonl: one line per lock, with how many of THAT lock's readings went red.
# P3 is not here: its mutation needs an empty account (see the report); it is proved red at unit.
set -u
D=reports/header-panel-v2; OUT=$D/mutation-proofs.jsonl; : > "$OUT"; mkdir -p $D/logs $D/ledger-mut
run() { # lock, test-title pattern, ledger name
  local lock="$1" pat="$2" led="$3"
  rm -f "$D/ledger/$led.json"
  HP2_MUTATE="$lock" npx playwright test headerPanelV2.measure --workers=1 -g "$pat" > "$D/logs/mutate-$lock.log" 2>&1
  local code=$?
  cp "$D/ledger/$led.json" "$D/ledger-mut/$lock.json" 2>/dev/null
  node -e '
    const fs=require("fs");const [lock,code,f]=process.argv.slice(1);
    const rows=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8")):[];const mine=rows.filter(r=>r.lock.startsWith(lock+" "));const red=mine.filter(r=>!r.ok);const other=rows.filter(r=>!r.ok&&!r.lock.startsWith(lock+" "));
    console.log(JSON.stringify({lock,exit:+code,readings:mine.length,red:red.length,otherLocksRed:other.length,first:red[0]?`${red[0].lock} · ${red[0].where} — ${red[0].detail}`.slice(0,280):null}));
  ' "$lock" "$code" "$D/ledger/$led.json" | tee -a "$OUT"
}
for l in P1 P4 P5; do run $l "P1 P4 P5 P7" $l; done
run P7 "P1 P4 P5 P7" P7
run P2 "P2 ·" P2; run P6 "P6 ·" P6; run P8 "P8 ·" P8; run P9 "P9 ·" P9
for l in A1 A2 A3 A4 A5 A6; do run $l "A1 A2 A3 A4 A5 A6" $l; done
run C1 "C1 ·" C1
for l in D1 D2 D3 D4 D8; do run $l "D1 D2 D3 D4 D8" $l; done
run D5 "D5 ·" D5; run D6 "D6 ·" D6; run D7 "D7 ·" D7
