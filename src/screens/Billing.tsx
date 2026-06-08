import { useEffect, useRef, useState } from "react";
import { IconCash } from "../icons";
import { useInvoices, useRecordPayment, useStats } from "../api/hooks";
import { Modal } from "../components/Modal";
import { PatientBillingHistory } from "../components/PatientBillingHistory";
import { SkeletonText, TableRowsSkeleton } from "../components/Skeleton";
import type { ApiInvoice, InvoiceStatus } from "../api/types";
import { money } from "../lib/money";

const STATUS_CHIP: Record<InvoiceStatus, string> = {
  Paid: "chip-confirmed",
  Partial: "chip-pending",
  Unpaid: "chip-inactive",
  Overdue: "chip-followup",
};


function PaymentModal({ invoice, onClose }: { invoice: ApiInvoice; onClose: () => void }) {
  const record = useRecordPayment();
  const [amount, setAmount] = useState(String(invoice.due.toFixed(0)));
  const [method, setMethod] = useState("Cash");
  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    await record.mutateAsync({ invoiceId: invoice.id, amount: amt, method });
    onClose();
  };
  return (
    <Modal
      title={`Record Payment · ${invoice.number}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={record.isPending}>Record Payment</button>
        </>
      }
    >
      <div style={{ color: "var(--ink-600)", marginBottom: 14 }}>
        {invoice.patientName} · Total {money(invoice.total)} · Due <strong style={{ color: "var(--navy-900)" }}>{money(invoice.due)}</strong>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label className="label">Amount</label>
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Method</label>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            {["Cash", "Card", "bKash", "Bank Transfer"].map((m) => (<option key={m}>{m}</option>))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

function SummaryCard({ label, value, accent, loading }: { label: string; value: string; accent?: boolean; loading?: boolean }) {
  return (
    <div className="card card-pad">
      <div className="eyebrow">{label}</div>
      {loading ? (
        <SkeletonText w={110} style={{ height: 22, marginTop: 12 }} />
      ) : (
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 28, marginTop: 6, color: accent ? "var(--danger-ink)" : "var(--navy-900)" }}>{value}</div>
      )}
    </div>
  );
}

function PatientBillingDrawer({
  patientId,
  patientName,
  onClose,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
}) {
  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 99 }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100%",
          width: 420,
          background: "var(--bg-card)",
          borderLeft: "1px solid var(--border-soft)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 20, borderBottom: "1px solid var(--border-soft)", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="h2">{patientName}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <PatientBillingHistory patientId={patientId} />
        </div>
      </div>
    </>
  );
}

const FILTERS: ("All" | InvoiceStatus)[] = ["All", "Unpaid", "Partial", "Paid", "Overdue"];

export function Billing({
  showToast,
  selectedInvoiceId,
  onInvoiceConsumed,
}: {
  showToast: (m: string) => void;
  selectedInvoiceId?: string | null;
  onInvoiceConsumed?: () => void;
}) {
  const [filter, setFilter] = useState<"All" | InvoiceStatus>("All");
  const [paying, setPaying] = useState<ApiInvoice | null>(null);
  const [drawerPatient, setDrawerPatient] = useState<{ id: string; name: string } | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const scrolledRef = useRef(false);
  const stats = useStats();
  const { data, isLoading } = useInvoices({ status: filter === "All" ? "" : filter });
  const list = data ?? [];

  // Deep-link from a patient's profile: highlight + scroll to that invoice once,
  // then clear it from the parent so re-visiting Billing doesn't re-trigger.
  useEffect(() => {
    if (!selectedInvoiceId) return;
    setHighlightId(selectedInvoiceId);
    setFilter("All"); // ensure the target row isn't filtered out
    scrolledRef.current = false;
    onInvoiceConsumed?.();
    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvoiceId]);

  return (
    <div className="page" data-screen-label="Billing">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
        <div>
          <h1 className="h1">Billing</h1>
          <div className="lede" style={{ fontSize: 16 }}>Invoices, payments and outstanding balances.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginTop: 28 }}>
        <SummaryCard label="Revenue (7 days)" value={stats.data ? money(stats.data.weeklyRevenue) : "—"} loading={stats.isPending} />
        <SummaryCard label="Outstanding" value={stats.data ? money(stats.data.outstanding) : "—"} accent loading={stats.isPending} />
        <SummaryCard label="Invoices" value={String(list.length)} loading={isLoading} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        {FILTERS.map((f) => (
          <button key={f} className="btn btn-sm" style={{ background: filter === f ? "var(--navy-900)" : "var(--bg-soft)", color: filter === f ? "white" : "var(--navy-900)", height: 34 }} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="dt-head" style={{ gridTemplateColumns: "1.2fr 1.8fr 1fr 1fr 1fr 1fr 1.2fr" }}>
          <div className="col">Invoice</div>
          <div className="col">Patient</div>
          <div className="col">Date</div>
          <div className="col">Total</div>
          <div className="col">Due</div>
          <div className="col">Status</div>
          <div className="col" style={{ textAlign: "right" }}>Actions</div>
        </div>
        {isLoading ? (
          <TableRowsSkeleton rows={6} cols={7} gridTemplateColumns="1.2fr 1.8fr 1fr 1fr 1fr 1fr 1.2fr" />
        ) : list.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: "var(--ink-500)", background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderTop: 0, borderRadius: "0 0 10px 10px" }}>
            <IconCash size={44} style={{ color: "var(--ink-300)", margin: "0 auto" }} />
            <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 16, marginTop: 10 }}>No invoices</div>
          </div>
        ) : (
          list.map((inv) => (
            <div
              key={inv.id}
              className={`dt-row${highlightId === inv.id ? " row-highlight" : ""}`}
              ref={(el) => {
                if (el && highlightId === inv.id && !scrolledRef.current) {
                  scrolledRef.current = true;
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              style={{ gridTemplateColumns: "1.2fr 1.8fr 1fr 1fr 1fr 1fr 1.2fr", cursor: "default" }}
            >
              <div style={{ fontFamily: "var(--font-b)", color: "var(--ink-600)", fontSize: 13 }}>{inv.number}</div>
              <div
                style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", cursor: "pointer" }}
                onClick={() => setDrawerPatient({ id: inv.patientId, name: inv.patientName })}
              >
                {inv.patientName}
              </div>
              <div style={{ color: "var(--ink-600)", fontSize: 14 }}>{inv.date?.label}</div>
              <div style={{ color: "var(--navy-900)", fontWeight: 600 }}>{money(inv.total)}</div>
              <div style={{ color: inv.due > 0 ? "var(--danger-ink)" : "var(--ink-500)", fontWeight: 600 }}>{money(inv.due)}</div>
              <div><span className={`chip ${STATUS_CHIP[inv.status]}`}>{inv.status}</span></div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {inv.due > 0 ? (
                  <button className="btn btn-soft btn-sm" onClick={() => setPaying(inv)}>Record Payment</button>
                ) : (
                  <span style={{ color: "var(--success-ink)", fontSize: 13, fontWeight: 600 }}>Settled</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {paying && <PaymentModal invoice={paying} onClose={() => { setPaying(null); showToast("Payment recorded."); }} />}
      {drawerPatient && (
        <PatientBillingDrawer
          patientId={drawerPatient.id}
          patientName={drawerPatient.name}
          onClose={() => setDrawerPatient(null)}
        />
      )}
    </div>
  );
}
