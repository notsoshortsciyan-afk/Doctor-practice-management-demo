import { useState } from "react";
import {
  IconArrowRight,
  IconBadge,
  IconBeaker,
  IconCalendar,
  IconChevR,
  IconClipboard,
  IconDroplet,
  IconFile,
  IconHome,
  IconImage,
  IconMail,
  IconPhone,
  IconPlus,
  IconStetho,
  IconTooth,
  IconUser,
} from "../icons";
import { usePatient, useCreateNote } from "../api/hooks";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { PatientFormModal } from "../components/PatientFormModal";
import { Modal } from "../components/Modal";
import { RecordModal } from "../components/RecordModal";
import { PatientBillingHistory } from "../components/PatientBillingHistory";
import type { ApiNote, ApiPatient, ApiProcedure, ApiPrescription } from "../api/types";
import type { Route } from "../types";

function InfoBlock({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div style={{ borderRadius: 10, padding: 16, background: danger ? "var(--danger-bg)" : "var(--bg-soft)", border: danger ? "1px solid #F1B0B0" : "1px solid var(--border-soft)" }}>
      <div className="eyebrow" style={{ color: danger ? "var(--danger-ink)" : "var(--ink-500)", fontSize: 11 }}>{label}</div>
      <div style={{ marginTop: 6, color: danger ? "var(--danger-ink)" : "var(--navy-900)", fontWeight: danger ? 700 : 600, fontSize: 14, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

function ProcedureRow({ p }: { p: ApiProcedure }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "var(--bg-soft)", borderRadius: 10 }}>
      <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--navy-900)", color: "white", display: "grid", placeItems: "center" }}>
        {p.icon === "tooth" ? <IconTooth size={20} /> : p.icon === "scope" ? <IconBeaker size={20} /> : p.icon === "brush" ? <IconClipboard size={20} /> : <IconStetho size={20} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{p.proc}</div>
        <div style={{ color: "var(--ink-500)", fontSize: 13, marginTop: 2 }}>{p.desc}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 14 }}>{p.date}</div>
        <span className="chip chip-confirmed" style={{ marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10 }}>{p.outcome}</span>
      </div>
    </div>
  );
}

function ClinicalNoteCard({ n }: { n: ApiNote }) {
  return (
    <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border-soft)", borderRadius: 10, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{n.title}</div>
          <div style={{ color: "var(--ink-500)", fontSize: 13, marginTop: 2 }}>Dated: {n.date}</div>
        </div>
        {n.verified && (
          <div style={{ color: "var(--success-ink)" }} title="Verified"><IconBadge size={20} /></div>
        )}
      </div>
      <div style={{ marginTop: 10, color: "var(--ink-600)", fontSize: 14, lineHeight: 1.65, fontStyle: n.italic ? "italic" : "normal" }}>
        {n.italic ? `"${n.body}"` : n.body}
      </div>
    </div>
  );
}

function AddNoteModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const createNote = useCreateNote();
  const [title, setTitle] = useState("Clinical Observation");
  const [body, setBody] = useState("");
  const submit = async () => {
    if (!body.trim()) return;
    await createNote.mutateAsync({ patientId, title: title.trim() || "Clinical Note", body: body.trim(), verified: true });
    onClose();
  };
  return (
    <Modal
      title="Add Treatment Note"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={createNote.isPending}>{createNote.isPending ? "Saving…" : "Save Note"}</button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">Note</label>
        <textarea className="textarea" style={{ minHeight: 120 }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Observation, findings, plan…" />
      </div>
    </Modal>
  );
}

// Holds the page scaffold (header card + two-column body) while the bundle loads,
// instead of blanking the whole screen to a single line of text.
function PatientDetailSkeleton() {
  return (
    <div className="page" data-screen-label="03 Patient Detail">
      <div className="crumbs">
        <a>Dashboard</a>
        <IconChevR size={14} />
        <a>Patients</a>
      </div>

      <div className="card" style={{ marginTop: 8, padding: 24, display: "flex", alignItems: "center", gap: 24 }}>
        <Skeleton w={96} h={96} radius={12} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <Skeleton w={260} h={28} radius={6} />
          <div style={{ display: "flex", gap: 16 }}>
            <SkeletonText w={110} />
            <SkeletonText w={90} />
            <SkeletonText w={70} />
          </div>
          <Skeleton w={140} h={22} radius={999} />
        </div>
        <Skeleton w={110} h={40} radius={8} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start", marginTop: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SkeletonText w={180} />
            <SkeletonText />
            <SkeletonText w="85%" />
            <SkeletonText w="70%" />
          </div>
          <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SkeletonText w={150} />
            <Skeleton h={64} radius={10} />
            <Skeleton h={64} radius={10} />
          </div>
        </div>
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SkeletonText w={120} />
          <SkeletonText />
          <SkeletonText w="80%" />
          <SkeletonText w="60%" />
        </div>
      </div>
    </div>
  );
}

