import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Field, Modal, Select, TextArea, TextInput, ConfirmDialog, useConfirmDelete } from "@/components/ui-kit";
import {
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
  type Appointment,
} from "@/lib/data/appointments.repo";
import { listClients } from "@/lib/data/clients.repo";
import { listServices } from "@/lib/data/services.repo";
import { listTeamMembers } from "@/lib/data/team_members.repo";
import type { AppointmentStatus } from "@/lib/types";
import { STATUS_LABEL, deriveStatus } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { Filter, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const TZ = "America/Sao_Paulo";

const STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

// Inclui 'late' apenas para filtro e exibição (não é status editável via modal — é derivado ou salvo automaticamente)
const FILTER_STATUSES = [...STATUSES, "late"] as const;

function emptyForm(): Omit<Appointment, "id" | "owner_id" | "created_at" | "updated_at"> {
  return {
    client_id: "",
    service_id: "",
    team_member_id: "",
    title: "",
    notes: "",
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    appointment_time: "09:00",
    duration_minutes: 30,
    status: "scheduled",
  };
}

export default function AppointmentsScreen() {
  const location = useLocation();
  const highlightId = (location.state as { highlight?: string } | null)?.highlight ?? null;
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (!highlightId) return;
    const el = rowRefs.current[highlightId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("row-highlight");
    const t = setTimeout(() => el.classList.remove("row-highlight"), 2100);
    return () => clearTimeout(t);
  }, [highlightId]);

  const qc = useQueryClient();
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: listAppointments,
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: listServices });
  const { data: team = [] } = useQuery({ queryKey: ["team_members"], queryFn: listTeamMembers });

  const confirmDelete = useConfirmDelete();

  const inv = () => qc.invalidateQueries({ queryKey: ["appointments"] });
  const createM = useMutation({ mutationFn: createAppointment, onSuccess: inv });
  const updateM = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateAppointment>[1] }) =>
      updateAppointment(id, patch),
    onSuccess: inv,
  });
  const deleteM = useMutation({ mutationFn: deleteAppointment, onSuccess: inv });

  const [filters, setFilters] = useState({
    date: "",
    status: "all",
    member: "all",
    service: "all",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      appointments
        .filter((a) => !filters.date || a.appointment_date === filters.date)
        .filter((a) => filters.status === "all" || deriveStatus(a.status, a.appointment_date, a.appointment_time) === filters.status)
        .filter((a) => filters.member === "all" || a.team_member_id === filters.member)
        .filter((a) => filters.service === "all" || a.service_id === filters.service)
        .sort((a, b) =>
          (b.appointment_date + b.appointment_time).localeCompare(
            a.appointment_date + a.appointment_time,
          ),
        ),
    [appointments, filters],
  );

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      allSelected ? filtered.forEach((a) => n.delete(a.id)) : filtered.forEach((a) => n.add(a.id));
      return n;
    });
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const bulkStatus = (st: AppointmentStatus) => {
    selected.forEach((id) => updateM.mutate({ id, patch: { status: st } }));
    setSelected(new Set());
  };
  const bulkDelete = () => {
    confirmDelete.ask(() => {
      selected.forEach((id) => deleteM.mutate(id));
      setSelected(new Set());
    });
  };

  const nowBrasilia = toZonedTime(new Date(), TZ);
  const minDate = format(nowBrasilia, "yyyy-MM-dd");
  const isToday = form.appointment_date === minDate;
  const minTime = isToday ? format(nowBrasilia, "HH:mm") : undefined;

  const startNew = () => {
    const f = emptyForm();
    f.client_id = clients[0]?.id ?? "";
    f.service_id = services[0]?.id ?? "";
    f.team_member_id = team[0]?.id ?? "";
    f.duration_minutes = services[0]?.duration_minutes ?? 30;
    f.title = services[0]?.name ?? "";
    setEditing(null);
    setForm(f);
    setErrors({});
    setOpen(true);
  };
  const startEdit = (a: Appointment) => {
    setEditing(a);
    setForm({
      client_id: a.client_id,
      service_id: a.service_id,
      team_member_id: a.team_member_id,
      title: a.title,
      notes: a.notes,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      duration_minutes: a.duration_minutes,
      status: a.status,
    });
    setErrors({});
    setOpen(true);
  };
  const save = () => {
    const errs: Record<string, string> = {};
    if (!form.client_id) errs.client_id = "Selecione um cliente";
    if (!form.service_id) errs.service_id = "Selecione um serviço";
    if (!form.team_member_id) errs.team_member_id = "Selecione um membro da equipe";
    const apptDate = fromZonedTime(`${form.appointment_date}T${form.appointment_time}`, TZ);
    if (apptDate < new Date())
      errs.appointment_date = "O agendamento deve ser em uma data e hora futura";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (editing) updateM.mutate({ id: editing.id, patch: form });
    else createM.mutate(form);
    setOpen(false);
  };

  if (isLoading)
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-sm text-secondary">
          Carregando agendamentos…
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operações"
        title="Agendamentos"
        description="Pipeline completo com filtros, atualização de status em massa e agendamento rápido."
        actions={
          <Button onClick={startNew}>
            <Plus className="h-4 w-4" /> Novo agendamento
          </Button>
        }
      />

      <div className="card-surface mb-3 grid grid-cols-2 gap-2 p-3 md:grid-cols-5">
        <div className="col-span-2 flex items-center gap-2 text-xs text-muted-strong md:col-span-1">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </div>
        <TextInput
          type="date"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
        />
        <Select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="all">Todos os status</option>
          {FILTER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select
          value={filters.member}
          onChange={(e) => setFilters({ ...filters, member: e.target.value })}
        >
          <option value="all">Toda a equipe</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </Select>
        <Select
          value={filters.service}
          onChange={(e) => setFilters({ ...filters, service: e.target.value })}
        >
          <option value="all">Todos os serviços</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="card-surface mb-3 flex flex-wrap items-center justify-between gap-2 border-primary/30 bg-primary/[0.06] p-3">
          <div className="text-sm">
            <span className="font-semibold text-primary">{selected.size}</span> selecionados
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Button key={s} variant="outline" onClick={() => bulkStatus(s)}>
                Marcar: {STATUS_LABEL[s]}
              </Button>
            ))}
            <Button variant="danger" onClick={bulkDelete}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nenhum agendamento"
          description="Tente ajustar os filtros ou crie um novo agendamento."
          action={
            <Button onClick={startNew}>
              <Plus className="h-4 w-4" /> Novo agendamento
            </Button>
          }
        />
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-background-secondary text-[11px] uppercase tracking-wider text-muted-strong">
                <tr>
                  <th className="w-14 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-5 w-5 accent-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Título</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Equipe</th>
                  <th className="px-4 py-3 text-left">Data e Hora</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((a) => {
                  const svc = services.find((s) => s.id === a.service_id);
                  const cli = clients.find((c) => c.id === a.client_id);
                  const tm = team.find((t) => t.id === a.team_member_id);
                  const displayStatus = deriveStatus(a.status, a.appointment_date, a.appointment_time);
                  return (
                    <tr
                      key={a.id}
                      ref={(el) => { rowRefs.current[a.id] = el; }}
                      className="transition-colors hover:bg-card-hover"
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(a.id)}
                          onChange={() => toggleOne(a.id)}
                          className="h-5 w-5 accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: svc?.color ?? "#16c784" }}
                          />
                          <span className="font-semibold">{a.title}</span>
                        </div>
                        <div className="mt-0.5 pl-5 text-[11px] text-muted-strong">{svc?.name}</div>
                      </td>
                      <td className="px-4 py-4 font-medium">{cli?.full_name ?? "—"}</td>
                      <td className="px-4 py-4 text-secondary">{tm?.full_name ?? "—"}</td>
                      <td className="px-4 py-4 font-mono text-xs">
                        <div>
                          {(() => { try { return format(new Date(`${a.appointment_date}T12:00:00`), "d MMM yyyy", { locale: ptBR }); } catch { return a.appointment_date ?? "—"; } })()}
                        </div>
                        <div className="mt-0.5 text-muted-strong">
                          {a.appointment_time} <span className="opacity-60">· {a.duration_minutes}m</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={displayStatus} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => startEdit(a)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-card-hover transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => confirmDelete.ask(() => deleteM.mutate(a.id))}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </button>
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar agendamento" : "Novo agendamento"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>{editing ? "Salvar alterações" : "Agendar"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Título" className="col-span-2">
            <TextInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Sessão de Estratégia"
            />
          </Field>
          <Field label="Cliente" error={errors.client_id}>
            <Select
              value={form.client_id}
              onChange={(e) => {
                setForm({ ...form, client_id: e.target.value });
                setErrors((prev) => ({ ...prev, client_id: "" }));
              }}
            >
              <option value="">Selecionar cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Membro da equipe" error={errors.team_member_id}>
            <Select
              value={form.team_member_id}
              onChange={(e) => {
                setForm({ ...form, team_member_id: e.target.value });
                setErrors((prev) => ({ ...prev, team_member_id: "" }));
              }}
            >
              <option value="">Selecionar membro</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Serviço" className="col-span-2" error={errors.service_id}>
            <Select
              value={form.service_id}
              onChange={(e) => {
                const svc = services.find((s) => s.id === e.target.value);
                setForm({
                  ...form,
                  service_id: e.target.value,
                  duration_minutes: svc?.duration_minutes ?? form.duration_minutes,
                  title: form.title || svc?.name || "",
                });
                setErrors((prev) => ({ ...prev, service_id: "" }));
              }}
            >
              <option value="">Selecionar serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration_minutes}m
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data" error={errors.appointment_date}>
            <TextInput
              type="date"
              min={minDate}
              value={form.appointment_date}
              onChange={(e) => {
                setForm({ ...form, appointment_date: e.target.value });
                setErrors((prev) => ({ ...prev, appointment_date: "" }));
              }}
            />
          </Field>
          <Field label="Hora">
            <TextInput
              type="time"
              min={minTime}
              value={form.appointment_time}
              onChange={(e) => {
                setForm({ ...form, appointment_time: e.target.value });
                setErrors((prev) => ({ ...prev, appointment_date: "" }));
              }}
            />
          </Field>
          <Field label="Duração (minutos)">
            <TextInput
              type="number"
              min={5}
              step={5}
              value={form.duration_minutes}
              onChange={(e) =>
                setForm({ ...form, duration_minutes: parseInt(e.target.value || "0", 10) })
              }
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AppointmentStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações" className="col-span-2">
            <TextArea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete.isOpen}
        description="Esta ação não pode ser desfeita."
        onConfirm={confirmDelete.confirm}
        onCancel={confirmDelete.cancel}
      />
    </AppShell>
  );
}
