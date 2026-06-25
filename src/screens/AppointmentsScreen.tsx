import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ListChecks, Filter } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Field, Modal, Select, TextArea, TextInput } from "@/components/ui-kit";
import { listAppointments, createAppointment, updateAppointment, deleteAppointment, type Appointment } from "@/lib/data/appointments.repo";
import { listClients }    from "@/lib/data/clients.repo";
import { listServices }   from "@/lib/data/services.repo";
import { listTeamMembers} from "@/lib/data/team_members.repo";
import { STATUS_LABEL }   from "@/lib/types";
import type { AppointmentStatus } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUSES: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];

function emptyForm(): Omit<Appointment, "id" | "owner_id" | "created_at" | "updated_at"> {
  return { client_id: "", service_id: "", team_member_id: "", title: "", notes: "", appointment_date: format(new Date(), "yyyy-MM-dd"), appointment_time: "09:00", duration_minutes: 30, status: "scheduled" };
}

export default function AppointmentsScreen() {
  const qc = useQueryClient();
  const { data: appointments = [], isLoading } = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });
  const { data: clients      = [] } = useQuery({ queryKey: ["clients"],      queryFn: listClients });
  const { data: services     = [] } = useQuery({ queryKey: ["services"],     queryFn: listServices });
  const { data: team         = [] } = useQuery({ queryKey: ["team_members"], queryFn: listTeamMembers });

  const inv = () => qc.invalidateQueries({ queryKey: ["appointments"] });
  const createM = useMutation({ mutationFn: createAppointment, onSuccess: inv });
  const updateM = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateAppointment>[1] }) => updateAppointment(id, patch), onSuccess: inv });
  const deleteM = useMutation({ mutationFn: deleteAppointment, onSuccess: inv });

  const [filters, setFilters] = useState({ date: "", status: "all", member: "all", service: "all" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(() =>
    appointments
      .filter((a) => !filters.date || a.appointment_date === filters.date)
      .filter((a) => filters.status === "all" || a.status === filters.status)
      .filter((a) => filters.member === "all" || a.team_member_id === filters.member)
      .filter((a) => filters.service === "all" || a.service_id === filters.service)
      .sort((a, b) => (b.appointment_date + b.appointment_time).localeCompare(a.appointment_date + a.appointment_time)),
  [appointments, filters]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const toggleAll = () => setSelected((s) => { const n = new Set(s); allSelected ? filtered.forEach((a) => n.delete(a.id)) : filtered.forEach((a) => n.add(a.id)); return n; });
  const toggleOne = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulkStatus = (st: AppointmentStatus) => { selected.forEach((id) => updateM.mutate({ id, patch: { status: st } })); setSelected(new Set()); };
  const bulkDelete = () => { selected.forEach((id) => deleteM.mutate(id)); setSelected(new Set()); };

  const startNew = () => {
    const f = emptyForm();
    f.client_id = clients[0]?.id ?? ""; f.service_id = services[0]?.id ?? ""; f.team_member_id = team[0]?.id ?? "";
    f.duration_minutes = services[0]?.duration_minutes ?? 30; f.title = services[0]?.name ?? "";
    setEditing(null); setForm(f); setOpen(true);
  };
  const startEdit = (a: Appointment) => { setEditing(a); setForm({ client_id: a.client_id, service_id: a.service_id, team_member_id: a.team_member_id, title: a.title, notes: a.notes, appointment_date: a.appointment_date, appointment_time: a.appointment_time, duration_minutes: a.duration_minutes, status: a.status }); setOpen(true); };
  const save = () => {
    if (!form.client_id || !form.service_id || !form.team_member_id) return;
    if (editing) updateM.mutate({ id: editing.id, patch: form });
    else createM.mutate(form);
    setOpen(false);
  };

  if (isLoading) return <AppShell><div className="flex h-64 items-center justify-center text-sm text-secondary">Carregando agendamentos…</div></AppShell>;

  return (
    <AppShell>
      <PageHeader eyebrow="Operações" title="Agendamentos" description="Pipeline completo com filtros, atualização de status em massa e agendamento rápido." actions={<Button onClick={startNew}><Plus className="h-4 w-4" /> Novo agendamento</Button>} />

      <div className="card-surface mb-3 grid grid-cols-2 gap-2 p-3 md:grid-cols-5">
        <div className="col-span-2 flex items-center gap-2 text-xs text-muted-strong md:col-span-1"><Filter className="h-3.5 w-3.5" /> Filtros</div>
        <TextInput type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">Todos os status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
        <Select value={filters.member} onChange={(e) => setFilters({ ...filters, member: e.target.value })}>
          <option value="all">Toda a equipe</option>
          {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </Select>
        <Select value={filters.service} onChange={(e) => setFilters({ ...filters, service: e.target.value })}>
          <option value="all">Todos os serviços</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="card-surface mb-3 flex flex-wrap items-center justify-between gap-2 border-primary/30 bg-primary/[0.06] p-3">
          <div className="text-sm"><span className="font-semibold text-primary">{selected.size}</span> selecionados</div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => <Button key={s} variant="outline" onClick={() => bulkStatus(s)}>Marcar: {STATUS_LABEL[s]}</Button>)}
            <Button variant="danger" onClick={bulkDelete}><Trash2 className="h-4 w-4" /> Excluir</Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nenhum agendamento" description="Tente ajustar os filtros ou crie um novo agendamento." action={<Button onClick={startNew}><Plus className="h-4 w-4" /> Novo agendamento</Button>} />
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-background-secondary text-[11px] uppercase tracking-wider text-muted-strong">
                <tr>
                  <th className="w-10 px-3 py-2.5"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-primary" /></th>
                  <th className="px-3 py-2.5 text-left">Título</th><th className="px-3 py-2.5 text-left">Cliente</th>
                  <th className="px-3 py-2.5 text-left">Equipe</th><th className="px-3 py-2.5 text-left">Data e Hora</th>
                  <th className="px-3 py-2.5 text-left">Status</th><th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((a) => {
                  const svc = services.find((s) => s.id === a.service_id);
                  const cli = clients.find((c) => c.id === a.client_id);
                  const tm  = team.find((t) => t.id === a.team_member_id);
                  return (
                    <tr key={a.id} className="transition hover:bg-card-hover">
                      <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleOne(a.id)} className="h-4 w-4 accent-primary" /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: svc?.color ?? "#16c784" }} /><span className="font-medium">{a.title}</span></div>
                        <div className="text-[11px] text-muted-strong">{svc?.name}</div>
                      </td>
                      <td className="px-3 py-2.5">{cli?.full_name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-secondary">{tm?.full_name ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{format(parseISO(a.appointment_date), "d MMM yyyy", { locale: ptBR })} · {a.appointment_time}<span className="ml-2 text-muted-strong">({a.duration_minutes}m)</span></td>
                      <td className="px-3 py-2.5"><StatusBadge status={a.status} /></td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => startEdit(a)} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-card-hover"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deleteM.mutate(a.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar agendamento" : "Novo agendamento"} size="lg"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>{editing ? "Salvar alterações" : "Agendar"}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Título" className="col-span-2"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sessão de Estratégia" /></Field>
          <Field label="Cliente"><Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}><option value="">Selecionar cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</Select></Field>
          <Field label="Membro da equipe"><Select value={form.team_member_id} onChange={(e) => setForm({ ...form, team_member_id: e.target.value })}><option value="">Selecionar membro</option>{team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</Select></Field>
          <Field label="Serviço" className="col-span-2">
            <Select value={form.service_id} onChange={(e) => { const svc = services.find((s) => s.id === e.target.value); setForm({ ...form, service_id: e.target.value, duration_minutes: svc?.duration_minutes ?? form.duration_minutes, title: form.title || svc?.name || "" }); }}>
              <option value="">Selecionar serviço</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes}m</option>)}
            </Select>
          </Field>
          <Field label="Data"><TextInput type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} /></Field>
          <Field label="Hora"><TextInput type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} /></Field>
          <Field label="Duração (minutos)"><TextInput type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value || "0", 10) })} /></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AppointmentStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select></Field>
          <Field label="Observações" className="col-span-2"><TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
