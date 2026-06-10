import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { apiFetch, type ParamMap } from "./client";
import type {
  ApiAppointment,
  ApiInvoice,
  ApiPatientBundle,
  ApiPrescription,
  ApiSettings,
  ApiSlotAvailability,
  ApiStats,
  ApiUser,
  PatientListResponse,
} from "./types";

// ---------- Stats ----------
export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: () => apiFetch<ApiStats>("/stats") });
}

// ---------- Prefetch ----------
// Warm a route's primary query (on login / nav hover) so the screen has data ready
// the moment it mounts. Query keys + params must match the screens' useQuery calls
// exactly, or the prefetch lands in a different cache slot and does nothing.
export function prefetchRoute(qc: QueryClient, route: string, today: string) {
  const pf = (queryKey: unknown[], path: string, params?: ParamMap) =>
    qc.prefetchQuery({ queryKey, queryFn: () => apiFetch(path, params ? { params } : undefined) });
  switch (route) {
    case "dashboard":
    case "schedule":
      pf(["stats"], "/stats");
      pf(["appointments", { date: today }], "/appointments", { date: today });
      break;
    case "directory": {
      const params = { q: "", status: "", sort: "recent", page: 1, pageSize: 8 };
      pf(["patients", params], "/patients", params as ParamMap);
      break;
    }
    case "records":
      pf(["prescriptions", { limit: 2000 }], "/prescriptions", { limit: 2000 });
      break;
    case "billing":
      pf(["stats"], "/stats");
      pf(["invoices", {}], "/billing/invoices");
      break;
  }
}

// ---------- Patients ----------
export interface PatientQuery {
  q?: string;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function usePatients(params: PatientQuery) {
  return useQuery({
    queryKey: ["patients", params],
    queryFn: () => apiFetch<PatientListResponse>("/patients", { params: params as ParamMap }),
    // Keep the prior page/search result on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string | null) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => apiFetch<ApiPatientBundle>(`/patients/${id}`),
    enabled: !!id,
  });
}

export interface PatientInput {
  name: string;
  phone: string;
  email?: string;
  age: number;
  gender: string;
  blood?: string | null;
  status?: string;
  risk?: string;
  conditions?: string;
  allergies?: string;
  medications?: string;
  address?: string;
}

export function useSavePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id?: string; data: PatientInput }) =>
      apiFetch(vars.id ? `/patients/${vars.id}` : "/patients", {
        method: vars.id ? "PUT" : "POST",
        body: vars.data,
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      if (vars.id) qc.invalidateQueries({ queryKey: ["patient", vars.id] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ---------- Appointments (shared website table) ----------
export interface AppointmentQuery {
  date?: string; // YYYY-MM-DD (single day)
  status?: string; // pending | confirmed | cancelled
  today?: boolean;
}

// Light, per-call React Query knobs so each screen can pick its own polling cadence.
// (Kept small on purpose — appointment data is the only place we need live refresh.)
interface LiveQueryOptions {
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  enabled?: boolean;
}

export function useAppointments(params: AppointmentQuery, options?: LiveQueryOptions) {
  return useQuery({
    queryKey: ["appointments", params],
    queryFn: () => apiFetch<ApiAppointment[]>("/appointments", { params: params as ParamMap }),
    // Changing day/status keeps the previous list visible instead of blanking.
    placeholderData: keepPreviousData,
    ...options,
  });
}

// Which of the fixed slots are taken on a given day (for the manual-create picker).
export function useSlotAvailability(date: string | null, options?: LiveQueryOptions) {
  return useQuery({
    queryKey: ["appointment-availability", date],
    queryFn: () =>
      apiFetch<ApiSlotAvailability>("/appointments/availability", { params: { date } }),
    enabled: !!date,
    ...options,
  });
}

export interface AppointmentInput {
  fullName: string;
  contactNumber: string;
  email?: string;
  reason?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // fixed slot label
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AppointmentInput) =>
      apiFetch<ApiAppointment>("/appointments", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment-availability"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    // On a 409 (slot taken by the website a beat earlier), refetch so the picker
    // greys out the just-taken slot immediately rather than at the next poll tick.
    onError: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment-availability"] });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      data: { status?: string; appointmentDate?: string; appointmentTime?: string };
    }) => apiFetch<ApiAppointment>(`/appointments/${vars.id}`, { method: "PATCH", body: vars.data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment-availability"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    // Same as create: a 409 on reschedule means the target slot was just taken — refetch now.
    onError: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment-availability"] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/appointments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment-availability"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// Refresh every appointment-derived surface after a lock/unlock.
function invalidateSlots(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["appointment-availability"] });
  qc.invalidateQueries({ queryKey: ["appointments"] });
  qc.invalidateQueries({ queryKey: ["stats"] });
}

// Lock a free slot so it can't be booked on the website or front desk.
export function useLockSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { date: string; time: string }) =>
      apiFetch("/appointments/locks", { method: "POST", body: vars }),
    onSuccess: () => invalidateSlots(qc),
    // On a 409 (slot taken/locked a beat earlier), refetch so the grid reflects reality.
    onError: () => invalidateSlots(qc),
  });
}

