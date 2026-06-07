import { ToothChart, groupToothLabels, CONDITION_META, fdiLabel } from "../ToothChart";
import type { EntryForm, ToothCondition, ToothSelection } from "../types";
import type { ApiPrescription } from "../api/types";
import logoUrl from "../assets/LOGO.png";
import type { RxScale } from "../lib/rxScale";

// Main-content text scale → multiplier consumed by `--rx-fs` in styles.css.
const SCALE_FS: Record<RxScale, number> = { s: 0.9, m: 1, l: 1.14 };

// ── Clinic identity (single source of truth for the printed Rx) ──
const CLINIC = {
  doctor: "Dr. Md. Ashraf Ullah",
  quals: [
    "BDS (Chittagong Medical College)",
    "FICOI (USA) (Dental Implant)",
    "PGT (Orthodontics)",
    "Specially trained in smile design",
    "BMDC 9915",
  ],
  brandEn: "Ashraf's Dental Care",
  tagline: "— Smile With Confidence —",
  nameBn: "আশরাফ'স ডেন্টাল কেয়ার",
  addrBn: ["ব্লক-এইচ, রোড-০১, লেইন-০২, বাসা-০১,", "গরীবে নেওয়াজ উচ্চ বিদ্যালয়ের বিপরীতে, হালিশহর হা/এ, চট্টগ্রাম"],
  hoursBn: ["সাক্ষাতের সময়: প্রতিদিন বিকাল ৩টা — রাত ১০টা", "শুক্রবার রোগীর জরুরী প্রয়োজনে"],
  phones: "016170-152516 · 01704-747291",
};

export interface RxData {
  patient: { name: string; age: string | number; gender: string; phone: string; code?: string };
  dateLabel: string;
  complaint: string;
  observation: string;
  diagnosis: string;
  treatment: string;
  advice: string;
  teeth: Record<string, string>;
  tests: string[];
  meds: { name: string; dose: string; days: string }[];
}

const today = () =>
  new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function rxDataFromForm(form: EntryForm, teeth: ToothSelection): RxData {
  const teethObj: Record<string, string> = {};
  for (const [k, v] of Object.entries(teeth)) teethObj[k] = v as string;
  return {
    patient: { name: form.name, age: form.age, gender: form.gender, phone: form.phone, code: form.id },
    dateLabel: today(),
    complaint: form.complaint,
    observation: form.observation,
    diagnosis: form.diagnosis,
    treatment: form.treatment,
    advice: form.advice,
    teeth: teethObj,
    tests: form.tests,
    meds: form.meds,
  };
}

export function rxDataFromApi(rx: ApiPrescription): RxData {
  return {
    patient: {
      name: rx.patient.name,
      age: rx.patient.age,
      gender: rx.patient.gender,
      phone: rx.patient.phone,
      code: rx.patient.code,
    },
    dateLabel: rx.date?.label ?? today(),
    complaint: rx.complaint,
    observation: rx.observation,
    diagnosis: rx.diagnosis,
    treatment: rx.treatment ?? "",
    advice: rx.advice,
    teeth: rx.teeth || {},
    tests: rx.tests || [],
    meds: rx.meds || [],
  };
}

function Section({
  label,
  symbol,
  show,
  children,
}: {
  label: string;
  symbol?: boolean;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <>
      <div className={`rx-lbl${symbol ? " rx-symbol" : ""}`}>{label}</div>
      <div className="rx-val">{children}</div>
    </>
  );
}

const ph = (text: string, placeholder: string, placeholders: boolean): React.ReactNode =>
  text ? text : placeholders ? <span className="rx-ph">{placeholder}</span> : null;

/**
 * The bilingual A4 prescription. `placeholders` (live preview) shows muted hints
 * for empty sections; reprints omit empty sections entirely.
 */
