import { useEffect, useRef, type ReactNode } from "react";
import { IconX } from "../icons";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ title, onClose, children, footer, width = 520 }: ModalProps) {
  // Only treat it as a backdrop click when the press both started AND ended on
  // the backdrop itself. A drag that begins inside an input (e.g. selecting
  // text) and releases on the dimmed area no longer closes the modal.
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedBackdrop.current) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3,15,40,.45)",
        backdropFilter: "blur(2px)",
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width, maxWidth: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 22px",
            borderBottom: "1px solid var(--border-soft)",
          }}
        >
          <h2 className="h2">{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 32, padding: 0 }}>
            <IconX size={18} />
          </button>
        </div>
        <div style={{ padding: 22, overflow: "auto" }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: "14px 22px",
              borderTop: "1px solid var(--border-soft)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
