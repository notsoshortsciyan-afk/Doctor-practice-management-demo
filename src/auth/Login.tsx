import { useState } from "react";
import { IconLogo } from "../icons";
import { useAuth } from "./AuthContext";
import { ApiError } from "../api/client";

const DEMO = [
  { label: "Doctor", email: "doctor@dentalcare.test", password: "doctor123" },
  { label: "Receptionist", email: "reception@dentalcare.test", password: "reception123" },
];

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Is the server running?");
    } finally {
      setBusy(false);
    }
  };

  const quickFill = (d: (typeof DEMO)[number]) => {
    setEmail(d.email);
    setPassword(d.password);
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(160deg, var(--navy-900) 0%, #03133a 100%)",
        padding: 24,
      }}
    >
      <div style={{ width: 400, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "white", marginBottom: 20 }}>
          <span className="brand-mark" style={{ background: "var(--accent-yellow)", color: "var(--navy-900)" }}>
            <IconLogo size={20} />
          </span>
          <span style={{ fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 22 }}>Ashraf's Dental Care</span>
        </div>

        <form className="card card-pad" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h1 className="h2" style={{ fontSize: 22 }}>Welcome back</h1>
            <div style={{ color: "var(--ink-500)", fontSize: 14, marginTop: 4 }}>Sign in to the practice dashboard.</div>
          </div>

          <div className="field">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              autoFocus
              placeholder="you@dentalcare.test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ background: "var(--danger-bg)", color: "var(--danger-ink)", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-lg" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Signing in…" : "Sign In"}
          </button>

          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
            <div className="eyebrow" style={{ color: "var(--ink-500)", marginBottom: 8 }}>Demo accounts</div>
            <div style={{ display: "flex", gap: 8 }}>
              {DEMO.map((d) => (
                <button key={d.label} type="button" className="btn btn-soft btn-sm" style={{ flex: 1 }} onClick={() => quickFill(d)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
