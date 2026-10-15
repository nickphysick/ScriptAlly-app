#!/usr/bin/env bash
# Responses v2 — run each RS2 lock with its named break (RS2_MUTATE=<lock>) and record whether it went red.
# A lock whose mutation leaves it green is not proved; the summary says which.
#   SA_E2E_BASE_URL=http://127.0.0.1:4621 bash tests/e2e/rs2Mutate.sh [LOCK ...]
set -u
LOCKS=("$@")
[ ${#LOCKS[@]} -eq 0 ] && LOCKS=(A1 A2 B1 B2 B2one B3 B4 C1 C2 C3 C4 D1 D2 E1 F1 F2 L1)
OUT=reports/responses-v2/mutation-proofs.jsonl
mkdir -p reports/responses-v2
for L in "${LOCKS[@]}"; do
  case "$L" in
    A1) T="A1 route";; A2) T="A2 card";; B1) T="B1 gutter";; B2) T="B2 carousel";; B2one) T="B2 carousel, one card";; B3) T="B3 cards";; B4) T="B4 none";;
    C1) T="C1 tally";; C2) T="C2 list";; C3) T="C3 pins";; C4) T="C4 narrow";; D1) T="D1 panel";; D2) T="D2 acting";;
    E1) T="E1 share";; F1) T="F1 empty";; F2) T="F2 zero nos";; L1) T="L1 no overflow";;
    *) echo "unknown lock $L"; continue;;
  esac
  LOG="/tmp/rs2-mut-$L.txt"
  M="$L"
  RS2_MUTATE="$M" npx playwright test tests/e2e/rs2.measure.ts -g "$T\$" --reporter=line --workers=1 > "$LOG" 2>&1
  CODE=$?
  LINE=$(grep -E "^\[$L\] " "$LOG" | tail -1)
  FIRST=$(grep -E "✗ $L " "$LOG" | head -1 | sed 's/"/\\"/g')
  if [ $CODE -ne 0 ] && [ -n "$LINE" ]; then V=red; else V="NOT RED (exit $CODE)"; fi
  echo "{\"lock\":\"$L\",\"mutation\":\"RS2_MUTATE=$L\",\"verdict\":\"$V\",\"reading\":\"$LINE\",\"first\":\"$FIRST\"}" >> "$OUT"
  echo "$L: $V — $LINE"
done
