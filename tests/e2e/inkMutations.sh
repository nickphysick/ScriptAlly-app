#!/bin/zsh
# Ink shell v1 — prove each INK lock red on its named break (applied in the page; see inkLib.ts).
#   SA_E2E_BASE_URL=http://127.0.0.1:<port> zsh tests/e2e/inkMutations.sh
# Writes reports/ink-shell-v1/mutation-proofs.jsonl: one line per lock, "red" when the break failed it.
set -u
OUT=reports/ink-shell-v1/mutation-proofs.jsonl
: > "$OUT"
typeset -A M
M=(
  INK1 ink1-stone   INK2 ink2-literal   INK3 ink3-overlap   INK4 ink4-gradient   INK5 ink5-inset
  INK6 ink6-current INK7 ink7-centre    INK8 ink8-copy      INK9 ink9-feedback   INK10 ink10-tile
  INK11 ink11-anthracite INK12 ink12-plain INK13 ink13-nocard INK14 ink14-motion INK15 ink15-fade
  INK16 ink16-full  INK17 ink17-window  INK18 ink18-left    INK19 ink19-ink
)
for lock in INK1 INK2 INK3 INK4 INK5 INK6 INK7 INK8 INK9 INK10 INK11 INK12 INK13 INK14 INK15 INK16 INK17 INK18 INK19; do
  mut=${M[$lock]}
  log=$(mktemp)
  INK_MUTATE=$mut npx playwright test inkShell -g "$lock ·" > "$log" 2>&1
  code=$?
  ran=$(grep -cE "^\s+(✓|✘)\s+[0-9]+ \[measure\]" "$log")
  verdict=$([ $code -ne 0 ] && echo red || echo GREEN)
  first=$(grep -m1 -E "Error:" "$log" | sed 's/"/\\"/g' | cut -c1-200)
  echo "{\"lock\":\"$lock\",\"mutation\":\"$mut\",\"verdict\":\"$verdict\",\"tests_run\":$ran,\"first_error\":\"$first\"}" | tee -a "$OUT"
  rm -f "$log"
done