export function RxDocument({
  data,
  placeholders = false,
  scale = "m",
}: {
  data: RxData;
  placeholders?: boolean;
  scale?: RxScale;
}) {
  const meds = data.meds.filter((m) => m.name.trim());
  const teethSel = data.teeth as unknown as ToothSelection;
  const hasTeeth = Object.keys(data.teeth).length > 0;
  const groups = groupToothLabels(teethSel);
  const genderInitial = data.patient.gender ? ` · ${data.patient.gender[0]}` : "";

  return (
    <div className="rx-paper" style={{ "--rx-fs": SCALE_FS[scale] } as React.CSSProperties}>
      <div className="rx-doc">
        {/* header */}
        <div className="rx-head">
          <div>
            <div className="doc-name">{CLINIC.doctor}</div>
            <div className="doc-quals">
              {CLINIC.quals.map((q) => (
                <div key={q}>{q}</div>
              ))}
            </div>
          </div>
          <div className="rx-brand">
            <img className="rx-logo" src={logoUrl} alt="" aria-hidden />
            <div className="b-name">{CLINIC.brandEn}</div>
            <div className="b-tag">{CLINIC.tagline}</div>
          </div>
          <div className="clinic-bn">
            <div className="bn-name">{CLINIC.nameBn}</div>
            {CLINIC.addrBn.map((l) => (
              <div key={l}>{l}</div>
            ))}
            {CLINIC.hoursBn.map((l) => (
              <div key={l} style={{ marginTop: 2 }}>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* patient strip */}
        <div className="rx-patient">
          <div style={{ flex: 2 }}>
            <b>Name:</b> {data.patient.name || "—"}
          </div>
          <div style={{ flex: 1 }}>
            <b>Age:</b> {data.patient.age || "—"}
            {genderInitial}
          </div>
          <div style={{ flex: 1.4 }}>
            <b>Number:</b> {data.patient.phone || "—"}
          </div>
          <div style={{ flex: 1 }}>
            <b>Date:</b> {data.dateLabel}
          </div>
        </div>

        {/* flowing clinical body with continuous navy sidebar */}
        <div className="rx-body">
          <Section label="C/C (Chief Complaint)" show={!!data.complaint || placeholders}>
            {ph(data.complaint, "Chief complaint will appear here…", placeholders)}
          </Section>

          <Section label="O/E (Examination)" show={!!data.observation || placeholders}>
            {ph(data.observation, "Examination notes…", placeholders)}
          </Section>

          <Section label="Dental Chart" show={hasTeeth}>
            <ToothChart selected={teethSel} setSelected={() => {}} mini />
            <div className="rx-teeth-legend">
              {(Object.keys(groups) as ToothCondition[])
                .filter((k) => groups[k].length > 0)
                .map((k) => (
                  <span key={k} className="lg">
                    <span className="dot" style={{ background: CONDITION_META[k].color }} />
                    <b>{CONDITION_META[k].label}:</b> {groups[k].map(fdiLabel).join(", ")}
                  </span>
                ))}
            </div>
          </Section>

          <Section label="Diagnosis" show={!!data.diagnosis || placeholders}>
            {ph(data.diagnosis, "Diagnosis…", placeholders)}
          </Section>

          <Section label="Treatment" show={!!data.treatment}>
            {data.treatment}
          </Section>

          <Section label="℞" symbol show>
            {meds.length > 0 ? (
              <ol className="rx-meds">
                {meds.map((m, i) => (
                  <li key={i}>
                    <span className="m-name">{m.name}</span> &nbsp;{m.dose}&nbsp; · &nbsp;{m.days || "—"} days
                  </li>
                ))}
              </ol>
            ) : (
              ph("", "Medicines will appear here as you add them…", placeholders)
            )}
          </Section>

          <Section label="Tests" show={data.tests.length > 0}>
            <div className="rx-tests">
              {data.tests.map((t) => (
                <span key={t} className="t">
                  {t}
                </span>
              ))}
            </div>
          </Section>

          <Section label="Advice" show={!!data.advice || placeholders}>
            {ph(data.advice, "Advice / instructions…", placeholders)}
          </Section>
        </div>

        {/* signature */}
        <div className="rx-sign">
          <div className="line">Doctor's Signature</div>
        </div>

        {/* footer */}
        <div className="rx-foot">
          <div className="bn">
            {CLINIC.addrBn[0]}
            <br />
            {CLINIC.addrBn[1]}
          </div>
          <div className="r">
            <div>{CLINIC.phones}</div>
            <div className="cn">{CLINIC.brandEn}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
