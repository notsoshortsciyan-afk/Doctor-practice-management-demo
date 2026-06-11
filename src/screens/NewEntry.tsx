import { useState, useEffect } from "react";
import {
  IconChevR,
  IconClipboard,
  IconPlus,
  IconPrint,
  IconTooth,
  IconTrash,
  IconUser,
} from "../icons";
import { TESTS } from "../data";
import { ToothChart, CONDITION_META } from "../ToothChart";
import { RxDocument, rxDataFromForm } from "../components/RxDocument";
import { usePatients, useCreatePrescription, usePrescriptions, useUpdatePatient } from "../api/hooks";
import { ApiError } from "../api/client";
import { Modal } from "../components/Modal";
import { Dropdown, type DropdownOption } from "../components/Dropdown";
import { RxSizeControl } from "../components/RxSizeControl";
import { useRxScale } from "../lib/rxScale";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import type {
  EntryForm,
  Medicine,
  Route,
  ToothCondition,
  ToothSelection,
} from "../types";

// Frequency = "how many times a day" (dose schedule). Stored as-is in `dose`.
const FREQUENCY_OPTIONS: DropdownOption[] = [
  { value: "1-0-1 (BID)", label: "1-0-1 · Twice daily (BID)" },
  { value: "1-1-1 (TID)", label: "1-1-1 · Thrice daily (TID)" },
  { value: "1-1-1-1 (QID)", label: "1-1-1-1 · Four times (QID)" },
  { value: "1-0-0 (Morning)", label: "1-0-0 · Morning" },
  { value: "0-1-0 (Midday)", label: "0-1-0 · Midday" },
  { value: "0-0-1 (Night)", label: "0-0-1 · Night" },
  { value: "SOS (As needed)", label: "SOS · As needed" },
];

// Duration = "for how many days". Stored as-is in `days`.
const DURATION_OPTIONS: DropdownOption[] = ["3", "5", "7", "10", "14", "30"].map((d) => ({
  value: d,
  label: `${d} days`,
}));

interface MedRowProps {
  med: Medicine;
  onChange: (m: Medicine) => void;
  onRemove: () => void;
  removable: boolean;
  autoFocusName: boolean;
}

function MedRow({ med, onChange, onRemove, removable, autoFocusName }: MedRowProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr .9fr 36px", gap: 8, alignItems: "center" }}>
      <input
        className="input"
        placeholder="Medicine name (e.g., Amoxicillin 500mg)"
        value={med.name}
        autoFocus={autoFocusName}
        onChange={(e) => onChange({ ...med, name: e.target.value })}
      />
      <Dropdown
        value={med.dose}
        options={FREQUENCY_OPTIONS}
        onChange={(v) => onChange({ ...med, dose: v })}
        placeholder="Frequency"
        allowCustom
      />
      <Dropdown
        value={med.days}
        options={DURATION_OPTIONS}
        onChange={(v) => onChange({ ...med, days: v })}
        placeholder="Duration"
        allowCustom
        customLabel="Custom days…"
      />
      {removable ? (
        <button className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0, color: "var(--danger-ink)" }} onClick={onRemove}>
          <IconTrash size={16} />
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}

const TREATMENT_SUGGESTIONS = [
  "Scaling & Polishing", "Composite Filling", "Root Canal Treatment", "Tooth Extraction",
  "Crown Preparation", "Crown Cementation", "Denture Adjustment", "Pulpectomy",
  "Fluoride Application", "Orthodontic Adjustment", "Implant Consultation", "Whitening",
];

interface NewEntryProps {
  go: (r: Route) => void;
  showToast: (msg: string) => void;
}

const EMPTY_FORM: EntryForm = {
  name: "", phone: "", id: "", age: "", gender: "",
  complaint: "", observation: "", diagnosis: "", treatment: "", advice: "",
  tests: [], meds: [{ name: "", dose: "1-0-1 (BID)", days: "5" }],
};

