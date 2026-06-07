import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, clearToken, getToken, setToken } from "../api/client";
import type { ApiUser } from "../api/types";

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  isDoctor: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  // Bootstrap session from a stored token.
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await apiFetch<{ user: ApiUser }>("/auth/me");
        if (!cancelled) setUser(user);
      } catch {
        if (!cancelled) clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // Global 401 → drop the session.
  useEffect(() => {
    const onUnauth = () => setUser(null);
    window.addEventListener("auth:unauthorized", onUnauth);
    return () => window.removeEventListener("auth:unauthorized", onUnauth);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: ApiUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(res.token);
    setUser(res.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isDoctor: user?.role === "DOCTOR", login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
