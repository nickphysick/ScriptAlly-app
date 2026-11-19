/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v161, Phase 2 — a callback whose identity never changes but which always calls the latest one passed.
 * A memoised child (QcCard154) skips re-rendering when only its callbacks' identities changed; through this it still
 * calls what the parent rendered last, never a stale closure.
 */
import { useCallback, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableFn<A extends any[], R>(fn: (...a: A) => R): (...a: A) => R {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...a: A) => ref.current(...a), []);
}