function PrescriptionHistoryModal({
  patientId,
  onClose,
}: {
  patientId: string;
  onClose: () => void;
}) {
  const { data } = usePrescriptions({ patientId, limit: 20 });
  const rxList = data ?? [];

  return (
    <Modal title="Prescription History" onClose={onClose} width={800}>
      {rxList.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-500)" }}>No prescriptions found</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, color: "var(--ink-400)" }}>
            Click any entry to open the full prescription in a new tab.
          </div>
          {rxList.map((rx) => (
            <a
              key={rx.id}
              href={`#rx/${rx.id}`}
              target="_blank"
              rel="noopener"
              className="rx-history-item"
              style={{
                display: "block",
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--border-soft)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--navy-900)" }}>{rx.date?.label}</div>
                  {rx.diagnosis && (
                    <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 2 }}>{rx.diagnosis}</div>
                  )}
                  {rx.meds.length > 0 && (
                    <div style={{ fontSize: 12, color: "var(--ink-600)", marginTop: 6 }}>
                      {rx.meds.map((m) => m.name).filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
                <span style={{ flexShrink: 0, background: "var(--bg-soft)", padding: "4px 8px", borderRadius: 4, color: "var(--ink-600)", fontSize: 13 }}>
                  {rx.meds.length} medicine{rx.meds.length !== 1 ? "s" : ""}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function NewEntry({ go, showToast }: NewEntryProps) {
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
  const [teeth, setTeeth] = useState<ToothSelection>({});
  const [toothMode, setToothMode] = useState<ToothCondition>("issue");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [medFocus, setMedFocus] = useState<number | null>(null);
  const [matchedPatient, setMatchedPatient] = useState<{
    id: string; code: string; name: string; phone: string; age: number; gender: string;
  } | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [rxScale, setRxScale] = useRxScale();

  const createRx = useCreatePrescription();
  const updatePatient = useUpdatePatient();

  // Phone-based auto-match logic. Debounced so typing fires one lookup per
  // pause instead of one per keystroke; the match effect below still reads the
  // CURRENT form.phone so the release logic stays exact.
  const debouncedPhone = useDebouncedValue(form.phone, 250);
  const { data: patientsList } = usePatients({
    q: debouncedPhone.trim().length >= 10 ? debouncedPhone : "",
    pageSize: 10,
  });

  useEffect(() => {
    const phone = form.phone.trim();
    // Too short to match, or results not loaded yet: release a stale match
    // only once the phone has actually moved away from the matched number.
    if (phone.length < 10 || !patientsList?.items) {
      if (matchedPatient && phone !== matchedPatient.phone && !profileDirty) {
        setMatchedPatient(null);
        setForm((f) => ({ ...f, name: "", age: "", gender: "", id: "" }));
      }
      return;
    }
    const exact = patientsList.items.find((p) => p.phone === phone);
    if (exact) {
      // New / different patient → (re)link and auto-fill demographics.
      if (matchedPatient?.id !== exact.id) {
        setMatchedPatient({ id: exact.id, code: exact.code, name: exact.name, phone: exact.phone, age: exact.age, gender: exact.gender });
        setForm((f) => ({ ...f, name: exact.name, age: String(exact.age), gender: exact.gender, id: exact.code }));
        setProfileDirty(false);
      }
    } else if (matchedPatient && !profileDirty) {
      // Phone no longer matches any patient → release the link.
      setMatchedPatient(null);
      setForm((f) => ({ ...f, name: "", age: "", gender: "", id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.phone, patientsList?.items]);

  const setField =
    <K extends keyof EntryForm>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      setForm((f) => ({ ...f, [k]: newVal } as EntryForm));
      if (matchedPatient && (k === "name" || k === "age" || k === "gender")) {
        setProfileDirty(true);
      }
    };

  const updateMed = (i: number, m: Medicine) => setForm({ ...form, meds: form.meds.map((x, j) => (j === i ? m : x)) });
  const addMed = () => {
    setMedFocus(form.meds.length); // focus the row we're about to append
    setForm((f) => ({ ...f, meds: [...f.meds, { name: "", dose: "1-0-1 (BID)", days: "5" }] }));
  };
  const removeMed = (i: number) => setForm({ ...form, meds: form.meds.filter((_, j) => j !== i) });
  const toggleTest = (t: string) =>
    setForm({ ...form, tests: form.tests.includes(t) ? form.tests.filter((x) => x !== t) : [...form.tests, t] });

  const clear = () => {
    setForm(EMPTY_FORM);
    setTeeth({});
    setMatchedPatient(null);
    setProfileDirty(false);
    setInvoiceAmount("");
    setMedFocus(null);
  };

  const save = async (andPrint = false) => {
    if (!form.phone.trim() || !form.name.trim()) {
      showToast("Phone and name are required.");
      return;
    }

    if (matchedPatient && profileDirty) {
      try {
        await updatePatient.mutateAsync({
          id: matchedPatient.id,
          name: form.name,
          phone: form.phone,
          age: parseInt(form.age) || 0,
          gender: form.gender || "Other",
        });
      } catch (err) {
        showToast("Could not update patient profile.");
        return;
      }
    }

    const teethPayload: Record<string, string> = {};
    for (const [k, v] of Object.entries(teeth)) teethPayload[k] = v as string;

    const amt = parseFloat(invoiceAmount);

    try {
      await createRx.mutateAsync({
        patientId: matchedPatient?.id,
        newPatient: matchedPatient
          ? undefined
          : {
              name: form.name.trim(),
              phone: form.phone.trim(),
              age: parseInt(form.age) || 0,
              gender: form.gender || "Other",
            },
        complaint: form.complaint,
        observation: form.observation,
        diagnosis: form.diagnosis,
        treatment: form.treatment,
        advice: form.advice,
        teeth: teethPayload,
        tests: form.tests,
        meds: form.meds.filter((m) => m.name.trim()),
        invoiceAmount: amt > 0 ? amt : undefined,
      });
      showToast("Prescription and patient saved.");
      // Print before clearing so the live preview still holds the data; clear
      // only after the print dialog closes.
      if (andPrint) {
        const cleanup = () => { clear(); window.removeEventListener("afterprint", cleanup); };
        window.addEventListener("afterprint", cleanup);
        setTimeout(() => window.print(), 400);
      } else {
        clear();
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save prescription.");
    }
  };

  const toothModes: { k: ToothCondition; label: string; color: string }[] = [
    { k: "issue", label: CONDITION_META.issue.label, color: CONDITION_META.issue.color },
    { k: "caries", label: CONDITION_META.caries.label, color: CONDITION_META.caries.color },
    { k: "extract", label: CONDITION_META.extract.label, color: CONDITION_META.extract.color },
  ];

  return (
    <div className="page" data-screen-label="04 New Patient Entry">
      {showHistory && matchedPatient && (
        <PrescriptionHistoryModal patientId={matchedPatient.id} onClose={() => setShowHistory(false)} />
      )}

      <div className="crumbs no-print">
        <a onClick={() => go("dashboard")}>Dashboard</a>
        <IconChevR size={14} />
        <a onClick={() => go("directory")}>Patients</a>
        <IconChevR size={14} />
        <span className="active">New Entry</span>
      </div>

      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, marginTop: 4 }}>
        <div>
          <h1 className="h1" style={{ fontSize: 40 }}>New Patient Entry</h1>
          <div className="lede" style={{ fontSize: 16 }}>Enter patient details and clinical notes to generate a prescription.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 32, alignItems: "start" }}>
        <div className="no-print entry-form-pane" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card card-pad">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "var(--navy-900)" }}>
              <IconUser size={20} />
              <h2 className="h2">Patient Information</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field">
                <label className="label">Full Name</label>
                <input className="input" placeholder="Jane Doe" value={form.name} onChange={setField("name")} />
              </div>
              <div className="field">
                <label className="label">Contact Number</label>
                <input className="input" placeholder="01XXXXXXXXX" value={form.phone} onChange={setField("phone")} />
              </div>
              <div className="field">
                <label className="label">Patient ID</label>
                <input className="input" placeholder="Auto / DC-XXXXX" value={form.id} onChange={setField("id")} disabled={!!matchedPatient} />
              </div>
              <div className="field">
                <label className="label">Age / Gender</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
                  <input className="input" placeholder="Age" value={form.age} onChange={setField("age")} />
                  <select className="select" value={form.gender} onChange={setField("gender")}>
                    <option value="">Select</option>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            {form.phone.trim().length >= 10 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-soft)", fontSize: 13 }}>
                {matchedPatient ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="chip chip-active">
                      Patient found: {matchedPatient.code} · {matchedPatient.name}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12 }}
                      onClick={() => setShowHistory(true)}
                    >
                      View History
                    </button>
                  </div>
                ) : patientsList?.items ? (
                  <span style={{ color: "var(--ink-500)" }}>New patient — will be registered</span>
                ) : (
                  <span style={{ color: "var(--ink-500)" }}>Checking…</span>
                )}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "var(--navy-900)" }}>
              <IconClipboard size={20} />
              <h2 className="h2">Clinical Notes</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label className="label">Patient Complaints (C/C)</label>
                <textarea className="textarea" placeholder="E.g., Pain in lower right molar for 3 days…" value={form.complaint} onChange={setField("complaint")} />
              </div>
              <div className="field">
                <label className="label">Observation / Examination (O/E)</label>
                <textarea className="textarea" placeholder="E.g., Deep caries with pulpal involvement in 46…" value={form.observation} onChange={setField("observation")} />
              </div>
              <div className="field">
                <label className="label">Diagnosis</label>
                <textarea className="textarea" placeholder="E.g., Acute irreversible pulpitis…" value={form.diagnosis} onChange={setField("diagnosis")} />
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy-900)" }}>
                <IconTooth size={20} />
                <h2 className="h2">Dental Chart</h2>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {toothModes.map((m) => (
                  <button key={m.k} className="btn btn-sm" style={{ background: toothMode === m.k ? m.color : "var(--bg-soft)", color: toothMode === m.k ? "white" : "var(--navy-900)", fontWeight: 600, height: 30, padding: "0 10px" }} onClick={() => setToothMode(m.k)}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: m.color, display: "inline-block" }} /> {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ color: "var(--ink-500)", fontSize: 13, marginBottom: 8 }}>
              Click a tooth to mark it; click again to clear, or switch the mode to recolor it.{" "}
              {Object.keys(teeth).length > 0 && (
                <>
                  {" "}<strong style={{ color: "var(--navy-900)" }}>{Object.keys(teeth).length}</strong> tooth/teeth marked.
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => setTeeth({})}>Clear</button>
                </>
              )}
            </div>
            <div style={{ background: "var(--bg-soft)", borderRadius: 10, padding: 14 }}>
              <ToothChart selected={teeth} setSelected={setTeeth} mode={toothMode} />
            </div>
          </div>

          <div className="card card-pad">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "var(--navy-900)" }}>
              <IconClipboard size={20} />
              <h2 className="h2">Treatment & Medication</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label className="label">Treatment / Procedure Done</label>
                <input
                  className="input"
                  list="treatment-options"
                  placeholder="E.g., Composite filling on 46…"
                  value={form.treatment}
                  onChange={setField("treatment")}
                />
                <datalist id="treatment-options">
                  {TREATMENT_SUGGESTIONS.map((t) => (<option key={t} value={t} />))}
                </datalist>
                <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 6 }}>Saved to the patient's procedure history.</div>
              </div>

              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="label">Medicine List</label>
                  <button className="btn btn-ghost btn-sm" onClick={addMed}><IconPlus size={14} /> Add Med</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {form.meds.map((m, i) => (
                    <MedRow
                      key={i}
                      med={m}
                      onChange={(nm) => updateMed(i, nm)}
                      onRemove={() => removeMed(i)}
                      removable={form.meds.length > 1}
                      autoFocusName={medFocus === i}
                    />
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label">Required Tests</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {TESTS.map((t) => (
                    <button key={t} className="btn btn-sm" style={{ background: form.tests.includes(t) ? "var(--navy-900)" : "var(--bg-soft)", color: form.tests.includes(t) ? "white" : "var(--navy-900)", height: 30, fontSize: 12 }} onClick={() => toggleTest(t)}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label">Advices / Instructions</label>
                <textarea className="textarea" placeholder="E.g., Soft diet, warm saline rinses…" value={form.advice} onChange={setField("advice")} />
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: "var(--navy-900)" }}>
              <h2 className="h2">Payment</h2>
            </div>
            <div className="field">
              <label className="label">Expected Payment (৳)</label>
              <input
                className="input"
                placeholder="e.g., 500"
                type="number"
                min="0"
                step="1"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
              />
              <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 6 }}>Leave blank to skip creating an invoice</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "8px 0 24px" }}>
            <button className="btn btn-outline" onClick={clear}>Clear</button>
            <button className="btn btn-primary" onClick={() => save(true)} disabled={createRx.isPending}>
              <IconPrint size={16} /> {createRx.isPending ? "Saving…" : "Save & Print Rx"}
            </button>
            <button className="btn btn-secondary" onClick={() => save(false)} disabled={createRx.isPending}>
              {createRx.isPending ? "Saving…" : "Save Only"}
            </button>
          </div>
        </div>

        <div>
          {/* On-screen live preview (with placeholder hints) — never printed. */}
          <div className="rx-preview-sticky no-print">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
              <h2 className="h2">Prescription Preview</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <RxSizeControl scale={rxScale} onChange={setRxScale} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-500)", fontSize: 13 }}>
                  <span className="pulse-dot" /> Live
                </div>
              </div>
            </div>
            <RxDocument data={rxDataFromForm(form, teeth)} placeholders scale={rxScale} />
            <div style={{ color: "var(--ink-500)", fontSize: 12, marginTop: 10, textAlign: "center" }}>A4 · Bilingual (English / বাংলা) · Updates as you type</div>
          </div>

          {/* Print-only copy: real content, no placeholders, pinned top-left in @media print. */}
          <div className="rx-print-root rx-print-only">
            <RxDocument data={rxDataFromForm(form, teeth)} scale={rxScale} />
          </div>
        </div>
      </div>
    </div>
  );
}
