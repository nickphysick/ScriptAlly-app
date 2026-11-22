/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CbPostIt — ONE function draws a post-it, on the wall, in a pile, on the empty page and in the note pop-up
 * (Corkboard v2; ref design-refs/corkboard-v13/, `noteHTML`): its paper (`--c`, the faint top band and the folded
 * corner), the words in Special Elite, "Read all" when the words are cut, the link chip, then the footer — tags,
 * "Pinned to top", "Added {d Mon}" and "✓ On your to-do list · {d Mon}".
 *
 * ⚠️ "READ ALL" SHOWS ONLY WHEN TEXT IS ACTUALLY CUT — measured on the rendered body (scrollHeight against
 *    clientHeight), never guessed from a character count. The wall re-measures on resize and when the fonts land.
 */
import React from "react";
import { linkifyBody } from "../../../lib/noteboard";

export interface PostItLink { kind: "agent" | "query" | "manuscript"; initials: string; name: string }

export interface PostItProps {
  hex: string;
  /** the words; or, in the pop-up, the textarea the writer types onto */
  body: React.ReactNode;
  /** true where long words may be cut at eight lines (the wall); false in a pile's stack, the pop-up and examples */
  clamp?: boolean;
  onReadAll?: () => void;
  link?: PostItLink | null;
  onLink?: () => void;
  tags: string[];
  pinned?: boolean;
  added?: string;
  todo?: string | null;
  /** anything drawn last inside the paper (the empty page's "Keep this") */
  extra?: React.ReactNode;
}

export const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true"><path d="M9 3h6l-1 6 4 4H6l4-4-1-6zM12 13v8" /></svg>
);

export const PostIt: React.FC<PostItProps> = ({ hex, body, clamp, onReadAll, link, onLink, tags, pinned, added, todo, extra }) => (
  <div className="cb2-paper" style={{ ["--c" as string]: hex }}>
    <div className={`cb2-body${clamp ? " cb2-body--clamp" : ""}`}>{body}</div>
    {clamp ? (
      <button type="button" className="cb2-readall" hidden onClick={(e) => { e.stopPropagation(); onReadAll?.(); }}>Read all</button>
    ) : null}
    {link ? (
      <span className="cb2-lchip" role="link" tabIndex={0} data-cb2="link" data-kind={link.kind}
        onClick={(e) => { e.stopPropagation(); onLink?.(); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onLink?.(); } }}>
        <i className={link.kind === "manuscript" ? "cb2-ms" : undefined} aria-hidden="true">{link.initials}</i>
        <span>{link.name}</span>
      </span>
    ) : null}
    <div className="cb2-nfoot">
      {tags.map((t) => <span key={t} className="cb2-tag">#{t}</span>)}
      {pinned ? <span className="cb2-pintag"><PinIcon />Pinned to top</span> : null}
      {added ? <span className="cb2-when">{added}</span> : null}
      {todo ? (
        <span className="cb2-todo" data-cb2="on-todo">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          {`On your to-do list · ${todo}`}
        </span>
      ) : null}
    </div>
    {extra}
  </div>
);

/** Plain words through the app's one linkifier: bare URLs become anchors, nothing becomes markup. */
export const noteWords = (text: string, detail?: string) => (
  <>{linkifyBody(text)}{detail ? <>{"\n"}{linkifyBody(detail)}</> : null}</>
);
