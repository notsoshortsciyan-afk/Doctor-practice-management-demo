import type {
  Appointment,
  ClinicalNote,
  DateInfo,
  PastProcedure,
  Patient,
  PatientStatus,
  RiskLevel,
} from "./types";

const FIRST = [
  "Alexandra","Marcus","Sarah","David","Eleanor","Michael","Priya","Daniel","Sophia","Liam",
  "Olivia","Noah","Ava","Lucas","Mia","Ethan","Isabella","James","Aria","Benjamin",
  "Charlotte","Henry","Amelia","William","Harper","Theodore","Evelyn","Jack","Abigail","Owen",
  "Aaliyah","Rashid","Fatima","Kenji","Yuki","Anika","Imran","Layla","Hassan","Zara",
];
const LAST = [
  "Rivers","Thorne","Jenkins","Chen","Rigby","Patel","Kim","O'Connor","Garcia","Martinez",
  "Robinson","Walsh","Nguyen","Khan","Singh","Lopez","Edwards","Foster","Brooks","Wallace",
  "Hayes","Romero","Mitchell","Bennett","Carter","Reed","Hughes","Coleman","Russell","Perry",
  "Ahmed","Yusuf","Tanaka","Suzuki","Begum","Hossain","Karim","Choudhury","Rahman","Zaman",
];
const PROCS = [
  "Annual Cleaning & Check-up","Root Canal Follow-up","Denture Fitting","Crown Placement",
  "Cavity Filling","Wisdom Tooth Extraction","Orthodontic Adjustment","Whitening Treatment",
  "Periodontal Cleaning","Implant Consultation","Pediatric Cleaning","Bridge Fitting",
];
const STATUSES: PatientStatus[] = [
  { key: "Active",    chip: "chip-active",   weight: 0.55 },
  { key: "Follow-up", chip: "chip-followup", weight: 0.20 },
  { key: "Inactive",  chip: "chip-inactive", weight: 0.15 },
  { key: "Pending",   chip: "chip-pending",  weight: 0.10 },
];

function rand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rng = rand(42);

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

function mkPhone() {
  return `0${Math.floor(rng() * 9 + 1)}${Array.from({ length: 9 }, () => Math.floor(rng() * 10)).join("")}`;
}

function pickStatus(): PatientStatus {
  let r = rng();
  let acc = 0;
  for (const s of STATUSES) {
    acc += s.weight;
    if (r < acc) return s;
  }
  return STATUSES[0];
}

function mkDate(daysFromNow: number): DateInfo {
  const d = new Date(2024, 9, 24); // Oct 24, 2024 = "today"
  d.setDate(d.getDate() + daysFromNow);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return {
    iso: d.toISOString().slice(0, 10),
    label: `${months[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()}`,
    raw: d,
  };
}

export const PATIENTS: Patient[] = Array.from({ length: 28 }).map((_, i) => {
  const first = FIRST[Math.floor(rng() * FIRST.length)];
  const last = LAST[Math.floor(rng() * LAST.length)];
  const stat = pickStatus();
  const lastVisit = mkDate(-Math.floor(rng() * 300) - 5);
  const hasNext = stat.key !== "Inactive" && rng() > 0.15;
  const nextDays = Math.floor(rng() * 60) + (i % 4 === 0 ? 0 : 1);
  const nextAppt = hasNext ? mkDate(nextDays) : null;
  const proc = PROCS[Math.floor(rng() * PROCS.length)];
  const hr = Math.floor(rng() * 8) + 9;
  const min = [0, 15, 30, 45][Math.floor(rng() * 4)];
  return {
    id: `DC-${10000 + Math.floor(rng() * 89999)}`,
    name: `${first} ${last}`,
    phone: mkPhone(),
    age: 18 + Math.floor(rng() * 60),
    gender: rng() > 0.5 ? "Female" : "Male",
    blood: ["A+", "B+", "O+", "AB+", "O-", "A-"][Math.floor(rng() * 6)],
    lastVisit,
    nextAppt,
    procedure: proc,
    apptTime: hasNext ? `${pad(((hr - 1) % 12) + 1)}:${pad(min)} ${hr < 12 ? "AM" : "PM"}` : null,
    status: stat,
    avatarHue: Math.floor(rng() * 360),
    conditions: rng() > 0.5 ? "Mild Hypertension, Seasonal Allergies" : "None reported",
    allergies: rng() > 0.6 ? "Penicillin (Severe Reaction)" : rng() > 0.5 ? "None" : "Latex (Mild)",
    medications: rng() > 0.5 ? "Lisinopril 5mg (Daily), Zyrtec as needed" : "None",
    risk: (["LOW","LOW","LOW","MED","HIGH"] as RiskLevel[])[Math.floor(rng() * 5)],
    balance: rng() > 0.7 ? `৳${(rng() * 800).toFixed(0)}` : "৳0",
  };
});

