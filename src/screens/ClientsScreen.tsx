import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Mail, Phone, Building2, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button, Field, Modal, TextArea, TextInput } from "@/components/ui-kit";
import { listClients, createClient, updateClient, deleteClient, type Client } from "@/lib/data/clients.repo";
import { listAppointments } from "@/lib/data/appointments.repo";
import { STATUS_LABEL } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const empty: Omit<Client, "id" | "owner_id" | "created_at" | "updated_at"> = { full_name: "", email: "", phone: "", company: "", notes: "" };

export default function ClientsScreen() {
  const qc = useQueryClient();
  const { data: clients      = [], isLoading } = useQuery({ queryKey: ["clients"],      queryFn: listClients });
  const { data: appointments = [] }            = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });

  const inv = () => qc.invalidateQueries({ queryKey: ["clients"] });
  const createM = useMutation({ mutationFn: createClient, onSuccess: inv });
  const updateM = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateClient>[1] }) => updateClient(id, patch), onSuccess: inv });
  const deleteM = useMutation({ mutationFn: deleteClient, onSuccess: inv });

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [form, setForm] = useState(empty);

  const filtered = useMemo(() => { const t = q.toLowerCase(); return clients.filter((c) => [c.full_name, c.email, c.phone, c.company].join(" ").toLowerCase().includes(t)); }, [clients, q]);

  const startNew  = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (c: Client) => { setEditing(c); setForm({ full_name: c.full_name, email: c.email, phone: c.phone, company: c.company, notes: c.notes }); setOpen(true); };
  const save = () => {
    if (!form.full_name.trim()) return;
    if (editing) updateM.mutate({ id: editing.id, patch: form });
    else createM.mutate(form);
    setOpen(false);
  };

  if (isLoading) return <AppShell><div className="flex h-64 items-center justify-center text-sm text-secondary">Carregando clientes…</div></AppShell>;

  return (
    <AppShell>
      <PageHeader eyebrow="CRM" title="Clientes" description="Diretório pesquisável de todos que sua equipe atende." actions={<Button onClick={startNew}><Plus className="h-4 w-4" /> Novo cliente</Button>} />

      <div className="card-surface mb-4 flex items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 text-muted-strong" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail, empresa…" className="w-full bg-transparent text-sm placeholder:text-muted-strong/70 focus:outline-none" />
        <span className="text-[11px] text-muted-strong">{filtered.length} de {clients.length}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente ainda" description="Adicione seu primeiro cliente para rastrear agendamentos e notas." action={<Button onClick={startNew}><Plus className="h-4 w-4" /> Novo cliente</Button>} />
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3 border-b border-border bg-background-secondary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-strong">
            <div>Nome</div><div className="hidden md:block">Contato</div><div className="hidden lg:block">Empresa</div><div className="hidden md:block">Reservas</div><div className="text-right">Ações</div>
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((c) => {
              const count = appointments.filter((a) => a.client_id === c.id).length;
              return (
                <li key={c.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-card-hover">
                  <button onClick={() => setViewing(c)} className="flex min-w-0 items-center gap-3 text-left">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-info/40 text-xs font-semibold">{c.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div>
                    <div className="min-w-0"><div className="truncate text-sm font-medium">{c.full_name}</div><div className="truncate text-[11px] text-muted-strong md:hidden">{c.email}</div></div>
                  </button>
                  <div className="hidden min-w-0 md:block">
                    <div className="flex items-center gap-1.5 truncate text-xs text-secondary"><Mail className="h-3 w-3" />{c.email}</div>
                    <div className="flex items-center gap-1.5 truncate text-[11px] text-muted-strong"><Phone className="h-3 w-3" />{c.phone}</div>
                  </div>
                  <div className="hidden min-w-0 truncate text-sm text-secondary lg:block">{c.company || "—"}</div>
                  <div className="hidden text-sm text-secondary md:block">{count}</div>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => startEdit(c)} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-card-hover"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteM.mutate(c.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar cliente" : "Novo cliente"} description="Dados de contato e notas sobre este cliente."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>{editing ? "Salvar alterações" : "Criar cliente"}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome completo" className="col-span-2"><TextInput value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Maria Souza" /></Field>
          <Field label="E-mail"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@empresa.com.br" /></Field>
          <Field label="Telefone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+55 11 90000-0000" /></Field>
          <Field label="Empresa" className="col-span-2"><TextInput value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Ltda." /></Field>
          <Field label="Observações" className="col-span-2"><TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Algo que a equipe precisa saber…" /></Field>
        </div>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.full_name ?? ""} description={viewing ? `Cliente desde ${format(parseISO(viewing.created_at), "d MMM yyyy", { locale: ptBR })}` : ""} size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoRow icon={Mail} label="E-mail" value={viewing.email} />
              <InfoRow icon={Phone} label="Telefone" value={viewing.phone} />
              <InfoRow icon={Building2} label="Empresa" value={viewing.company || "—"} />
            </div>
            {viewing.notes && <div className="rounded-xl border border-border bg-background-secondary p-3 text-sm text-secondary">{viewing.notes}</div>}
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-strong">Histórico de agendamentos</div>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {appointments.filter((a) => a.client_id === viewing.id).length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-secondary">Nenhum agendamento ainda.</li>
                ) : appointments.filter((a) => a.client_id === viewing.id).sort((a, b) => (b.appointment_date + b.appointment_time).localeCompare(a.appointment_date + a.appointment_time)).map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0"><div className="truncate font-medium">{a.title}</div><div className="text-[11px] text-muted-strong">{a.appointment_date} · {a.appointment_time}</div></div>
                    <span className="text-[11px] uppercase tracking-wider text-secondary">{STATUS_LABEL[a.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background-secondary p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-strong"><Icon className="h-3 w-3" /> {label}</div>
      <div className="mt-1 truncate text-sm">{value}</div>
    </div>
  );
}
