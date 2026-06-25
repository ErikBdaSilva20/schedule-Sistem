import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { listAppointments } from "@/lib/data/appointments.repo";
import { listServices }     from "@/lib/data/services.repo";
import { listClients }      from "@/lib/data/clients.repo";
import { listTeamMembers }  from "@/lib/data/team_members.repo";

type View = "day" | "week" | "month";

export default function CalendarScreen() {
  const { data: appointments = [] } = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });
  const { data: services     = [] } = useQuery({ queryKey: ["services"],     queryFn: listServices });
  const { data: clients      = [] } = useQuery({ queryKey: ["clients"],      queryFn: listClients });
  const { data: team         = [] } = useQuery({ queryKey: ["team_members"], queryFn: listTeamMembers });

  const [view, setView]     = useState<View>("week");
  const [cursor, setCursor] = useState<Date>(new Date());

  const shift = (dir: number) => {
    if (view === "day")   setCursor((d) => addDays(d, dir));
    else if (view === "week") setCursor((d) => addDays(d, dir * 7));
    else setCursor((d) => addMonths(d, dir));
  };

  const days = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "week") { const s = startOfWeek(cursor, { weekStartsOn: 1 }); return Array.from({ length: 7 }).map((_, i) => addDays(s, i)); }
    const s = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const e = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const arr: Date[] = []; let d = s;
    while (d <= e) { arr.push(d); d = addDays(d, 1); }
    return arr;
  }, [view, cursor]);

  const apptsByDay = useMemo(() => {
    const m = new Map<string, typeof appointments>();
    for (const a of appointments) { const k = a.appointment_date; if (!m.has(k)) m.set(k, []); m.get(k)!.push(a); }
    for (const v of m.values()) v.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    return m;
  }, [appointments]);

  const headerLabel = view === "month"
    ? format(cursor, "MMMM 'de' yyyy", { locale: ptBR })
    : view === "week"
      ? `${format(days[0], "d 'de' MMM", { locale: ptBR })} – ${format(days[6], "d 'de' MMM',' yyyy", { locale: ptBR })}`
      : format(cursor, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <AppShell>
      <PageHeader eyebrow="Calendário" title="Agenda" description="Visualize agendamentos da equipe com serviços por cores."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs">
              {(["day","week","month"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 capitalize transition ${view===v?"bg-primary/15 text-primary":"text-secondary hover:text-foreground"}`}>
                  {{ day:"Dia", week:"Semana", month:"Mês" }[v]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card hover:bg-card-hover"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setCursor(new Date())} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-card-hover">Hoje</button>
              <button onClick={() => shift(1)}  className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card hover:bg-card-hover"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        }
      />

      <div className="mb-3 text-sm font-medium text-secondary">{headerLabel}</div>

      {view === "month" ? (
        <div className="card-surface overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-background-secondary text-[11px] font-semibold uppercase tracking-wider text-muted-strong">
            {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((d) => <div key={d} className="px-3 py-2.5">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = apptsByDay.get(format(d,"yyyy-MM-dd")) ?? [];
              const muted = !isSameMonth(d, cursor);
              const today = isSameDay(d, new Date());
              return (
                <div key={d.toISOString()} className={`min-h-[110px] border-b border-r border-border p-2 ${muted?"bg-background-secondary/40":""}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`grid h-6 w-6 place-items-center rounded-md text-xs ${today?"bg-primary text-primary-foreground":muted?"text-muted-strong":"text-secondary"}`}>{format(d,"d")}</span>
                    {list.length > 0 && <span className="text-[10px] text-muted-strong">{list.length}</span>}
                  </div>
                  <div className="space-y-1">
                    {list.slice(0,3).map((a) => { const svc=services.find((s)=>s.id===a.service_id); return (
                      <div key={a.id} className="truncate rounded-md border px-1.5 py-0.5 text-[10px]" style={{ borderColor:(svc?.color??"#16c784")+"55", background:(svc?.color??"#16c784")+"18", color:svc?.color??"#16c784" }}>{a.appointment_time} {a.title}</div>
                    ); })}
                    {list.length>3 && <div className="text-[10px] text-muted-strong">+{list.length-3} mais</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="grid border-b border-border bg-background-secondary text-[11px] font-semibold uppercase tracking-wider text-muted-strong" style={{ gridTemplateColumns:`64px repeat(${days.length}, minmax(0,1fr))` }}>
            <div className="px-2 py-2.5">Hora</div>
            {days.map((d) => <div key={d.toISOString()} className="px-3 py-2.5"><span className={isSameDay(d,new Date())?"text-primary":""}>{format(d,"EEE d",{locale:ptBR})}</span></div>)}
          </div>
          <div className="relative max-h-[640px] overflow-y-auto">
            {Array.from({length:12}).map((_,i) => {
              const hour = 8+i;
              return (
                <div key={hour} className="grid border-b border-border" style={{ gridTemplateColumns:`64px repeat(${days.length}, minmax(0,1fr))` }}>
                  <div className="px-2 py-3 font-mono text-[10px] text-muted-strong">{String(hour).padStart(2,"0")}:00</div>
                  {days.map((d) => {
                    const list=(apptsByDay.get(format(d,"yyyy-MM-dd"))??[]).filter((a)=>parseInt(a.appointment_time.slice(0,2),10)===hour);
                    return (
                      <div key={d.toISOString()+hour} className="min-h-[64px] border-l border-border p-1">
                        {list.map((a) => { const svc=services.find((s)=>s.id===a.service_id); const cli=clients.find((c)=>c.id===a.client_id); const tm=team.find((t)=>t.id===a.team_member_id); return (
                          <div key={a.id} className="mb-1 rounded-lg border p-2 text-[11px] shadow-sm transition hover:-translate-y-0.5" style={{ borderColor:(svc?.color??"#16c784")+"55", background:(svc?.color??"#16c784")+"14" }} title={`${a.title} — ${cli?.full_name} (${tm?.full_name})`}>
                            <div className="flex items-center justify-between gap-1"><span className="font-mono text-[10px] text-secondary">{a.appointment_time}</span><StatusBadge status={a.status} /></div>
                            <div className="mt-1 truncate font-medium" style={{ color:svc?.color??"#16c784" }}>{a.title}</div>
                            <div className="truncate text-[10px] text-secondary">{cli?.full_name}</div>
                          </div>
                        ); })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-secondary">
        <span className="font-medium text-muted-strong">Serviços:</span>
        {services.map((s) => <span key={s.id} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background:s.color }} />{s.name}</span>)}
      </div>
    </AppShell>
  );
}
