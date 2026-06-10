import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  IconCalendar,
  IconPlus,
  IconSearch,
} from "./icons";
import logoUrl from "./assets/LOGO.png";
import pkg from "../package.json";
import { Dashboard } from "./screens/Dashboard";
import { Directory } from "./screens/Directory";
import { PatientDetail } from "./screens/PatientDetail";
import { NewEntry } from "./screens/NewEntry";
import { Schedule } from "./screens/Schedule";
import { Records } from "./screens/Records";
import { RxView } from "./screens/RxView";
import { Billing } from "./screens/Billing";
import { Settings } from "./screens/Settings";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Login } from "./auth/Login";
import { prefetchRoute, useSettings } from "./api/hooks";
import type { Route } from "./types";
import type { RoleName } from "./api/types";

const queryClient = new QueryClient({
  // gcTime kept generous so screens you've already visited render instantly from cache
  // on revisit (refetched in the background) instead of blanking. staleTime is long
  // because every write path invalidates the relevant keys explicitly (see hooks.ts),
  // so cached data only goes stale on an actual mutation — letting revisits skip the
  // refetch/skeleton flash entirely. Appointments override this with their own polling.
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 300_000, gcTime: 600_000 },
  },
});

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const NAV_ITEMS: { key: Route; label: string; roles: RoleName[] }[] = [
  { key: "dashboard", label: "Dashboard", roles: ["DOCTOR", "RECEPTIONIST"] },
  { key: "directory", label: "Patients", roles: ["DOCTOR", "RECEPTIONIST"] },
  { key: "schedule", label: "Schedule", roles: ["DOCTOR", "RECEPTIONIST"] },
  { key: "records", label: "Records", roles: ["DOCTOR"] },
  { key: "billing", label: "Billing", roles: ["DOCTOR", "RECEPTIONIST"] },
];

// Clinical routes are doctor-only; the rest are open to both roles.
const ROUTE_ROLES: Record<Route, RoleName[]> = {
  dashboard: ["DOCTOR", "RECEPTIONIST"],
  directory: ["DOCTOR", "RECEPTIONIST"],
  detail: ["DOCTOR", "RECEPTIONIST"],
  schedule: ["DOCTOR", "RECEPTIONIST"],
  billing: ["DOCTOR", "RECEPTIONIST"],
  settings: ["DOCTOR", "RECEPTIONIST"],
  entry: ["DOCTOR"],
  records: ["DOCTOR"],
  rx: ["DOCTOR"],
};

