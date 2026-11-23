"""Plumage colours v3 — the named mutations, applied in a disposable measurement worktree (argv[1] = its root,
argv[2] = the run: A, B, C, or a unit mutation's name). Each replacement must match exactly once, or the run stops."""
import sys, os
root, run = sys.argv[1], sys.argv[2]
C = "src/components/queries/centre/"

def rep(path, a, b):
    p = os.path.join(root, path)
    s = open(p).read()
    n = s.count(a)
    if n != 1:
        sys.exit(f"STOP: {path}: {n} matches for {a[:70]!r}")
    open(p, "w").write(s.replace(a, b))
    print(f"mutated {path}: {a[:60]!r}")

def append(path, text):
    p = os.path.join(root, path)
    open(p, "a").write(text)
    print(f"appended to {path}")

MUT = {
  # ── e2e run A ──
  "E1": ("PC3-1: the offer's stripes come back on the two card bands",
         lambda: rep("src/lib/stageColours.ts", "status === QueryStatus.REVISE_RESUBMIT ? RR_STRIPES : statusBand(status);",
                     "status === QueryStatus.REVISE_RESUBMIT ? RR_STRIPES : stageOf(status ?? \"\") === \"offer\" ? \"repeating-linear-gradient(118deg,#f6f0e5 0 22px,#f1d9cf 22px 44px,#d3deea 44px 66px)\" : statusBand(status);")),
  "E5": ("PC3-5: the label drops 16px, onto the track's row",
         lambda: rep(C + "pc3card.css", "position: absolute; top: -4px; right: 21px; z-index: 3;", "position: absolute; top: 12px; right: 21px; z-index: 3;")),
  "E7": ("PC3-7: the tile sits 20px in from the Sent box's right edge",
         lambda: rep(C + "pc3tile.css", "position: absolute; top: 50%; right: 12px;", "position: absolute; top: 50%; right: 20px;")),
  "E9": ("PC3-9: the agency line back at v2's 58%",
         lambda: rep(C + "qcv154.css", "color: rgba(28, 19, 15, 0.66); white-space: nowrap;", "color: rgba(28, 19, 15, 0.58); white-space: nowrap;")),
  "E10": ("PC3-10: the agent tile back at v1's 45% teal",
         lambda: rep("src/lib/kindColours.ts", 'agent: { tile: "#96aca9", glyph: "#1c130f", edge: "#7c9793" },', 'agent: { tile: "#b0c1be", glyph: "#1c130f", edge: "#96aca9" },')),
  # ── e2e run B ──
  "E2": ("PC3-2: Revise & Resubmit's card bands drop their stripes (flat)",
         lambda: rep("src/lib/stageColours.ts", "status === QueryStatus.REVISE_RESUBMIT ? RR_STRIPES : statusBand(status);", "statusBand(status);")),
  "E3": ("PC3-3: Revise & Resubmit back on the Full sent band off the card bands (v2)",
         lambda: rep("src/lib/stageColours.ts", "QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]);", "QueryStatus.FULL_REQUESTED]);")),
  "E4": ("PC3-4: the frame stops clipping (v2's overflow visible)",
         lambda: append(C + "pc3card.css", "\n.qc154-card .qc154-in { overflow: visible; }\n")),
  "E5b": ("PC3-5: a gone quiet card is 6px taller",
         lambda: append(C + "pc3card.css", "\n.qc154-card[data-quiet] .qc154-fx { padding-bottom: 16px; }\n")),
  "E8": ("PC3-8: the hover never opens upwards",
         lambda: rep(C + "QcMatTile.tsx", "const up = below < h && above > below;", "const up = false && below < h && above > below;")),
  "E11": ("PC3-11: Escape no longer closes the hover",
         lambda: rep(C + "QcMatTile.tsx", "useEscapeLayer(open, () => { hide(); btn.current?.focus(); }, escLevel);", "useEscapeLayer(open, () => { btn.current?.focus(); }, escLevel);")),
  # ── e2e run C ──
  "E4b": ("PC3-4: the label drawn inside the band, where the restored frame clips it (top edge, as v3 places it)",
         lambda: (rep(C + "QcCard154.tsx", '          <span className="qc154-sr" data-qc154="word">{word}</span>\n        </div>',
                      '          <span className="qc154-sr" data-qc154="word">{word}</span>\n          <span className="pc3-lbl" data-pc3="label" aria-hidden="true" style={{ ["--pc3-edge" as string]: STAGE_COLOURS[stageOf(r.status)].edge } as React.CSSProperties}>{word}</span>\n        </div>'),
                  rep(C + "QcCard154.tsx", '      <span className="pc3-lbl" data-pc3="label" aria-hidden="true" style={{ ["--pc3-edge" as string]: STAGE_COLOURS[stageOf(r.status)].edge } as React.CSSProperties}>{word}</span>\n    </div>\n  );',
                      '    </div>\n  );'),
                  append(C + "pc3card.css", "\n.qc154-card .qc154-hd > .pc3-lbl { position: absolute; top: -11px; right: 14px; z-index: 3; display: inline-flex; align-items: center; box-sizing: border-box; height: 22px; padding: 0 10px; border-radius: 11px; background: #fff; box-shadow: inset 0 0 0 1px var(--pc3-edge), 0 1px 2px rgba(28, 19, 15, 0.08); font: 400 13px/22px var(--sp-type) !important; color: #1c130f; white-space: nowrap; pointer-events: none; }\n"))),
  "E6": ("PC3-6: the wire paperclip's wrapper comes back on the card",
         lambda: rep(C + "QcCard154.tsx", "{quiet ? <span className=\"qc157-zz\"", "{mats ? <span className=\"qc154-clipw\" data-qc154=\"clip\" /> : null}\n      {quiet ? <span className=\"qc157-zz\"")),
  "E12": ("PC3-12: the hover's chips at 11px",
         lambda: append(C + "pc3tile.css", "\n.pc3-hov.pc3-hov .pc3-chip.pc3-chip { font-size: 11px !important; }\n")),
}
MUT.update({
  "S1": ("stageColours.test: the offer's stripes exported again",
         lambda: append("src/lib/stageColours.ts", "\nexport const OFFER_STRIPES = \"repeating-linear-gradient(118deg,#f6f0e5 0 22px,#f1d9cf 22px 44px,#d3deea 44px 66px)\";\n")),
  "S2": ("stageColours.test: the R&R stripes in the wrong order",
         lambda: rep("src/lib/stageColours.ts", "${STAGE_COLOURS.full.bandRequested} 0 22px,${STAGE_COLOURS.full.band} 22px 44px", "${STAGE_COLOURS.full.band} 0 22px,${STAGE_COLOURS.full.bandRequested} 22px 44px")),
  "S3": ("stageColours.test: Full requested back at v2's #dbe4ee",
         lambda: rep("src/lib/stageColours.ts", 'bandRequested: "#d3deea", tint: "#eff3f7"', 'bandRequested: "#dbe4ee", tint: "#eff3f7"')),
  "S4": ("pc3card.test: the label back on the band's left",
         lambda: rep("src/components/queries/centre/pc3card.css", "position: absolute; top: -4px; right: 21px;", "position: absolute; top: -4px; left: 21px;")),
  "S5": ("pc3card.test: the tile shown on every card",
         lambda: rep("src/components/queries/centre/QcCard154.tsx", "{mats ? <MatTile id={r.id} g={mats}", "{mats || true ? <MatTile id={r.id} g={mats ?? { count: 0, groups: [] }}")),
  "S6": ("pc3card.test: the frame stops clipping",
         lambda: append("src/components/queries/centre/pc3card.css", "\n.qc154-card .qc154-in { overflow: visible; }\n")),
  "S7": ("kindColours.test: the agent tile back at v1's",
         lambda: rep("src/lib/kindColours.ts", 'agent: { tile: "#96aca9", glyph: "#1c130f", edge: "#7c9793" },', 'agent: { tile: "#b0c1be", glyph: "#1c130f", edge: "#96aca9" },')),
  "S8": ("pc3card.test: the agency line back at 58%",
         lambda: rep("src/components/queries/centre/qcv154.css", "color: rgba(28, 19, 15, 0.66); white-space: nowrap;", "color: rgba(28, 19, 15, 0.58); white-space: nowrap;")),
})
RUNS = {"A": ["E1", "E5", "E7", "E9", "E10"], "B": ["E2", "E3", "E4", "E5b", "E8", "E11"], "C": ["E4b", "E6", "E12"]}
for k in RUNS.get(run, [run]):
    print(f"[{k}] {MUT[k][0]}")
    MUT[k][1]()
