import { IconPrint } from "../icons";
import { Modal } from "./Modal";
import { RxDocument, rxDataFromApi } from "./RxDocument";
import { RxSizeControl } from "./RxSizeControl";
import { useRxScale } from "../lib/rxScale";
import type { ApiPrescription } from "../api/types";

export function RecordModal({ rx, onClose }: { rx: ApiPrescription; onClose: () => void }) {
  const [scale, setScale] = useRxScale();
  return (
    <Modal
      title="Prescription Record"
      onClose={onClose}
      width={680}
      footer={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 12 }}>
          <RxSizeControl scale={scale} onChange={setScale} />
          <button className="btn btn-primary" onClick={() => window.print()}><IconPrint size={16} /> Print</button>
        </div>
      }
    >
      {/* Same document as the live preview, so a reprint is pixel-identical. */}
      <div className="rx-print-root">
        <RxDocument data={rxDataFromApi(rx)} scale={scale} />
      </div>
    </Modal>
  );
}