// Release a locked slot by its lock-row id (from the availability response).
export function useUnlockSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lockId: string) => apiFetch(`/appointments/locks/${lockId}`, { method: "DELETE" }),
    onSuccess: () => invalidateSlots(qc),
  });
}

// ---------- Prescriptions ----------
export function usePrescriptions(params: { q?: string; patientId?: string; limit?: number }) {
  return useQuery({
    queryKey: ["prescriptions", params],
    queryFn: () => apiFetch<ApiPrescription[]>("/prescriptions", { params }),
    placeholderData: keepPreviousData,
  });
}

export function usePrescription(id: string | null) {
  return useQuery({
    queryKey: ["prescription", id],
    queryFn: () => apiFetch<ApiPrescription>(`/prescriptions/${id}`),
    enabled: !!id,
  });
}

export interface PrescriptionInput {
  patientId?: string;
  newPatient?: { name: string; phone: string; age: number; gender: string };
  complaint?: string;
  observation?: string;
  diagnosis?: string;
  treatment?: string;
  advice?: string;
  teeth?: Record<string, string>;
  tests?: string[];
  meds?: { name: string; dose: string; days: string }[];
  invoiceAmount?: number;
}

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PrescriptionInput) =>
      apiFetch<ApiPrescription>("/prescriptions", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      name?: string;
      phone?: string;
      age?: number;
      gender?: string;
      [k: string]: unknown;
    }) => apiFetch(`/patients/${vars.id}`, { method: "PUT", body: vars }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient", vars.id] });
    },
  });
}

// ---------- Clinical notes ----------
export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { patientId: string; title: string; body: string; verified?: boolean }) =>
      apiFetch("/notes", { method: "POST", body: data }),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["patient", vars.patientId] }),
  });
}

// ---------- Billing ----------
export function useInvoices(params: { patientId?: string; status?: string }) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => apiFetch<ApiInvoice[]>("/billing/invoices", { params }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      patientId: string;
      lineItems: { description: string; amount: number }[];
    }) => apiFetch<ApiInvoice>("/billing/invoices", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { invoiceId: string; amount: number; method?: string }) =>
      apiFetch<ApiInvoice>(`/billing/invoices/${vars.invoiceId}/payments`, {
        method: "POST",
        body: { amount: vars.amount, method: vars.method },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

// ---------- Settings ----------
export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => apiFetch<ApiSettings>("/settings") });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ApiSettings>) =>
      apiFetch<ApiSettings>("/settings", { method: "PUT", body: data }),
    onSuccess: (data) => qc.setQueryData(["settings"], data),
  });
}

// ---------- Users (doctor only) ----------
export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => apiFetch<ApiUser[]>("/users") });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string }) =>
      apiFetch<ApiUser>("/users", { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      data: { name?: string; role?: string; active?: boolean; password?: string };
    }) => apiFetch<ApiUser>(`/users/${vars.id}`, { method: "PATCH", body: vars.data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<ApiUser>(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ---------- Admin (doctor only) ----------
export interface WipeResult {
  ok: boolean;
  deleted: Record<string, number>;
}

// Permanently deletes all patient/clinical data (keeps staff accounts + settings),
// then refreshes every data-backed screen.
export function useWipeData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<WipeResult>("/admin/wipe", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
