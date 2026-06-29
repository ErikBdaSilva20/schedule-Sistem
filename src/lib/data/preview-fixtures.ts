// PROTEGIDO — fixtures para o editor Sandpack (window.__MASI_PREVIEW__).
// Simula o gateway em memória para o preview por IA funcionar sem backend real.

import type { Database } from "./types.gen";

type Client      = Database["public"]["Tables"]["clients"]["Row"];
type Service     = Database["public"]["Tables"]["services"]["Row"];
type TeamMember  = Database["public"]["Tables"]["team_members"]["Row"];
type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

const now = new Date().toISOString();
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();

const CLIENTS: Client[] = [
  { id: "c1", owner_id: "u1", full_name: "Olivia Bennett", email: "olivia@northwind.io", phone: "+1 415 555 0142", company: "Northwind Labs", notes: "Renovação Q3.", created_at: now, updated_at: now },
  { id: "c2", owner_id: "u1", full_name: "Marcus Hale",    email: "marcus@vellum.co",   phone: "+1 212 555 0188", company: "Vellum & Co.",   notes: "VIP",           created_at: now, updated_at: now },
  { id: "c3", owner_id: "u1", full_name: "Sofia Okafor",   email: "sofia@brightline.studio", phone: "+44 20 7946 0991", company: "Brightline Studio", notes: "", created_at: now, updated_at: now },
];

const SERVICES: Service[] = [
  { id: "s1", name: "Strategy Session", description: "Deep-dive planning.",       duration_minutes: 60,  price: 240, color: "#16c784", active: true,  created_at: now, updated_at: now },
  { id: "s2", name: "Consultation",     description: "Initial intake call.",      duration_minutes: 30,  price: 120, color: "#3b82f6", active: true,  created_at: now, updated_at: now },
  { id: "s3", name: "Training",         description: "Hands-on enablement.",      duration_minutes: 90,  price: 320, color: "#a855f7", active: false, created_at: now, updated_at: now },
];

const TEAM: TeamMember[] = [
  { id: "t1", full_name: "Alex Morgan", email: "alex@hub.app", role: "Senior Consultant", specialty: "Strategy",    active: true,  created_at: now, updated_at: now },
  { id: "t2", full_name: "Priya Shah",  email: "priya@hub.app", role: "Specialist",        specialty: "Onboarding", active: true,  created_at: now, updated_at: now },
];

const APPOINTMENTS: Appointment[] = [
  { id: "a1", owner_id: "u1", client_id: "c1", service_id: "s1", team_member_id: "t1", title: "Strategy Session — Olivia", notes: "", appointment_date: today, appointment_time: "09:00", duration_minutes: 60, status: "confirmed",  created_at: now, updated_at: now },
  { id: "a2", owner_id: "u1", client_id: "c2", service_id: "s2", team_member_id: "t2", title: "Consultation — Marcus",     notes: "", appointment_date: today, appointment_time: "11:00", duration_minutes: 30, status: "scheduled",  created_at: now, updated_at: now },
  { id: "a3", owner_id: "u1", client_id: "c3", service_id: "s1", team_member_id: "t1", title: "Strategy Session — Sofia",  notes: "", appointment_date: today, appointment_time: "14:00", duration_minutes: 60, status: "completed",  created_at: now, updated_at: now },
];

const store: Record<string, Record<string, unknown>[]> = {
  clients:      [...CLIENTS],
  services:     [...SERVICES],
  team_members: [...TEAM],
  appointments: [...APPOINTMENTS],
};

function uid() { return Math.random().toString(36).slice(2, 10); }

export async function previewApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const parts = path.split("/").filter(Boolean); // ['data', 'clients'] or ['data', 'clients', 'id']
  const table = parts[1];
  const id    = parts[2];

  if (!store[table]) store[table] = [];

  await new Promise((r) => setTimeout(r, 60)); // simula latência

  if (method === "GET") return [...store[table]] as unknown as T;

  if (method === "POST") {
    const row = { id: uid(), owner_id: "u1", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...(body as object) };
    store[table].push(row);
    return row as unknown as T;
  }

  if (method === "PATCH") {
    const idx = store[table].findIndex((r) => (r as { id: string }).id === id);
    if (idx !== -1) store[table][idx] = { ...store[table][idx], ...(body as object), updated_at: new Date().toISOString() };
    return store[table][idx] as unknown as T;
  }

  if (method === "DELETE") {
    store[table] = store[table].filter((r) => (r as { id: string }).id !== id);
    return undefined as unknown as T;
  }

  throw new Error(`previewApi: método desconhecido ${method}`);
}
