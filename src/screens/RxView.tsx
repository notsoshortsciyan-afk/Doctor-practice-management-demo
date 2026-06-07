import { IconPrint } from "../icons";
import { RxDocument, rxDataFromApi } from "../components/RxDocument";
import { RxSizeControl } from "../components/RxSizeControl";
import { useRxScale } from "../lib/rxScale";
import { usePrescription } from "../api/hooks";

/**
 * Standalone, printable view of a single prescription. Opened in a new tab via
 * `#rx/<id>` (e.g. from the New Entry "View History" list) so reading a past Rx
 * never disturbs an in-progress entry in the original tab.
 */
export function RxView({ id }: { id: string | null }) {
  const [scale, setScale] = useRxScale();
  const { data: rx, isLoading, error } = usePrescription(id);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 24px 60px" }}>
      <div
        className="rx-print-hide"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}
      >
        <RxSizeControl scale={scale} onChange={setScale} />
        <button className="btn btn-primary" onClick={() => window.print()} disabled={!rx}>
          <IconPrint size={16} /> Print
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", color: "var(--ink-500)", paddingTop: 60 }}>Loading prescription…</div>
      ) : error || !rx ? (
        <div style={{ textAlign: "center", color: "var(--ink-500)", paddingTop: 60 }}>Prescription not found.</div>
      ) : (
        <div className="rx-print-root">
          <RxDocument data={rxDataFromApi(rx)} scale={scale} />
        </div>
      )}
    </div>
  );
}