interface PatientDetailProps {
  go: (r: Route) => void;
  patientId: string | null;
  isDoctor: boolean;
  openInvoice?: (id: string) => void;
}

export function PatientDetail({ go, patientId, isDoctor, openInvoice }: PatientDetailProps) {
  const { data, isLoading, isError } = usePatient(patientId);
  const [editing, setEditing] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [selectedRx, setSelectedRx] = useState<ApiPrescription | null>(null);

  if (!patientId) {
    return (
      <div className="page">
        <div className="card card-pad" style={{ textAlign: "center" }}>
          <h2 className="h2">No patient selected</h2>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => go("directory")}>Go to Directory</button>
        </div>
      </div>
    );
  }
  if (isLoading) return <PatientDetailSkeleton />;
  if (isError || !data) return <div className="page"><div className="lede">Couldn't load this patient.</div></div>;

  const p: ApiPatient = data.patient;
  const initials = p.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="page" data-screen-label="03 Patient Detail">
      <div className="crumbs">
        <a onClick={() => go("dashboard")}>Dashboard</a>
        <IconChevR size={14} />
        <a onClick={() => go("directory")}>Patients</a>
        <IconChevR size={14} />
        <span className="active">{p.name}</span>
      </div>

      <div className="card" style={{ marginTop: 8, padding: 24, display: "flex", alignItems: "center", gap: 24 }}>
        <div className="placeholder-stripe" style={{ width: 96, height: 96, display: "grid", placeItems: "center", color: "var(--navy-900)", fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 28, position: "relative", flexShrink: 0 }}>
          {initials}
          <span style={{ position: "absolute", right: 4, bottom: 4, width: 16, height: 16, borderRadius: 999, background: "#2BB673", border: "3px solid var(--bg-card)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 32, margin: 0 }}>{p.name}</h1>
            <span className="chip" style={{ background: "var(--bg-soft)" }}>Number: {p.phone}</span>
            <span className="chip" style={{ background: "var(--bg-soft)" }}>ID: {p.code}</span>
          </div>
          <div style={{ display: "flex", gap: 20, color: "var(--ink-600)", fontSize: 14, marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><IconCalendar size={16} /> {p.age} years old</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><IconUser size={16} /> {p.gender}</div>
            {p.blood && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><IconDroplet size={16} /> {p.blood}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <span className={`chip ${p.status.chip}`}>{p.status.key} Patient</span>
            {isDoctor && p.allergies && p.allergies !== "None" && (
              <span className="chip" style={{ background: "var(--warn-bg)", color: "var(--warn-ink)" }}>{p.allergies}</span>
            )}
          </div>
        </div>
        <button className="btn btn-outline" onClick={() => setEditing(true)}>Edit Profile</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start", marginTop: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {isDoctor && (
            <div className="card card-pad">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy-900)", marginBottom: 16 }}>
                <IconClipboard size={20} />
                <h2 className="h2">Medical History</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <InfoBlock label="Conditions" value={p.conditions} />
                <InfoBlock label="Medications" value={p.medications} />
                <InfoBlock label="Allergies" value={p.allergies} danger={p.allergies.includes("Penicillin")} />
                <InfoBlock label="Last Visit" value={p.lastVisit?.label ?? "—"} />
              </div>
            </div>
          )}

          {isDoctor && (
            <div className="card card-pad">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy-900)", marginBottom: 16 }}>
                <IconTooth size={20} />
                <h2 className="h2">Past Procedures</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.procedures.length === 0 ? (
                  <div style={{ color: "var(--ink-500)", fontSize: 14 }}>No procedures recorded.</div>
                ) : (
                  data.procedures.map((pr, i) => <ProcedureRow key={i} p={pr} />)
                )}
              </div>
            </div>
          )}

          {isDoctor && (
            <div className="card card-pad">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy-900)" }}>
                  <IconFile size={20} />
                  <h2 className="h2">Clinical Notes</h2>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setAddingNote(true)}><IconPlus size={14} /> Add Treatment Note</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.notes.length === 0 ? (
                  <div style={{ color: "var(--ink-500)", fontSize: 14 }}>No clinical notes yet.</div>
                ) : (
                  data.notes.map((n) => <ClinicalNoteCard key={n.id} n={n} />)
                )}
              </div>
            </div>
          )}

          {isDoctor && (
            <div className="card card-pad">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy-900)", marginBottom: 16 }}>
                <IconClipboard size={20} />
                <h2 className="h2">Prescription History</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.prescriptions.length === 0 ? (
                  <div style={{ color: "var(--ink-500)", fontSize: 14 }}>No prescriptions yet.</div>
                ) : (
                  data.prescriptions.map((rx) => (
                    <div key={rx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "var(--bg-soft)", borderRadius: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "var(--navy-900)", fontWeight: 600, fontSize: 13 }}>{rx.date?.label}</div>
                        <div style={{ color: "var(--ink-500)", fontSize: 12, marginTop: 2 }}>{rx.diagnosis || "—"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ background: "var(--navy-900)", color: "white", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{rx.meds.length} medicine{rx.meds.length !== 1 ? "s" : ""}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRx(rx)}>View</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {!isDoctor && (
            <div className="card card-pad">
              <h2 className="h2" style={{ marginBottom: 8 }}>Front-desk view</h2>
              <div style={{ color: "var(--ink-500)", fontSize: 14 }}>
                Clinical history, procedures and prescriptions are visible to the doctor. You can manage contact details, appointments and billing.
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card-dark" style={{ borderRadius: 14, padding: 24 }}>
            <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 18 }}>Patient Overview</div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <Row label="Last Visit" value={p.lastVisit?.label ?? "—"} />
              <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,.85)" }}>
                <span>Next Appt</span>
                <span style={{ color: "var(--accent-yellow)", fontWeight: 700 }}>{p.nextAppt?.label ?? "—"}</span>
              </div>
              <Row label="Balance Due" value={p.balance} />
              {isDoctor && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "rgba(255,255,255,.85)" }}>
                  <span>Risk Level</span>
                  <span style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: p.risk === "HIGH" ? "rgba(255,110,110,.18)" : p.risk === "MED" ? "rgba(253,192,3,.18)" : "rgba(43,182,115,.18)", color: p.risk === "HIGH" ? "#FF6E6E" : p.risk === "MED" ? "#FDC003" : "#7CE0A2", letterSpacing: ".06em" }}>{p.risk}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card card-pad">
            <div className="h2" style={{ marginBottom: 16 }}>Contact Details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <ContactRow icon={<IconPhone size={16} />} label="Primary Phone" value={p.phone} />
              <ContactRow icon={<IconMail size={16} />} label="Email Address" value={p.email || "—"} />
              <ContactRow icon={<IconHome size={16} />} label="Address" value={p.address || "—"} />
            </div>
          </div>

          <div className="card card-pad">
            <div className="h2" style={{ marginBottom: 16 }}>Billing &amp; Payments</div>
            <PatientBillingHistory patientId={p.id} onOpenInvoice={openInvoice} />
          </div>

          <div className="card card-pad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="h2">X-Rays & Photos</div>
              <button className="btn btn-ghost btn-sm">View Gallery <IconArrowRight size={14} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {(data.documents.length ? data.documents.slice(0, 6) : [1, 2, 3, 4, 5, 6]).map((_, i) => (
                <div key={i} className="placeholder-stripe" style={{ aspectRatio: "1 / 1", borderRadius: 8, display: "grid", placeItems: "center", color: "var(--ink-500)" }}>
                  <IconImage size={20} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <PatientFormModal patient={p} isDoctor={isDoctor} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
      )}
      {addingNote && <AddNoteModal patientId={p.id} onClose={() => setAddingNote(false)} />}
      {selectedRx && <RecordModal rx={selectedRx} onClose={() => setSelectedRx(null)} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,.85)" }}>
      <span>{label}</span>
      <span style={{ color: "white", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-soft)", display: "grid", placeItems: "center", color: "var(--navy-900)" }}>{icon}</div>
      <div>
        <div style={{ color: "var(--ink-500)", fontSize: 12 }}>{label}</div>
        <div style={{ color: "var(--navy-900)", fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  );
}
