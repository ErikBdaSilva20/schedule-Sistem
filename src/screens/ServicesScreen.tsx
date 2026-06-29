import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Briefcase, Clock, DollarSign } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button, Field, Modal, TextArea, TextInput, ConfirmDialog, useConfirmDelete } from "@/components/ui-kit";
import { listServices, createService, updateService, deleteService, type Service } from "@/lib/data/services.repo";
import { useIsAdmin } from "@/lib/auth";

const PALETTE = ["#16c784", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#22d393", "#0ea5e9", "#ec4899"];
const empty: Omit<Service, "id" | "created_at" | "updated_at"> = { name: "", description: "", duration_minutes: 30, price: 0, color: PALETTE[0], active: true };

export default function ServicesScreen() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const { data: services = [], isLoading } = useQuery({ queryKey: ["services"], queryFn: listServices });

  const inv = () => qc.invalidateQueries({ queryKey: ["services"] });
  const createM = useMutation({ mutationFn: createService, onSuccess: inv });
  const updateM = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateService>[1] }) => updateService(id, patch), onSuccess: inv });
  const deleteM = useMutation({ mutationFn: deleteService, onSuccess: inv });
  const confirmDelete = useConfirmDelete();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(empty);

  const startNew  = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (s: Service) => { setEditing(s); setForm({ name: s.name, description: s.description, duration_minutes: s.duration_minutes, price: s.price, color: s.color, active: s.active }); setOpen(true); };
  const save = () => {
    if (!form.name.trim()) return;
    if (editing) updateM.mutate({ id: editing.id, patch: form });
    else createM.mutate(form);
    setOpen(false);
  };

  if (isLoading) return <AppShell><div className="flex h-64 items-center justify-center text-sm text-secondary">Carregando serviços…</div></AppShell>;

  return (
    <AppShell>
      <PageHeader eyebrow="Catálogo" title="Serviços" description="Configure as ofertas agendáveis que sua equipe entrega." actions={isAdmin ? <Button onClick={startNew}><Plus className="h-4 w-4" /> Novo serviço</Button> : undefined} />

      {services.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nenhum serviço ainda" description="Crie sua primeira oferta agendável." action={isAdmin ? <Button onClick={startNew}><Plus className="h-4 w-4" /> Novo serviço</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className="card-surface card-surface-hover flex flex-col p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: s.color }} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11px]">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.active ? "bg-primary shadow-[0_0_6px_var(--primary-glow)]" : "bg-muted-foreground"}`} />
                      <span className={s.active ? "text-primary" : "text-muted-strong"}>{s.active ? "Ativo" : "Inativo"}</span>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(s)} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-card-hover"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => confirmDelete.ask(() => deleteM.mutate(s.id))} className="cursor-pointer grid h-8 w-8 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
              <p className="mb-4 line-clamp-2 text-xs text-secondary">{s.description || "Sem descrição."}</p>
              <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                <div><div className="flex items-center gap-1 text-muted-strong"><Clock className="h-3 w-3" /> Duração</div><div className="font-mono text-sm font-semibold">{s.duration_minutes}m</div></div>
                <div><div className="flex items-center gap-1 text-muted-strong"><DollarSign className="h-3 w-3" /> Preço</div><div className="font-mono text-sm font-semibold">R${s.price}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar serviço" : "Novo serviço"}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome" className="col-span-2"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sessão de Estratégia" /></Field>
          <Field label="Descrição" className="col-span-2"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Duração (minutos)"><TextInput type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value || "0", 10) })} /></Field>
          <Field label="Preço (R$)"><TextInput type="number" min={0} step={1} value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value || "0") })} /></Field>
          <Field label="Cor" className="col-span-2">
            <div className="flex flex-wrap gap-2">{PALETTE.map((c) => <button type="button" key={c} onClick={() => setForm({ ...form, color: c })} className={`h-7 w-7 rounded-lg ring-2 transition ${form.color === c ? "ring-foreground" : "ring-transparent"}`} style={{ background: c }} />)}</div>
          </Field>
          <Field label="Status" className="col-span-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-primary" />Ativo e disponível para agendamento</label>
          </Field>
        </div>
      </Modal>
      <ConfirmDialog open={confirmDelete.isOpen} description="Esta ação não pode ser desfeita." onConfirm={confirmDelete.confirm} onCancel={confirmDelete.cancel} />
    </AppShell>
  );
}
