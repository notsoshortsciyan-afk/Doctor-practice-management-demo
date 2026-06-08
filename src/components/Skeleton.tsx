import type { CSSProperties } from "react";

// A single shimmering placeholder block. Width/height accept any CSS length;
// numbers are treated as px. Used to compose screen-specific skeletons that
// mirror the real layout so there's no shift when data arrives.
export function Skeleton({
  w = "100%",
  h = 12,
  radius = 8,
  style,
}: {
  w?: number | string;
  h?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: radius, ...style }} />;
}

// One line of "text" — a thin bar, optionally narrower than full width.
export function SkeletonText({ w = "100%", style }: { w?: number | string; style?: CSSProperties }) {
  return <Skeleton w={w} h={12} radius={6} style={style} />;
}

// Mirrors the dashboard / billing StatCard (icon tile + label + big value + sub).
export function StatCardSkeleton() {
  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Skeleton w={44} h={44} radius={10} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SkeletonText w={90} />
        <Skeleton w={120} h={28} radius={6} />
        <SkeletonText w={140} />
      </div>
    </div>
  );
}

// Mirrors Dashboard's AppointmentRow (time · avatar · name/reason · chip · kebab).
export function AppointmentRowSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 56px 1fr auto auto",
        gap: 16,
        alignItems: "center",
        padding: "18px 24px",
        borderTop: "1px solid var(--border-soft)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SkeletonText w={44} />
        <SkeletonText w={28} />
      </div>
      <Skeleton w={40} h={40} radius={10} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SkeletonText w={160} />
        <SkeletonText w={220} />
      </div>
      <Skeleton w={72} h={22} radius={999} />
      <Skeleton w={20} h={20} radius={6} />
    </div>
  );
}

// Fills a `.dt-row` table body with placeholder rows that line up with the header.
// Pass the same `gridTemplateColumns` the screen uses for its rows.
export function TableRowsSkeleton({
  rows = 8,
  cols,
  gridTemplateColumns,
}: {
  rows?: number;
  cols: number;
  gridTemplateColumns: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="dt-row" style={{ gridTemplateColumns, cursor: "default" }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonText key={c} w={c === 0 ? "70%" : `${50 + ((c * 13) % 35)}%`} />
          ))}
        </div>
      ))}
    </>
  );
}
