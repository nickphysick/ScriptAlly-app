/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE MANUSCRIPT ARROWS (polish P6) — a shortcut through the list, never the only route.
 */
import { describe, it, expect } from "vitest";
import { stepManuscript } from "./shellSidebar";

const three = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("stepManuscript", () => {
  it("steps forward and back", () => {
    expect(stepManuscript(three, "a", 1)).toBe("b");
    expect(stepManuscript(three, "b", -1)).toBe("a");
  });

  it("⚠️ WRAPS rather than clamping — clamping would give the arrows a second disabled state", () => {
    expect(stepManuscript(three, "c", 1)).toBe("a");
    expect(stepManuscript(three, "a", -1)).toBe("c");
  });

  it("one manuscript has nowhere to go, and says so by returning the same id", () => {
    expect(stepManuscript([{ id: "only" }], "only", 1)).toBe("only");
  });

  it("no manuscripts yields null rather than throwing", () => {
    expect(stepManuscript([], null, 1)).toBeNull();
    expect(stepManuscript([], "ghost", -1)).toBeNull();
  });

  it("⚠️ an unknown current id steps from the FIRST — matching resolveActiveManuscript's fallback", () => {
    // resolveActiveManuscript falls back to manuscripts[0] for an unknown stored id; if this
    // stepped from somewhere else, one press would jump to an unrelated book.
    expect(stepManuscript(three, "deleted", 1)).toBe("b");
    expect(stepManuscript(three, null, -1)).toBe("c");
  });
});