function getRoute(): Route {
  const m = (location.hash || "#dashboard").match(/^#([\w-]+)/);
  return (m ? m[1] : "dashboard") as Route;
}

// Optional id after a slash, e.g. `#rx/<id>` opened in a new tab.
function getRouteId(): string | null {
  const m = location.hash.match(/^#[\w-]+\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function AccountMenu({ onSettings, onLogout }: { onSettings: () => void; onLogout: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <div className="menu-anchor">
      <div className="avatar-ring" style={{ cursor: "pointer" }} onClick={() => setOpen((o) => !o)} title={user.name}>
        {user.initials}
      </div>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 4 }} onClick={() => setOpen(false)} />
          <div className="menu" style={{ right: 0, minWidth: 200 }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-soft)" }}>
              <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{user.name}</div>
              <div style={{ color: "var(--ink-500)", fontSize: 12, textTransform: "capitalize" }}>{user.role.toLowerCase()}</div>
            </div>
            <div className="menu-item" onClick={() => { onSettings(); setOpen(false); }}>Settings</div>
            <div className="menu-item danger" onClick={() => { onLogout(); setOpen(false); }}>Sign out</div>
          </div>
        </>
      )}
    </div>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const [route, setRoute] = useState<Route>(getRoute());
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [globalQ, setGlobalQ] = useState("");
  const [directoryInitialQuery, setDirectoryInitialQuery] = useState<string | undefined>(undefined);
  const settingsQuery = useSettings();

  const role = user!.role;
  const isDoctor = role === "DOCTOR";

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Warm the most-used screens right after login so the first navigations feel instant.
  useEffect(() => {
    const today = todayYmd();
    prefetchRoute(queryClient, "dashboard", today);
    prefetchRoute(queryClient, "directory", today);
  }, []);

  const go = (r: Route) => {
    location.hash = "#" + r;
    setRoute(r);
  };

  // Redirect away from routes this role can't access.
  useEffect(() => {
    if (!ROUTE_ROLES[route]?.includes(role)) {
      go("dashboard");
    }
  }, [route, role]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // Apply persisted appearance settings to <html>.
  useEffect(() => {
    const s = settingsQuery.data;
    document.documentElement.dataset.theme = s?.theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.dens = s?.density ?? "regular";
    document.documentElement.dataset.pair = s?.fontPair ?? "default";
  }, [settingsQuery.data]);

  const openPatient = (id: string) => {
    setSelectedPatientId(id);
    go("detail");
  };

  const openInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    go("billing");
  };

  const navKey: Route =
    route === "directory" || route === "detail" || route === "entry" ? "directory" : route;

  const submitGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && globalQ) {
      setDirectoryInitialQuery(globalQ);
      go("directory");
    }
  };

  let screen: React.ReactNode;
  if (route === "directory") {
    screen = <Directory openPatient={openPatient} initialQuery={directoryInitialQuery} isDoctor={isDoctor} />;
  } else if (route === "detail") {
    screen = <PatientDetail go={go} patientId={selectedPatientId} isDoctor={isDoctor} openInvoice={openInvoice} />;
  } else if (route === "entry" && isDoctor) {
    screen = <NewEntry go={go} showToast={showToast} />;
  } else if (route === "schedule") {
    screen = <Schedule showToast={showToast} />;
  } else if (route === "records" && isDoctor) {
    screen = <Records openPatient={openPatient} />;
  } else if (route === "rx" && isDoctor) {
    screen = <RxView id={getRouteId()} />;
  } else if (route === "billing") {
    screen = <Billing showToast={showToast} selectedInvoiceId={selectedInvoiceId} onInvoiceConsumed={() => setSelectedInvoiceId(null)} />;
  } else if (route === "settings") {
    screen = <Settings isDoctor={isDoctor} showToast={showToast} />;
  } else {
    screen = <Dashboard go={go} isDoctor={isDoctor} />;
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div className="brand" onClick={() => go("dashboard")} style={{ cursor: "pointer" }}>
            <span className="brand-mark"><img src={logoUrl} alt="" aria-hidden /></span>
            Ashraf's Dental Care
          </div>
          <nav className="nav-links">
            {NAV_ITEMS.filter((n) => n.roles.includes(role)).map((n) => (
              <button
                key={n.key}
                className={`nav-link ${navKey === n.key ? "active" : ""}`}
                onClick={() => go(n.key)}
                onMouseEnter={() => prefetchRoute(queryClient, n.key, todayYmd())}
              >
                {n.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="nav-right">
          <div className="search">
            <IconSearch size={16} style={{ color: "var(--ink-400)" }} />
            <input
              placeholder="Search patients…"
              value={globalQ}
              onChange={(e) => setGlobalQ(e.target.value)}
              onKeyDown={submitGlobalSearch}
            />
          </div>
          {isDoctor && (
            <button className="btn btn-primary" onClick={() => go("entry")}>
              <IconPlus size={14} /> New Entry
            </button>
          )}
          <AccountMenu onSettings={() => go("settings")} onLogout={logout} />
        </div>
      </header>

      <main style={{ flex: 1 }}>{screen}</main>

      <footer className="footer">
        © {new Date().getFullYear()} Ashraf's Dental Care · Practice Management v{pkg.version}
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--ink-500)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconCalendar size={20} /> Loading…
        </div>
      </div>
    );
  }
  return user ? <Shell /> : <Login />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
