#!/bin/zsh
# TDP1 — prove each To-do-on-the-phone lock red: one emulator run per named break (TDP1_MUTATE), at 390×844.
# Every run should FAIL; the log line names the assertion that fired. Usage: zsh tests/e2e/tdp1Mutate.sh [locks…]
set -u
OUT=reports/todo-phone-v1/mutation-proofs.txt
if (( $# )); then LOCKS=($@); else LOCKS=(L1 L2 L3 L4 L4b L5 L6 L7 L8 L9 L9b L10); fi
typeset -A GREP
GREP=(L1 "L1 · .*390" L2 "L2 · .*390" L3 "L3 · .*390" L4 "L4 · .*390" L4b "L4 · .*390" L5 "L5.* 390" L6 "L5.* 390" L7 "L5.* 390" L8 "L8 " L9 "L9 · .*390" L9b "L9 · .*390" L10 "L10 · .*390")
for L in $LOCKS; do
  log=/tmp/tdp1-mut-$L.log
  # the emulator's ports are shared with other sessions' runs: wait for them, never take them
  for i in {1..720}; do lsof -nP -iTCP:4405 -sTCP:LISTEN >/dev/null 2>&1 || lsof -nP -iTCP:4321 -sTCP:LISTEN >/dev/null 2>&1 || break; sleep 10; done
  SRC=src/components/todo/phone/PhoneTaskScreen.tsx
  if [[ $L == L8 ]]; then
    mkdir -p /tmp/tdp1-mut && cp $SRC /tmp/tdp1-mut/src-components-todo-phone-PhoneTaskScreen.tsx
    sed -i '' 's/const d = await flow.commit();/const d = await flow.commit(); await flow.commit();/' $SRC
  fi
  TDP1_MUTATE=$L npm run e2e:emu -- tests/e2e/todoPhoneV1.measure.ts --project=measure -g "${GREP[$L]}" > $log 2>&1
  code=$?
  [[ $L == L8 ]] && cp /tmp/tdp1-mut/src-components-todo-phone-PhoneTaskScreen.tsx $SRC
  fired=$(grep -m1 -E "^\s+Error: " $log | sed 's/^ *//')
  why=$(grep -m1 -E "Expected|Received" $log | sed 's/^ *//')
  echo "$L · exit $code · $(grep -E '[0-9]+ (passed|failed)' $log | tr '\n' ' ') · $fired · $why" | tee -a $OUT
done
