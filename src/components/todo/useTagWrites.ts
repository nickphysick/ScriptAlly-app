/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useTagWrites — THE tag write pair, in one place (board-optimise P2).
 *
 * ⚠️ ONE HOME FOR TWO WRITES. Creating a definition touches the USER doc; applying one touches
 * the TASK. Both were written out per page — the board page and the Noteboard each carried their
 * own copy, and P2 needed them on Today and the Calendar too, which would have made four. Four
 * copies of "what a tag write is" is how the null-detach convention, or the failure copy, ends up
 * differing between two pages that look identical.
 *
 * The hook owns no state and decides nothing: it reads the db context, performs the existing
 * primitives, and reports failure through the caller's own flash.
 */
import { useScriptAllyDb } from "../../lib/db";
import { toggleTagSel } from "../../lib/todoTags";
import { TagDef } from "../../types";

export interface TagWrites {
  /** Add a definition to the user's own list. */
  createTagDef: (tag: TagDef) => Promise<void>;
  /** Toggle one tag on an item — an emptied list DETACHES the field (null), never writes []. */
  applyTagToggle: (taskId: string, current: string[] | undefined, id: string) => Promise<void>;
}

export function useTagWrites(onError: (msg: string) => void): TagWrites {
  const { currentUser, updateUserProfile, updateUserTask } = useScriptAllyDb();

  const createTagDef = async (tag: TagDef) => {
    try {
      await updateUserProfile({ tags: [...(currentUser?.tags ?? []), tag] });
    } catch {
      onError("Couldn’t create the tag — try again?");
    }
  };

  const applyTagToggle = async (taskId: string, current: string[] | undefined, id: string) => {
    const next = toggleTagSel(current ?? [], id);
    try {
      await updateUserTask(taskId, { tags: next.length ? next : null });
    } catch {
      onError("Couldn’t change the tags — try again?");
    }
  };

  return { createTagDef, applyTagToggle };
}
