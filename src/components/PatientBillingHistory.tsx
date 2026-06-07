import { useInvoices } from "../api/hooks";
import type { InvoiceStatus } from "../api/types";
import { money } from "../lib/money";

const STATUS_CHIP: Record<InvoiceStatus, string> = {
  Paid: "chip-confirmed",
  Partial: "chip-pending",
  Unpaid: "chip-inactive",
  Overdue: "chip-followup",
};

/**
 * Full billing & payment history for one patient. Fetches its own complete
 * invoice set (unfiltered) so totals are accurate. Reused by the Billing
 * drawer and the patient profile.
 */
export function PatientBillingHistory({
  patientId,
  onOpenInvoice,
}: {
  patientId: string;
  onOpenInvoice?: (id: string) => void;
}) {
  const { data, isLoading } = useInvoices({ patientId });
  const invoices = data ?? [];
  const totalPaid = invoices.reduce((s, inv) => s + inv.paid, 0);
  const totalOutstanding = invoices.reduce((s, inv) => s + inv.due, 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ background: "var(--bg-soft)", padding: 8, borderRadius: 6, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--ink-500)" }}>Total Paid</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy-900)", marginTop: 4 }}>{money(totalPaid)}</div>
        </div>
        <div style={{ background: "var(--danger-bg)", padding: 8, borderRadius: 6, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--ink-500)" }}>Outstanding</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--danger-ink)", marginTop: 4 }}>{money(totalOutstanding)}</div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", color: "var(--ink-500)", paddingTop: 24 }}>Loading…</div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--ink-500)", paddingTop: 24 }}>No invoices yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className={onOpenInvoice ? "bill-history-item" : undefined}
              onClick={onOpenInvoice ? () => onOpenInvoice(inv.id) : undefined}
              title={onOpenInvoice ? "Open in Billing" : undefined}
              style={{ padding: 12, background: "var(--bg-soft)", borderRadius: 8, cursor: onOpenInvoice ? "pointer" : "default" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--navy-900)", fontSize: 13 }}>{inv.number}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>{inv.date?.label}</div>
                </div>
                <span className={`chip ${STATUS_CHIP[inv.status]}`} style={{ fontSize: 10 }}>{inv.status}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 8, borderTop: "1px solid var(--border-soft)", paddingTop: 8 }}>
                <span style={{ color: "var(--ink-500)" }}>Total:</span>
                <span style={{ color: "var(--navy-900)", fontWeight: 600 }}>{money(inv.total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                <span style={{ color: "var(--ink-500)" }}>Paid:</span>
                <span style={{ color: "var(--success-ink)", fontWeight: 600 }}>{money(inv.paid)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                <span style={{ color: "var(--ink-500)" }}>Due:</span>
                <span style={{ color: inv.due > 0 ? "var(--danger-ink)" : "var(--ink-500)", fontWeight: 600 }}>{money(inv.due)}</span>
              </div>
              {inv.payments.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-soft)", fontSize: 11 }}>
                  <div style={{ color: "var(--ink-500)", marginBottom: 6, fontWeight: 600 }}>Payments:</div>
                  {inv.payments.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-600)", marginBottom: 3 }}>
                      <span>{p.date?.label} · {p.method}</span>
                      <span style={{ fontWeight: 600 }}>{money(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
