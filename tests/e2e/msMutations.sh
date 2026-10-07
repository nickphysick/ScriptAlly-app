#!/bin/zsh
# Follow-up 2 — prove each MS lock red on its named break (applied in the page; see inkLib.ts).
#   SA_E2E_BASE_URL=http://127.0.0.1:<port> zsh tests/e2e/msMutations.sh
# APPENDS to reports/ink-shell-v1/mutation-proofs.jsonl: one line per lock, "red" when the break failed it.
set -u
OUT=reports/ink-shell-v1/mutation-proofs.jsonl
typeset -A M
M=(
  MS1 ms1-swap MS2 ms2-swap MS3 ms3-cream MS4 ms4-enable MS5 ms5-sans MS6 ms6-offset MS7 ms7-window
  MS8 ms8-hub MS9 ms9-grid MS10 ms10-j MS11 ms11-lilac MS12 ms12-back MS13 ms13-centre MS14 ms14-green MS15 ms15-desktop
)
for lock in ${=MS_LOCKS:-MS1 MS2 MS3 MS4 MS5 MS6 MS7 MS8 MS9 MS10 MS11 MS12 MS13 MS14 MS15}; do
  mut=${M[$lock]}
  log=$(mktemp)
  INK_MUTATE=$mut npx playwright test shellMenus -g "$lock ·" > "$log" 2>&1
  code=$?
  ran=$(grep -cE "^\s+(✓|✘)\s+[0-9]+ \[measure\]" "$log")
  verdict=$([ $code -ne 0 ] && echo red || echo GREEN)
  first=$(grep -m1 -E "Error:" "$log" | sed 's/"/\\"/g' | cut -c1-200)
  echo "{\"lock\":\"$lock\",\"mutation\":\"$mut\",\"verdict\":\"$verdict\",\"tests_run\":$ran,\"first_error\":\"$first\"}" | tee -a "$OUT"
  rm -f "$log"
done
