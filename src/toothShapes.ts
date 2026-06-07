// Anatomical tooth silhouettes for the FDI odontogram.
//
// Each glyph is drawn in a normalized, *crown-up* coordinate space
// (viewBox 0 0 36 64): crown near the top, root tapering to the bottom.
// The chart renders the upper arch by flipping the glyph vertically (so crowns
// face the occlusal midline) and keeps the lower arch as-is. Shapes are drawn
// symmetric, so no left/right mirroring is needed.
//
// The layered crown / root / occlusal-detail approach (for a soft 3D look)
// is adapted from the MIT-licensed react-odontogram
// (https://github.com/biomathcode/react-odontogram).

export const TOOTH_VB = { w: 36, h: 64 } as const;

export type ToothType =
  | "centralIncisor"
  | "lateralIncisor"
  | "canine"
  | "firstPremolar"
  | "secondPremolar"
  | "firstMolar"
  | "secondMolar"
  | "thirdMolar";

export interface ToothGlyph {
  /** Crown silhouette (filled with enamel / condition tint). */
  crown: string;
  /** Root silhouette (filled slightly darker than the crown). */
  root: string;
  /** Thin cusp / cervical detail, stroked only. */
  occlusal: string;
  type: ToothType;
}

// FDI second digit (1..8) → anatomical tooth type.
export function fdiType(num: number): ToothType {
  switch (num % 10) {
    case 1: return "centralIncisor";
    case 2: return "lateralIncisor";
    case 3: return "canine";
    case 4: return "firstPremolar";
    case 5: return "secondPremolar";
    case 6: return "firstMolar";
    case 7: return "secondMolar";
    default: return "thirdMolar";
  }
}

// ---- geometry constants (normalized crown-up space) ----
const CX = 18;        // midline
const TOP = 5;        // incisal / occlusal edge
const NECK = 27;      // cervical line (crown ↔ root)
const APEX = 60;      // root tip
const SHOULDER = 16;  // y where the crown is widest

type Incisal = "flat" | "round" | "point" | "bicusp" | "multicusp";

interface Spec {
  crownHalf: number;
  neckHalf: number;
  rootHalf: number;
  incisal: Incisal;
  roots: 1 | 2;
}

const SPECS: Record<ToothType, Spec> = {
  centralIncisor: { crownHalf: 11,  neckHalf: 7,    rootHalf: 5.5, incisal: "flat",      roots: 1 },
  lateralIncisor: { crownHalf: 9,   neckHalf: 6,    rootHalf: 5,   incisal: "round",     roots: 1 },
  canine:         { crownHalf: 10,  neckHalf: 6.5,  rootHalf: 5.5, incisal: "point",     roots: 1 },
  firstPremolar:  { crownHalf: 10.5, neckHalf: 8,   rootHalf: 6,   incisal: "bicusp",    roots: 1 },
  secondPremolar: { crownHalf: 10,  neckHalf: 8,    rootHalf: 6,   incisal: "bicusp",    roots: 1 },
  firstMolar:     { crownHalf: 14,  neckHalf: 11,   rootHalf: 9,   incisal: "multicusp", roots: 2 },
  secondMolar:    { crownHalf: 13,  neckHalf: 10.5, rootHalf: 9,   incisal: "multicusp", roots: 2 },
  thirdMolar:     { crownHalf: 12,  neckHalf: 10,   rootHalf: 8,   incisal: "multicusp", roots: 2 },
};

const r = (n: number) => Math.round(n * 10) / 10;

function incisalEdge(L: number, R: number, half: number, incisal: Incisal): string {
  // Travels from the left incisal corner (L, TOP+4) to the right (R, TOP+4).
  switch (incisal) {
    case "flat":
      return `Q ${CX} ${TOP - 1.5} ${R} ${TOP + 4} `;
    case "round":
      return `Q ${CX} ${TOP - 3} ${R} ${TOP + 4} `;
    case "point": // canine cusp tip
      return `L ${CX} ${TOP - 4} L ${R} ${TOP + 4} `;
    case "bicusp": // buccal + lingual cusp with a central groove
      return (
        `Q ${r(CX - half * 0.5)} ${TOP - 3} ${CX} ${TOP + 3} ` +
        `Q ${r(CX + half * 0.5)} ${TOP - 3} ${R} ${TOP + 4} `
      );
    case "multicusp": // 3–4 rounded cusps
      return (
        `Q ${r(L + half * 0.4)} ${TOP - 2} ${r(CX - half * 0.33)} ${TOP + 3} ` +
        `Q ${CX} ${TOP - 3} ${r(CX + half * 0.33)} ${TOP + 3} ` +
        `Q ${r(R - half * 0.4)} ${TOP - 2} ${R} ${TOP + 4} `
      );
  }
}

