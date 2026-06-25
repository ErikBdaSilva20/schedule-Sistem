import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, UserCog, Mail } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button, Field, Modal, TextInput } from "@/components/ui-kit";
import { listTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember, type TeamMember } from "@/lib/data/team_members.repo";
import { listAppointments } from "@/lib/data/appointments.repo";
import { useIsAdmin } from "@/lib/auth";

const empty: Omit<TeamMember, "id" | "created_at" | "updated_at"> = { full_name: "", email: "", role: "", specialty: "", active: true };

export default function TeamScreen() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const { data: team         = [], isLoading } = useQuery({ queryKey: ["team_members"], queryFn: listTeamMembers });
  const { data: appointments = [] }            = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });

  const inv = () => qc.invalidateQueries({ queryKey: ["team_members"] });
  const createM = useMutation({ mutationFn: createTeamMember, onSuccess: inv });
  const updateM = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateTeamMember>[1] }) => updateTeamMember(id, patch), onSuccess: inv });
  const deleteM = useMutation({ mutationFn: deleteTeamMember, onSuccess: inv });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState(empty);

  const startNew  = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (m: TeamMember) => { setEditing(m); setForm({ full_name: m.full_name, email: m.email, role: m.role, specialty: m.specialty, active: m.active }); setOpen(true); };
  const save = () => {
    if (!form.full_name.trim()) return;
    if (editing) updateM.mutate({ id: editing.id, patch: form });
    else createM.mutate(form);
    setOpen(false);
  };

  if (isLoading) return <AppShell><div className="flex h-64 items-center justify-center text-sm text-secondary">Carregando equipe…</div></AppShell>;

  return (
    <AppShell>
      <PageHeader eyebrow="Pessoas" title="Equipe" description="Os profissionais que entregam seus serviços." actions={isAdmin ? <Button onClick={startNew}><Plus className="h-4 w-4" /> Adicionar membro</Button> : undefined} />

      {team.length === 0 ? (
        <EmptyState icon={UserCog} title="Nenhum membro na equipe" description="Convide o primeiro membro para começar a agendar." action={isAdmin ? <Button onClick={startNew}><Plus className="h-4 w-4" /> Adicionar membro</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {team.map((m) => {
            const count = appointments.filter((a) => a.team_member_id === m.id).length;
            return (
              <div key={m.id} className="card-surface card-surface-hover relative overflow-hidden p-5">
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/10 to-transparent" />
                <div className="relative flex items-start justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary/60 to-info/60 text-sm font-semibold ring-1 ring-border">{m.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(m)} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card hover:bg-card-hover"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteM.mutate(m.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
                <div className="mt-3"><div className="text-sm font-semibold">{m.full_name}</div><div className="text-[11px] text-muted-strong">{m.role || "—"}</div></div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 truncate text-[11px] text-secondary"><Mail className="h-3 w-3 text-muted-strong" />{m.email}</div>
                  {m.specialty && <div className="inline-flex rounded-md border border-border bg-background-secondary px-2 py-0.5 text-[11px] text-secondary">{m.specialty}</div>}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <div><div className="text-[10px] uppercase tracking-wider text-muted-strong">Agendamentos</div><div className="text-sm font-semibold">{count}</div></div>
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${m.active ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted-strong"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${m.active ? "bg-primary" : "bg-muted-foreground"}`} />
                    {m.active ? "Disponível" : "Indisponível"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar membro" : "Adicionar membro"}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>{editing ? "Salvar" : "Adicionar"}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome completo" className="col-span-2"><TextInput value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="E-mail" className="col-span-2"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Função"><TextInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Consultor Sênior" /></Field>
          <Field label="Especialidade"><TextInput value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Estratégia" /></Field>
          <Field label="Status" className="col-span-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-primary" />Disponível para agendamentos</label></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
