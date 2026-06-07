import { useState } from "react";
import {
  useSettings,
  useUpdateSettings,
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useWipeData,
} from "../api/hooks";
import { useAuth } from "../auth/AuthContext";
import { Modal } from "../components/Modal";
import { ApiError } from "../api/client";
import type { ApiSettings, ApiUser } from "../api/types";

type Tab = "appearance" | "account" | "staff";

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "inline-flex", gap: 6, background: "var(--bg-soft)", padding: 4, borderRadius: 10 }}>
      {options.map((o) => (
        <button
          key={o.value}
          className="btn btn-sm"
          style={{ background: value === o.value ? "var(--navy-900)" : "transparent", color: value === o.value ? "white" : "var(--navy-900)", height: 32, fontWeight: 600 }}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Appearance() {
  const { data } = useSettings();
  const update = useUpdateSettings();
  const s: ApiSettings = data ?? { theme: "light", density: "regular", fontPair: "default", showSideCards: true };
  const set = (patch: Partial<ApiSettings>) => update.mutate(patch);

  const Row = ({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--border-soft)" }}>
      <div>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{title}</div>
        <div style={{ color: "var(--ink-500)", fontSize: 13, marginTop: 2 }}>{sub}</div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="card card-pad">
      <h2 className="h2" style={{ marginBottom: 4 }}>Appearance</h2>
      <div style={{ color: "var(--ink-500)", fontSize: 14 }}>Saved to your account and applied on every device.</div>
      <Row title="Theme" sub="Light or dark interface.">
        <Segmented value={s.theme} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} onChange={(v) => set({ theme: v })} />
      </Row>
      <Row title="Density" sub="Spacing and sizing of the UI.">
        <Segmented value={s.density} options={[{ value: "compact", label: "Compact" }, { value: "regular", label: "Regular" }, { value: "comfy", label: "Comfy" }]} onChange={(v) => set({ density: v })} />
      </Row>
      <Row title="Typography" sub="Font pairing for headings and body.">
        <Segmented value={s.fontPair} options={[{ value: "default", label: "Manrope" }, { value: "jakarta", label: "Jakarta" }, { value: "inter", label: "Inter" }]} onChange={(v) => set({ fontPair: v })} />
      </Row>
    </div>
  );
}

function Account({ showToast }: { showToast: (m: string) => void }) {
  const { user, isDoctor } = useAuth();
  const update = useUpdateUser();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  if (!user) return null;

  const changePassword = async () => {
    setMsg(null);
    if (pw.length < 6) return setMsg("Password must be at least 6 characters.");
    try {
      await update.mutateAsync({ id: user.id, data: { password: pw } });
      setPw("");
      setMsg("Password updated.");
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Could not update password.");
    }
  };

  return (
    <div className="card card-pad" style={{ maxWidth: 560 }}>
      <h2 className="h2" style={{ marginBottom: 16 }}>Account</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="field">
          <label className="label">Name</label>
          <input className="input" value={user.name} disabled />
        </div>
        <div className="field">
          <label className="label">Role</label>
          <input className="input" value={user.role === "DOCTOR" ? "Doctor (Owner)" : "Receptionist"} disabled />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="label">Email</label>
          <input className="input" value={user.email} disabled />
        </div>
      </div>

      {isDoctor && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border-soft)" }}>
          <label className="label">Change Password</label>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <input className="input" type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button className="btn btn-primary" onClick={changePassword} disabled={update.isPending}>Update</button>
          </div>
        </div>
      )}
      {msg && <div style={{ marginTop: 12, color: "var(--ink-600)", fontSize: 13 }}>{msg}</div>}

      {isDoctor && <DangerZone showToast={showToast} />}
    </div>
  );
}

