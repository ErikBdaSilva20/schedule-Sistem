import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Users, Briefcase, UserCog, TrendingUp, Clock, CheckCircle2, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { listAppointments } from "@/lib/data/appointments.repo";
import { listClients }      from "@/lib/data/clients.repo";
import { listServices }     from "@/lib/data/services.repo";
import { listTeamMembers }  from "@/lib/data/team_members.repo";
import { format, isToday, isFuture, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardScreen() {
  const { data: appointments = [] } = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });
  const { data: clients      = [] } = useQuery({ queryKey: ["clients"],      queryFn: listClients });
  const { data: services     = [] } = useQuery({ queryKey: ["services"],     queryFn: listServices });
  const { data: team         = [] } = useQuery({ queryKey: ["team_members"], queryFn: listTeamMembers });

  const now = new Date();
  const monthInt = { start: startOfMonth(now), end: endOfMonth(now) };

  const todayAppts  = appointments.filter((a) => isToday(parseISO(a.appointment_date)));
  const upcoming    = appointments
    .filter((a) => isFuture(parseISO(`${a.appointment_date}T${a.appointment_time}`)))
    .sort((a, b) => (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time));
  const monthAppts  = appointments.filter((a) => isWithinInterval(parseISO(a.appointment_date), monthInt));
  const completed   = appointments.filter((a) => a.status === "completed").length;
  const activeServices = services.filter((s) => s.active).length;
  const activeTeam     = team.filter((t) => t.active).length;

  const kpis = [
    { label: "Hoje",       value: todayAppts.length,  hint: "Agendamentos hoje",  icon: Clock,        accent: "text-primary" },
    { label: "Próximos",   value: upcoming.length,    hint: "Agendados à frente", icon: CalendarDays, accent: "text-info" },
    { label: "Este Mês",   value: monthAppts.length,  hint: "Total de reservas",  icon: TrendingUp,   accent: "text-purple-accent" },
    { label: "Concluídos", value: completed,           hint: "Total geral",        icon: CheckCircle2, accent: "text-primary-light" },
  ];
  const meta = [
    { label: "Total de Clientes",    value: clients.length,    icon: Users,    to: "/clients" },
    { label: "Serviços Ativos",      value: activeServices,    icon: Briefcase,to: "/services" },
    { label: "Membros da Equipe",    value: activeTeam,        icon: UserCog,  to: "/team" },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Visão Geral"
        title="Painel de Operações"
        description="Resumo dos agendamentos de hoje, atividade recente e saúde do pipeline."
        actions={
          <Link to="/appointments" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-light">
            Novo agendamento <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card-surface card-surface-hover p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-strong">{k.label}</div>
              <k.icon className={`h-4 w-4 ${k.accent}`} />
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{k.value}</div>
            <div className="mt-1 text-xs text-secondary">{k.hint}</div>
          </div>
        ))}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        {meta.map((m) => (
          <Link key={m.label} to={m.to} className="card-surface card-surface-hover group flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-card-elevated ring-1 ring-border">
                <m.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm text-secondary">{m.label}</div>
                <div className="text-xl font-semibold">{m.value}</div>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-strong transition group-hover:text-primary" />
          </Link>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Agendamentos de Hoje</h2>
              <p className="text-xs text-secondary">{format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
            </div>
            <Link to="/calendar" className="text-xs text-primary hover:underline">Abrir agenda →</Link>
          </div>
          {todayAppts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-background-secondary/50 px-4 py-10 text-center text-sm text-secondary">Nada na agenda para hoje.</div>
          ) : (
            <ul className="divide-y divide-border">
              {todayAppts.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)).map((a) => {
                const svc = services.find((s) => s.id === a.service_id);
                const cli = clients.find((c) => c.id === a.client_id);
                const tm  = team.find((t) => t.id === a.team_member_id);
                return (
                  <li key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <div className="w-16 shrink-0">
                      <div className="font-mono text-sm font-semibold text-foreground">{a.appointment_time}</div>
                      <div className="text-[11px] text-muted-strong">{a.duration_minutes}m</div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: svc?.color ?? "#16c784" }} />
                        <span className="truncate text-sm font-medium">{a.title}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-secondary">{cli?.full_name ?? "—"} · {tm?.full_name ?? "Não atribuído"}</div>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card-surface p-5">
          <h2 className="text-base font-semibold">Próximos</h2>
          <p className="mb-4 text-xs text-secondary">Próximos 5 da equipe</p>
          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-secondary">Nenhum item próximo.</div>
          ) : (
            <ul className="space-y-3">
              {upcoming.slice(0, 5).map((a) => {
                const svc = services.find((s) => s.id === a.service_id);
                const cli = clients.find((c) => c.id === a.client_id);
                return (
                  <li key={a.id} className="rounded-xl border border-border bg-background-secondary/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{a.title}</div>
                        <div className="truncate text-[11px] text-secondary">{cli?.full_name}</div>
                      </div>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: svc?.color ?? "#16c784" }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-strong">
                      <span>{format(parseISO(a.appointment_date), "d 'de' MMM", { locale: ptBR })} · {a.appointment_time}</span>
                      <StatusBadge status={a.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  );
}
