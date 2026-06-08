import { Prisma, type PatientStatus, type Appointment } from "@prisma/client";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

export function dateInfo(d: Date | null | undefined) {
  if (!d) return null;
  return {
    iso: d.toISOString(),
    label: `${MONTHS[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()}`,
  };
}

export function timeLabel(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? "AM" : "PM";
  h = ((h + 11) % 12) + 1;
  return `${pad(h)}:${pad(m)} ${ap}`;
}

const STATUS_MAP: Record<PatientStatus, { key: string; chip: string }> = {
  Active: { key: "Active", chip: "chip-active" },
  FollowUp: { key: "Follow-up", chip: "chip-followup" },
  Inactive: { key: "Inactive", chip: "chip-inactive" },
  Pending: { key: "Pending", chip: "chip-pending" },
};

export function statusInfo(s: PatientStatus) {
  return STATUS_MAP[s];
}

function money(n: number): string {
  return `৳${Math.round(n)}`;
}

// ---- Patient (list / card) ----
export const patientListInclude = {
  // Most recent prescription date powers "Last Visit" now that appointments are
  // no longer patient-linked (they live in the shared website table).
  prescriptions: { select: { date: true }, orderBy: { date: "desc" }, take: 1 },
  // Only the balance string needs invoices — pull just total + payment amounts,
  // not full payment rows, so list cards stay cheap.
  invoices: { select: { total: true, payments: { select: { amount: true } } } },
} satisfies Prisma.PatientInclude;

export type PatientForList = Prisma.PatientGetPayload<{ include: typeof patientListInclude }>;

export function patientBalance(p: { invoices: { total: number; payments: { amount: number }[] }[] }): number {
  let owed = 0;
  for (const inv of p.invoices) {
    const paid = inv.payments.reduce((s, pay) => s + pay.amount, 0);
    owed += inv.total - paid;
  }
  return Math.max(0, owed);
}

export function serializePatient(p: PatientForList) {
  // Appointments now live in the shared website table keyed by name/phone, not by
  // patientId — so there is no per-patient "next appointment". "Last Visit" falls
  // back to the patient's latest prescription, then to their registration date.
  const lastPrescription = p.prescriptions[0] ?? null;

  return {
    id: p.id,
    code: p.code,
    name: p.name,
    phone: p.phone,
    email: p.email,
    age: p.age,
    gender: p.gender,
    blood: p.blood,
    status: statusInfo(p.status),
    risk: p.risk,
    conditions: p.conditions,
    allergies: p.allergies,
    medications: p.medications,
    address: p.address,
    avatarHue: p.avatarHue,
    lastVisit: dateInfo(lastPrescription?.date ?? p.createdAt),
    nextAppt: null as ReturnType<typeof dateInfo>,
    apptTime: null as string | null,
    procedure: null as string | null,
    balance: money(patientBalance(p)),
  };
}

// ---- Appointment (shared website table) ----
// Standalone bookings (name + contact + slot), shared with the public website.
export function serializeAppointment(a: Appointment) {
  return {
    id: a.id.toString(), // BigInt → string: res.json cannot serialize BigInt
    fullName: a.fullName,
    contactNumber: a.contactNumber,
    email: a.email,
    reason: a.reason,
    appointmentDate: a.appointmentDate.toISOString().slice(0, 10), // YYYY-MM-DD
    appointmentTime: a.appointmentTime,
    status: a.status,
    source: a.source,
    createdAt: a.createdAt.toISOString(),
  };
}

// ---- Prescription ----
export const prescriptionInclude = {
  medicines: true,
  patient: { select: { id: true, code: true, name: true, phone: true, age: true, gender: true } },
  provider: { select: { id: true, name: true } },
} satisfies Prisma.PrescriptionInclude;

export type PrescriptionFull = Prisma.PrescriptionGetPayload<{ include: typeof prescriptionInclude }>;

export function serializePrescription(p: PrescriptionFull) {
  return {
    id: p.id,
    date: dateInfo(p.date),
    patientId: p.patientId,
    patient: p.patient,
    providerName: p.provider?.name ?? null,
    complaint: p.complaint,
    observation: p.observation,
    diagnosis: p.diagnosis,
    treatment: p.treatment,
    advice: p.advice,
    teeth: p.teeth,
    tests: p.tests,
    meds: p.medicines.map((m) => ({ name: m.name, dose: m.dose, days: m.days })),
  };
}

// ---- Clinical note (matches frontend ClinicalNote) ----
export function serializeNote(n: {
  id: string;
  title: string;
  date: Date;
  body: string;
  italic: boolean;
  verified: boolean;
}) {
  return {
    id: n.id,
    title: n.title,
    date: dateInfo(n.date)?.label ?? "",
    body: n.body,
    italic: n.italic,
    verified: n.verified,
  };
}

// ---- Procedure (matches frontend PastProcedure) ----
export function serializeProcedure(p: {
  name: string;
  description: string;
  date: Date;
  outcome: string;
  icon: string;
}) {
  return {
    proc: p.name,
    desc: p.description,
    date: dateInfo(p.date)?.label ?? "",
    outcome: p.outcome,
    icon: p.icon as "mask" | "scope" | "brush" | "tooth",
  };
}

// ---- Invoice ----
export type InvoiceForList = Prisma.InvoiceGetPayload<{
  include: { payments: true; patient: { select: { id: true; code: true; name: true } } };
}>;

export function serializeInvoice(inv: InvoiceForList) {
  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
  return {
    id: inv.id,
    number: inv.number,
    date: dateInfo(inv.date),
    status: inv.status,
    lineItems: inv.lineItems,
    total: inv.total,
    paid,
    due: Math.max(0, inv.total - paid),
    patientId: inv.patientId,
    patientName: inv.patient.name,
    patientCode: inv.patient.code,
    payments: inv.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      date: dateInfo(p.date),
    })),
  };
}

// ---- User ----
export function serializeUser(u: {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  active: boolean;
}) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, initials: u.initials, active: u.active };
}