function DangerZone({ showToast }: { showToast: (m: string) => void }) {
  const wipe = useWipeData();
  const [confirming, setConfirming] = useState(false);

  const runWipe = async () => {
    try {
      const res = await wipe.mutateAsync();
      setConfirming(false);
      showToast(`Deleted ${res.deleted.patients} patient(s) and all related records.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not delete data.");
    }
  };

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border-soft)" }}>
      <label className="label" style={{ color: "var(--danger-ink)" }}>Danger Zone</label>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginTop: 6 }}>
        <div style={{ color: "var(--ink-500)", fontSize: 13 }}>
          Permanently delete all patients, appointments, prescriptions, notes, and invoices. Your staff accounts and settings are kept.
        </div>
        <button
          className="btn btn-sm"
          style={{ background: "var(--danger-bg)", color: "var(--danger-ink)", flexShrink: 0 }}
          onClick={() => setConfirming(true)}
        >
          Delete all patient data
        </button>
      </div>

      {confirming && (
        <Modal
          title="Delete all patient data?"
          onClose={() => (wipe.isPending ? undefined : setConfirming(false))}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setConfirming(false)} disabled={wipe.isPending}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: "var(--danger-ink)", color: "white" }}
                onClick={runWipe}
                disabled={wipe.isPending}
              >
                {wipe.isPending ? "Deleting…" : "Yes, delete everything"}
              </button>
            </>
          }
        >
          <div style={{ color: "var(--ink-600)", fontSize: 14, lineHeight: 1.6 }}>
            This permanently removes <strong>every patient record</strong> — including their appointments,
            prescriptions, clinical notes, procedures, documents, invoices, and payments.
            <br /><br />
            Your staff accounts and appearance settings are <strong>not</strong> affected. This cannot be undone.
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewStaffModal({ onClose }: { onClose: () => void }) {
  const create = useCreateUser();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "RECEPTIONIST" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const submit = async () => {
    setError(null);
    if (!form.name || !form.email || form.password.length < 6) return setError("Fill all fields (password ≥ 6 chars).");
    try {
      await create.mutateAsync(form);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create user.");
    }
  };
  return (
    <Modal
      title="Add Staff Member"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={create.isPending}>Create</button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="field"><label className="label">Name</label><input className="input" value={form.name} onChange={set("name")} /></div>
        <div className="field"><label className="label">Role</label>
          <select className="select" value={form.role} onChange={set("role")}>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="DOCTOR">Doctor</option>
          </select>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label className="label">Email</label><input className="input" value={form.email} onChange={set("email")} /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label className="label">Temporary Password</label><input className="input" type="text" value={form.password} onChange={set("password")} /></div>
      </div>
      {error && <div style={{ marginTop: 12, background: "var(--danger-bg)", color: "var(--danger-ink)", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>{error}</div>}
    </Modal>
  );
}

function Staff() {
  const { user } = useAuth();
  const { data, isLoading } = useUsers();
  const toggle = useUpdateUser();
  const deactivate = useDeactivateUser();
  const [adding, setAdding] = useState(false);
  const users = data ?? [];

  return (
    <div className="card card-pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="h2">Staff Accounts</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>Add Staff</button>
      </div>
      {isLoading ? (
        <div style={{ color: "var(--ink-500)" }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {users.map((u: ApiUser) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "var(--bg-soft)", borderRadius: 10, opacity: u.active ? 1 : 0.55 }}>
              <div className="avatar-ring" style={{ position: "static" }}>{u.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{u.name} {u.id === user?.id && <span style={{ color: "var(--ink-400)", fontWeight: 500 }}>(you)</span>}</div>
                <div style={{ color: "var(--ink-500)", fontSize: 13 }}>{u.email}</div>
              </div>
              <span className="chip" style={{ background: "var(--bg-soft-3)" }}>{u.role === "DOCTOR" ? "Doctor" : "Receptionist"}</span>
              {u.id !== user?.id && (
                u.active ? (
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger-ink)" }} onClick={() => deactivate.mutate(u.id)}>Disable</button>
                ) : (
                  <button className="btn btn-soft btn-sm" onClick={() => toggle.mutate({ id: u.id, data: { active: true } })}>Enable</button>
                )
              )}
            </div>
          ))}
        </div>
      )}
      {adding && <NewStaffModal onClose={() => setAdding(false)} />}
    </div>
  );
}

export function Settings({ isDoctor, showToast }: { isDoctor: boolean; showToast: (m: string) => void }) {
  const [tab, setTab] = useState<Tab>("appearance");
  const tabs: { key: Tab; label: string }[] = [
    { key: "appearance", label: "Appearance" },
    { key: "account", label: "Account" },
    ...(isDoctor ? [{ key: "staff" as Tab, label: "Staff" }] : []),
  ];

  return (
    <div className="page" data-screen-label="Settings">
      <h1 className="h1">Settings</h1>
      <div className="lede" style={{ fontSize: 16 }}>Manage your preferences and clinic accounts.</div>

      <div style={{ display: "flex", gap: 8, marginTop: 24, marginBottom: 20, borderBottom: "1px solid var(--border-soft)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className="nav-link"
            style={{ borderBottom: tab === t.key ? "2px solid var(--navy-900)" : "2px solid transparent", color: tab === t.key ? "var(--navy-900)" : "var(--ink-500)", borderRadius: 0, paddingBottom: 10 }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "appearance" && <Appearance />}
      {tab === "account" && <Account showToast={showToast} />}
      {tab === "staff" && isDoctor && <Staff />}
    </div>
  );
}
