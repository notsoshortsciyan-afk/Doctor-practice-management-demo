const TOKEN_KEY = "dcp_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ParamMap = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: ParamMap;
}

function queryString(params?: ParamMap): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`/api${path}${queryString(opts.params)}`, {
    method: opts.method ?? "GET",
    headers,
    body,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("auth:unauthorized"));
  }

  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || res.statusText);
  }
  return data as T;
}
