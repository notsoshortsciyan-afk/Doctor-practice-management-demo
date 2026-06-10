// Shapes returned by the API (server/src/lib/serialize.ts).

export type RoleName = "DOCTOR" | "RECEPTIONIST";

export interface ApiDateInfo {
  iso: string;
  label: string;
}

export interface ApiStatus {
  key: string; // "Active" | "Follow-up" | "Inactive" | "Pending"
  chip: string;
}

export type RiskLevel = "LOW" | "MED" | "HIGH";
export type Gender = "Male" | "Female" | "Other";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled";
// "lock" rows reserve a slot (see Schedule); they're filtered out of booking lists.
export type AppointmentSource = "website" | "manual" | "lock";
export type InvoiceStatus = "Paid" | "Partial" | "Unpaid" | "Overdue";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  initials: string;
  active: boolean;
}

export interface ApiSettings {
  theme: "light" | "dark";
  density: "compact" | "regular" | "comfy";
  fontPair: "default" | "jakarta" | "inter";
  showSideCards: boolean;
}

// Clinic-wide (not per-user) settings.
export interface ApiClinicSettings {
  slotFullAt: number; // booking count at which the Schedule grid flags a slot "full"
}

export interface ApiPatient {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  age: number;
  gender: Gender;
  blood: string | null;
  status: ApiStatus;
  risk: RiskLevel;
  conditions: string;
  allergies: string;
  medications: string;
  address: string | null;
  avatarHue: number;
  lastVisit: ApiDateInfo | null;
  nextAppt: ApiDateInfo | null;
  apptTime: string | null;
  procedure: string | null;
  balance: string;
}

export interface PatientListResponse {
  items: ApiPatient[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Shared booking from the public website's `appointments` table (or source='manual'
// when created in the dashboard). Not linked to a patient record.
export interface ApiAppointment {
  id: string;
  fullName: string;
  contactNumber: string;
  email: string | null;
  reason: string | null;
  appointmentDate: string; // "YYYY-MM-DD"
  appointmentTime: string; // fixed slot label, e.g. "04:30 PM"
  status: AppointmentStatus;
  source: AppointmentSource;
  createdAt: string; // ISO timestamp
}

export interface ApiSlotAvailability {
  date: string; // "YYYY-MM-DD"
  // bookingCount = how many non-cancelled patient bookings the slot holds (they no
  // longer block it); locked = a staff lock reserves it (lockId = its row id, to unlock).
  slots: { time: string; bookingCount: number; locked: boolean; lockId: string | null }[];
}

export interface ApiMedicine {
  name: string;
  dose: string;
  days: string;
}

export interface ApiPrescription {
  id: string;
  date: ApiDateInfo | null;
  patientId: string;
  patient: { id: string; code: string; name: string; phone: string; age: number; gender: string };
  providerName: string | null;
  complaint: string;
  observation: string;
  diagnosis: string;
  treatment: string;
  advice: string;
  teeth: Record<string, string>;
  tests: string[];
  meds: ApiMedicine[];
}

export interface ApiNote {
  id: string;
  title: string;
  date: string;
  body: string;
  italic: boolean;
  verified: boolean;
}

export interface ApiProcedure {
  proc: string;
  desc: string;
  date: string;
  outcome: string;
  icon: "mask" | "scope" | "brush" | "tooth";
}

export interface ApiDocument {
  id: string;
  type: string;
  label: string;
}

export interface ApiPatientBundle {
  patient: ApiPatient;
  procedures: ApiProcedure[];
  notes: ApiNote[];
  prescriptions: ApiPrescription[];
  documents: ApiDocument[];
}

export interface ApiLineItem {
  description: string;
  amount: number;
}

export interface ApiPayment {
  id: string;
  amount: number;
  method: string;
  date: ApiDateInfo | null;
}

export interface ApiInvoice {
  id: string;
  number: string;
  date: ApiDateInfo | null;
  status: InvoiceStatus;
  lineItems: ApiLineItem[];
  total: number;
  paid: number;
  due: number;
  patientId: string;
  patientName: string;
  patientCode: string;
  payments: ApiPayment[];
}

export interface ApiStats {
  totalPatients: number;
  todaysBookings: number;
  pendingToday: number;
  weeklyRevenue: number;
  revenueDeltaPct: number | null;
  outstanding: number;
  chairUtilization: number;
}
