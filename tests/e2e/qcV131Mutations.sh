#!/bin/zsh
# Query Centre v131 — prove each QC lock red on its named break (applied in the page; see inkLib.ts).
#   SA_E2E_BASE_URL=http://127.0.0.1:<port> zsh tests/e2e/qcV131Mutations.sh
# APPENDS to reports/query-centre-v131/mutation-proofs.jsonl. QC5 is a unit test and is proved separately.
set -u
OUT=reports/query-centre-v131/mutation-proofs.jsonl
typeset -A M
M=(
  QC1 qc1-header QC2 qc2-tall QC3 qc3-wrap QC4 qc4-zero QC6 qc6-swap QC7 qc7-filter QC8 qc8-pre
  QC9 qc9-tray QC10 qc10-indent QC11 qc11-static QC12 qc12-margin QC13 qc13-tag QC14 qc14-hard QC15 qc15-empty
)
for lock in ${=QC_LOCKS:-QC1 QC2 QC3 QC4 QC6 QC7 QC8 QC9 QC10 QC11 QC12 QC13 QC14 QC15}; do
  mut=${M[$lock]}
  log=$(mktemp)
  INK_MUTATE=$mut npx playwright test qcV131 -g "$lock ·" > "$log" 2>&1
  code=$?
  ran=$(grep -cE "^\s+(✓|✘)\s+[0-9]+ \[measure\]" "$log")
  verdict=$([ $code -ne 0 ] && echo red || echo GREEN)
  first=$(grep -m1 -E "Error:" "$log" | sed 's/"/\\"/g' | cut -c1-200)
  echo "{\"lock\":\"$lock\",\"mutation\":\"$mut\",\"verdict\":\"$verdict\",\"tests_run\":$ran,\"first_error\":\"$first\"}" | tee -a "$OUT"
  rm -f "$log"
done
