/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MaterialsRail — the flush "Your materials" side panel shown alongside the packages home (Phase 6),
 * once the manuscript has any material or package. One row per material type: a tinted-tile glyph, the
 * plural label, a saved-count, and a ＋ that opens the create-modal for that type. Footer "Manage all
 * materials →" (the --btn* Builder button treatment, Playfair, no border-top) opens the materials
 * manager. Ported from the mockup .qlist; colours are theme tokens.
 */
import React from "react";
import { ManuscriptVersion, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES } from "./typeMeta";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

export interface MaterialsRailProps {
  versions: ManuscriptVersion[];
  /** Open the create-modal for a material type (Phase 9). */
  onCreate: (type: ComponentType) => void;
  /** Open the materials manager (Phase 8). */
  onManage: () => void;
}

export const MaterialsRail: React.FC<MaterialsRailProps> = ({ versions, onCreate, onManage }) => (
  <aside className="pkgrail">
    <style>{`
      .pkgrail { width:238px; flex-shrink:0; align-self:stretch; max-height:100%; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:var(--chromerad); display:flex; flex-direction:column; overflow:hidden; }
      .pkgrail .qlist-head { padding:16px 16px 12px; flex-shrink:0; }
      .pkgrail .qlist-head h2 { font-family:${FONT_SERIF}; font-size:18px; font-weight:600; color:var(--headT); margin:0; }
      .pkgrail .qlist-head .lab { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin-top:4px; }
      .pkgrail .qlist-body { flex:1; overflow-y:auto; padding:4px 12px 12px; display:flex; flex-direction:column; gap:8px; }
      .pkgrail .mat { display:flex; align-items:center; gap:11px; padding:12px; border:var(--bdw) solid var(--bd); border-radius:11px; background:var(--card); cursor:pointer; transition:background .15s ease; text-align:left; }
      .pkgrail .mat:hover { background:#faeee8; }
      .pkgrail .mi { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .pkgrail .mt { flex:1; min-width:0; }
      .pkgrail .mt .nm { font-size:13.5px; font-weight:600; color:var(--ink); }
      .pkgrail .mt .sub { font-size:11px; color:var(--muted); margin-top:1px; }
      .pkgrail .add { width:26px; height:26px; border-radius:7px; background:var(--btnBg); border:1px solid var(--btnBd); color:var(--burg); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; font-size:15px; line-height:1; padding:0; }
      .pkgrail .add:hover { background:var(--btnH); }
      .pkgrail .qlist-foot { padding:12px; flex-shrink:0; }
      .pkgrail .manage { width:100%; font-family:${FONT_SERIF}; font-size:14px; font-weight:600; color:var(--btnT); background:var(--btnBg); border:1px solid var(--btnBd); border-radius:9px; padding:10px; cursor:pointer; }
      .pkgrail .manage:hover { background:var(--btnH); }
      @media (max-width: 768px) { .pkgrail { width:100% !important; align-self:stretch; } }
    `}</style>

    <div className="qlist-head">
      <h2>Your materials</h2>
      <div className="lab">Building blocks</div>
    </div>

    <div className="qlist-body">
      {BUILDER_TYPES.map((type) => {
        const m = TYPE_META[type];
        const count = versions.filter((v) => v.componentType === type).length;
        return (
          <div key={type} className="mat" role="button" tabIndex={0} onClick={() => onCreate(type)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCreate(type); } }}>
            <span className="mi" style={{ background: m.tint, color: m.ink }}><TypeGlyph type={type} size={16} /></span>
            <div className="mt">
              <div className="nm">{m.plural}</div>
              <div className="sub">{count === 0 ? "none yet" : `${count} saved`}</div>
            </div>
            <button type="button" className="add" aria-label={`Add a ${m.label.toLowerCase()}`} onClick={(e) => { e.stopPropagation(); onCreate(type); }}>＋</button>
          </div>
        );
      })}
    </div>

    <div className="qlist-foot">
      <button type="button" className="manage" onClick={onManage}>Manage all materials →</button>
    </div>
  </aside>
);