function crownPath(s: Spec): string {
  const L = CX - s.crownHalf;
  const R = CX + s.crownHalf;
  const nL = CX - s.neckHalf;
  const nR = CX + s.neckHalf;
  return (
    `M ${r(nL)} ${NECK} ` +
    `C ${r(L - 0.5)} ${SHOULDER + 4} ${r(L)} ${TOP + 9} ${r(L)} ${TOP + 4} ` + // left wall
    incisalEdge(L, R, s.crownHalf, s.incisal) +
    `C ${r(R)} ${TOP + 9} ${r(R + 0.5)} ${SHOULDER + 4} ${r(nR)} ${NECK} ` +   // right wall
    `Z`
  );
}

function rootPath(s: Spec): string {
  const nL = CX - s.neckHalf;
  const nR = CX + s.neckHalf;
  if (s.roots === 1) {
    return (
      `M ${r(nL)} ${NECK} ` +
      `C ${r(CX - s.rootHalf)} ${NECK + 14} ${CX - 1.5} ${APEX - 6} ${CX} ${APEX} ` +
      `C ${CX + 1.5} ${APEX - 6} ${r(CX + s.rootHalf)} ${NECK + 14} ${r(nR)} ${NECK} ` +
      `Z`
    );
  }
  // Two splayed roots with a central furcation notch.
  return (
    `M ${r(nL)} ${NECK} ` +
    `C ${r(nL - 1)} ${NECK + 16} ${CX - 8} ${APEX - 8} ${CX - 7} ${APEX - 2} ` +
    `C ${CX - 6.5} ${APEX} ${CX - 5.5} ${APEX} ${CX - 5} ${APEX - 3} ` +
    `C ${CX - 4} ${NECK + 18} ${CX - 2.5} ${NECK + 12} ${CX} ${NECK + 11} ` +
    `C ${CX + 2.5} ${NECK + 12} ${CX + 4} ${NECK + 18} ${CX + 5} ${APEX - 3} ` +
    `C ${CX + 5.5} ${APEX} ${CX + 6.5} ${APEX} ${CX + 7} ${APEX - 2} ` +
    `C ${CX + 8} ${APEX - 8} ${r(nR + 1)} ${NECK + 16} ${r(nR)} ${NECK} ` +
    `Z`
  );
}

function occlusalPath(s: Spec): string {
  const nL = CX - s.neckHalf;
  const nR = CX + s.neckHalf;
  // Cervical "smile" at the crown/root junction (all teeth).
  let d = `M ${r(nL + 1)} ${NECK - 0.5} Q ${CX} ${NECK + 2.5} ${r(nR - 1)} ${NECK - 0.5} `;
  // Occlusal groove ticks for posterior teeth.
  if (s.incisal === "bicusp") {
    d += `M ${CX} ${TOP + 5} L ${CX} ${TOP + 11} `;
  } else if (s.incisal === "multicusp") {
    d += `M ${CX} ${TOP + 5} L ${CX} ${TOP + 12} `;
    d += `M ${r(CX - s.crownHalf * 0.34)} ${TOP + 6} L ${r(CX - s.crownHalf * 0.34)} ${TOP + 11} `;
    d += `M ${r(CX + s.crownHalf * 0.34)} ${TOP + 6} L ${r(CX + s.crownHalf * 0.34)} ${TOP + 11} `;
  }
  return d.trim();
}

const CACHE = new Map<ToothType, ToothGlyph>();

export function toothGlyph(num: number): ToothGlyph {
  const type = fdiType(num);
  let g = CACHE.get(type);
  if (!g) {
    const s = SPECS[type];
    g = { type, crown: crownPath(s), root: rootPath(s), occlusal: occlusalPath(s) };
    CACHE.set(type, g);
  }
  return g;
}
