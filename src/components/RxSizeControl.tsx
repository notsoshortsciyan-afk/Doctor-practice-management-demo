import { RX_SCALE_OPTIONS, type RxScale } from "../lib/rxScale";

/**
 * Discreet S/M/L segmented control for the printed-Rx main-content text size.
 * Stateless — the caller owns the value (via `useRxScale`) so every mount stays
 * in sync and the choice persists across preview and reprint.
 */
export function RxSizeControl({
  scale,
  onChange,
}: {
  scale: RxScale;
  onChange: (s: RxScale) => void;
}) {
  return (
    <div className="rx-size" title="Prescription text size" aria-label="Prescription text size">
      <span className="rx-size-cap">Size</span>
      <div className="rx-size-seg">
        {RX_SCALE_OPTIONS.map((o) => (
          <button
            type="button"
            key={o.key}
            className={`rx-size-btn${scale === o.key ? " is-active" : ""}`}
            onClick={() => onChange(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