export const TODAY_APPTS: Appointment[] = [
  { time: "09:30 AM", patient: "Sarah Jenkins",  procedure: "Annual Cleaning & Check-up", status: "Confirmed" },
  { time: "10:45 AM", patient: "Michael Chen",   procedure: "Root Canal Follow-up",       status: "Pending" },
  { time: "01:15 PM", patient: "Eleanor Rigby",  procedure: "Denture Fitting",            status: "Confirmed" },
  { time: "02:30 PM", patient: "Priya Patel",    procedure: "Orthodontic Adjustment",     status: "Confirmed" },
  { time: "03:45 PM", patient: "David Chen",     procedure: "Check-up",                   status: "Pending" },
  { time: "04:30 PM", patient: "Marcus Thorne",  procedure: "Crown Placement",            status: "Confirmed" },
  { time: "05:00 PM", patient: "Aria Khan",      procedure: "Whitening Treatment",        status: "Confirmed" },
  { time: "05:45 PM", patient: "Liam Walsh",     procedure: "Cavity Filling",             status: "Pending" },
];

export const PAST_PROCEDURES: PastProcedure[] = [
  { proc: "Dental Crowns (Upper Molar)", desc: "Completed by Dr. Ashraf",        date: "Mar 15, 2023", outcome: "Successful", icon: "mask" },
  { proc: "Filling & Root Canal",        desc: "Tooth #14 (Emergency Visit)",    date: "Dec 08, 2022", outcome: "Successful", icon: "scope" },
  { proc: "Scaling & Polishing",         desc: "Routine Cleaning",               date: "Jun 10, 2022", outcome: "Successful", icon: "brush" },
  { proc: "Wisdom Tooth Extraction",     desc: "Tooth #38 — Local anesthesia",   date: "Feb 22, 2022", outcome: "Successful", icon: "tooth" },
];

export const CLINICAL_NOTES: ClinicalNote[] = [
  {
    title: "Dr. Ashraf's Clinical Observation",
    date: "Feb 20, 2024",
    body: "Patient reports sensitivity to cold in the lower left quadrant. Examination shows slight recession on tooth #22. Suggested specialized sensitivity toothpaste and will monitor for next 6 months. Gingival health is generally improved since last scaling visit.",
    italic: true,
    verified: true,
  },
  {
    title: "Post-Procedure Follow-up",
    date: "Mar 20, 2023",
    body: "Crown placement for tooth #3 successfully adjusted. Occlusion verified. Patient expressed satisfaction with the shade match. No immediate complications observed.",
  },
];

export const TESTS = [
  "CBC","X-ray (IOPA)","OPG","CBCT","ECG","RBS","S. Creatinine","MRI","CXR","ANA","HbA1c",
];

// Fixed appointment slots — MUST mirror the public website (and server/src/lib/slots.ts)
// so booked-vs-free is computed against the identical labels. The slot availability API
// returns these with booked flags; this list is the picker's fallback/ordering.
export const APPOINTMENT_SLOTS = [
  "03:00 PM","03:45 PM","04:30 PM","05:15 PM","06:00 PM",
  "06:45 PM","07:30 PM","08:15 PM","09:00 PM","09:45 PM",
];
