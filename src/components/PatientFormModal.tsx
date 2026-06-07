import { useState } from "react";
import { Modal } from "./Modal";
import { useSavePatient } from "../api/hooks";
import { ApiError } from "../api/client";
import type { ApiPatient } from "../api/types";

interface Props {
  patient?: ApiPatient | null;
  isDoctor: boolean;
  onClose: () => void;
  onSaved: (id?: string) => void;
}

export function PatientFormModal({ patient, isDoctor, onClose, onSaved }: Props) {
  const save = useSavePatient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: patient?.name ?? "",
    phone: patient?.phone ?? "",
    email: patient?.email ?? "",
    age: patient ? String(patient.age) : "",
    gender: patient?.gender ?? "Female",
    blood: patient?.blood ?? "",
    status: patient?.status.key ?? "Active",
    risk: patient?.risk ?? "LOW",
    conditions: patient?.conditions ?? "",
    allergies: patient?.allergies ?? "",
    medications: patient?.medications ?? "",
    address: patient?.address ?? "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setError(null);
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone are required.");
      return;
    }
    try {
      const result = await save.mutateAsync({
        id: patient?.id,
        data: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          age: Number(form.age) || 0,
          gender: form.gender,
          blood: form.blood || null,
          status: form.status,
          risk: form.risk,
          conditions: form.conditions,
          allergies: form.allergies,
          medications: form.medications,
          address: form.address,
        },
      });
      onSaved((result as ApiPatient | undefined)?.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save patient.");
    }
  };

  return (
    <Modal
      title={patient ? "Edit Patient" : "Register New Patient"}
      onClose={onClose}
      width={620}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Saving…" : patient ? "Save Changes" : "Register Patient"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="field">
          <label className="label">Full Name</label>
          <input className="input" value={form.name} onChange={set("name")} placeholder="Jane Doe" />
        </div>
        <div className="field">
          <label className="label">Contact Number</label>
          <input className="input" value={form.phone} onChange={set("phone")} placeholder="01XXXXXXXXX" />
        </div>
        <div className="field">
          <label className="label">Email</label>
          <input className="input" value={form.email} onChange={set("email")} placeholder="jane@email.com" />
        </div>
        <div className="field">
          <label className="label">Age / Gender</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
            <input className="input" value={form.age} onChange={set("age")} placeholder="Age" />
            <select className="select" value={form.gender} onChange={set("gender")}>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label className="label">Blood Group</label>
          <select className="select" value={form.blood} onChange={set("blood")}>
            <option value="">— Not set —</option>
            {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Status</label>
          <select className="select" value={form.status} onChange={set("status")}>
            {["Active", "Follow-up", "Inactive", "Pending"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={set("address")} placeholder="Street, City" />
        </div>

        {isDoctor && (
          <>
            <div className="field">
              <label className="label">Risk Level</label>
              <select className="select" value={form.risk} onChange={set("risk")}>
                {["LOW", "MED", "HIGH"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Allergies</label>
              <input className="input" value={form.allergies} onChange={set("allergies")} placeholder="Penicillin…" />
            </div>
            <div className="field">
              <label className="label">Conditions</label>
              <input className="input" value={form.conditions} onChange={set("conditions")} placeholder="Hypertension…" />
            </div>
            <div className="field">
              <label className="label">Medications</label>
              <input className="input" value={form.medications} onChange={set("medications")} placeholder="Lisinopril 5mg…" />
            </div>
          </>
        )}
      </div>
      {error && (
        <div style={{ marginTop: 14, background: "var(--danger-bg)", color: "var(--danger-ink)", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
