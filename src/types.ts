export type StatusKey = "Active" | "Follow-up" | "Inactive" | "Pending";

export interface PatientStatus {
  key: StatusKey;
  chip: string;
  weight: number;
}

export interface DateInfo {
  iso: string;
  label: string;
  raw: Date;
}

export type RiskLevel = "LOW" | "MED" | "HIGH";

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: "Male" | "Female";
  blood: string;
  lastVisit: DateInfo;
  nextAppt: DateInfo | null;
  procedure: string;
  apptTime: string | null;
  status: PatientStatus;
  avatarHue: number;
  conditions: string;
  allergies: string;
  medications: string;
  risk: RiskLevel;
  balance: string;
}

export type AppointmentStatus = "Confirmed" | "Pending" | "Cancelled";

export interface Appointment {
  time: string;
  patient: string;
  procedure: string;
  status: AppointmentStatus;
}

export interface PastProcedure {
  proc: string;
  desc: string;
  date: string;
  outcome: string;
  icon: "mask" | "scope" | "brush" | "tooth";
}

export interface ClinicalNote {
  title: string;
  date: string;
  body: string;
  italic?: boolean;
  verified?: boolean;
}

export type Route =
  | "dashboard"
  | "directory"
  | "detail"
  | "entry"
  | "schedule"
  | "records"
  | "rx"
  | "billing"
  | "settings";

export type ToothCondition = "issue" | "caries" | "extract";
export type ToothSelection = Record<number, ToothCondition>;

export interface Medicine {
  name: string;
  dose: string;
  days: string;
}

export interface EntryForm {
  name: string;
  phone: string;
  id: string;
  age: string;
  gender: string;
  complaint: string;
  observation: string;
  diagnosis: string;
  treatment: string;
  advice: string;
  tests: string[];
  meds: Medicine[];
}

export interface Tweaks {
  density: "compact" | "regular" | "comfy";
  dark: boolean;
  showSideCards: boolean;
  pair: "default" | "jakarta" | "inter";
}
