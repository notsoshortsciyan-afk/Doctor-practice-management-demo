import { useId } from "react";
import type { ToothCondition, ToothSelection } from "./types";
import { toothGlyph } from "./toothShapes";

export const FDI = {
  upperR: [18, 17, 16, 15, 14, 13, 12, 11],
  upperL: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerL: [31, 32, 33, 34, 35, 36, 37, 38],
  lowerR: [48, 47, 46, 45, 44, 43, 42, 41],
} as const;

// Shared condition palette — imported by NewEntry (mode buttons) and the Rx legend
// so the colors stay in lock-step with the chart.
export const CONDITION_META: Record<ToothCondition, { color: string; tint: string; label: string }> = {
  issue:   { color: "#FF6B6B", tint: "#FFE2E2", label: "Issue" },
  caries:  { color: "#FDC003", tint: "#FFF1C2", label: "Caries" },
  extract: { color: "#F21200", tint: "#FFD6D1", label: "Extract" },
};

// Box the 36×64 glyph viewBox renders into. The full size is tuned so the whole
// grid (16 teeth + gaps + midline) fits inside the Dental Chart's gray panel with
// even padding all around — see the width math in NewEntry's chart card.
const BOX = { full: { w: 27, h: 49 }, mini: { w: 15, h: 27 } };
const GAP = { full: 2, mini: 2 };
const SPACER = { full: 12, mini: 6 };

interface ToothProps {
  num: number;
  upper: boolean;
  condition?: ToothCondition;
  onClick: () => void;
  mini: boolean;
  gradId: string;
}

function Tooth({ num, upper, condition, onClick, mini, gradId }: ToothProps) {
  const g = toothGlyph(num);
  const box = mini ? BOX.mini : BOX.full;
  const sel = !!condition;
  const meta = condition ? CONDITION_META[condition] : null;

  const crownFill = meta ? meta.tint : `url(#${gradId})`;
  const edge = meta ? meta.color : "#b7c0d6";
  const rootFill = meta ? meta.tint : "#edf0f7";

  return (
    <svg
      className={`tooth ${sel ? "selected" : ""} ${mini ? "tooth--mini" : ""}`}
      width={box.w}
      height={box.h}
      viewBox={`0 0 36 64`}
      onClick={onClick}
    >
      {/* Upper arch: flip so crowns face the occlusal midline. */}
      <g transform={upper ? "translate(0,64) scale(1,-1)" : undefined}>
        <path d={g.root} fill={rootFill} stroke={edge} strokeWidth={0.8} strokeLinejoin="round" opacity={0.95} />
        <path d={g.crown} fill={crownFill} stroke={edge} strokeWidth={sel ? 1.4 : 1.1} strokeLinejoin="round" />
        <path d={g.occlusal} fill="none" stroke={meta ? meta.color : "#c2cbdd"} strokeWidth={0.7} strokeLinecap="round" opacity={sel ? 0.8 : 0.6} />
        {/* enamel gloss highlight */}
        <ellipse cx={14.5} cy={14} rx={4.6} ry={4} fill="#ffffff" opacity={sel ? 0.28 : 0.5} />
      </g>
    </svg>
  );
}

function NumberRow({
  left,
  right,
  selected,
  mini,
}: {
  left: readonly number[];
  right: readonly number[];
  selected: ToothSelection;
  mini: boolean;
}) {
  const w = mini ? BOX.mini.w : BOX.full.w;
  const cell = (n: number) => {
    const cond = selected[n];
    const meta = cond ? CONDITION_META[cond] : null;
    return (
      <span
        key={n}
        className="tnum"
        style={{ width: w, color: meta ? meta.color : undefined, fontWeight: meta ? 700 : undefined }}
      >
        {n % 10}
      </span>
    );
  };
  return (
    <div className="tooth-row tnum-row" style={{ gap: mini ? GAP.mini : GAP.full }}>
      {left.map(cell)}
      <div style={{ width: mini ? SPACER.mini : SPACER.full }} />
      {right.map(cell)}
    </div>
  );
}

interface ToothChartProps {
  selected: ToothSelection;
  setSelected: (updater: (prev: ToothSelection) => ToothSelection) => void;
  mini?: boolean;
  mode?: ToothCondition;
}

export function ToothChart({ selected, setSelected, mini = false, mode = "issue" }: ToothChartProps) {
  const uid = useId().replace(/[:]/g, "");
  const gradId = `enamel-${uid}`;
  const sel = selected || {};

  const toggle = (n: number) => {
    if (mini) return;
    setSelected((s) => {
      const ns = { ...s };
      if (ns[n] === mode) delete ns[n]; // clicking the active mode again clears it
      else ns[n] = mode; // unset OR a different condition → (re)assign to active mode
      return ns;
    });
  };

  const row = (nums: readonly number[], upper: boolean) =>
    nums.map((n) => (
      <Tooth key={n} num={n} upper={upper} condition={sel[n]} onClick={() => toggle(n)} mini={mini} gradId={gradId} />
    ));

  const QuadLabels = ({ a, b }: { a: string; b: string }) => (
    <div className="tooth-quad-labels">
      <span>{a}</span>
      <span>{b}</span>
    </div>
  );

  return (
    <div className={`tooth-chart-wrap ${mini ? "tooth-chart-wrap--mini" : ""}`}>
      {/* one shared enamel gradient per chart instance */}
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden focusable="false">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#f2f5fb" />
            <stop offset="1" stopColor="#e2e8f4" />
          </linearGradient>
        </defs>
      </svg>

      {!mini && <QuadLabels a="Upper · Right" b="Upper · Left" />}
      <NumberRow left={FDI.upperR} right={FDI.upperL} selected={sel} mini={mini} />

      <div className="tooth-row" style={{ gap: mini ? GAP.mini : GAP.full }}>
        {row(FDI.upperR, true)}
        <div style={{ width: mini ? SPACER.mini : SPACER.full }} />
        {row(FDI.upperL, true)}
      </div>

      <div className="tooth-row tooth-row--lower" style={{ gap: mini ? GAP.mini : GAP.full }}>
        {row(FDI.lowerR, false)}
        <div style={{ width: mini ? SPACER.mini : SPACER.full }} />
        {row(FDI.lowerL, false)}
      </div>

      <NumberRow left={FDI.lowerR} right={FDI.lowerL} selected={sel} mini={mini} />
      {!mini && <QuadLabels a="Lower · Right" b="Lower · Left" />}
    </div>
  );
}

// FDI number → quadrant-prefixed Palmer label (e.g. 16 → "UR6"). Quadrant codes follow the
// facing-patient convention (1 upper-right, 2 upper-left, 3 lower-left, 4 lower-right).
const QUAD = { 1: "UR", 2: "UL", 3: "LL", 4: "LR" } as const;
export function fdiLabel(n: number): string {
  return `${QUAD[Math.floor(n / 10) as 1 | 2 | 3 | 4]}${n % 10}`;
}

export function selectedToothLabels(sel: ToothSelection): number[] {
  return Object.keys(sel || {})
    .map(Number)
    .sort((a, b) => a - b);
}

// Teeth grouped by condition, each list sorted — used by the Rx legend.
export function groupToothLabels(sel: ToothSelection): Record<ToothCondition, number[]> {
  const groups: Record<ToothCondition, number[]> = { issue: [], caries: [], extract: [] };
  for (const [k, v] of Object.entries(sel || {})) {
    const cond = v as ToothCondition;
    if (groups[cond]) groups[cond].push(Number(k));
  }
  (Object.keys(groups) as ToothCondition[]).forEach((k) => groups[k].sort((a, b) => a - b));
  return groups;
}
