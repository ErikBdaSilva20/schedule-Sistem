import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { deriveStatus } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { listAppointments } from "@/lib/data/appointments.repo";
import { listServices }     from "@/lib/data/services.repo";
import { listClients }      from "@/lib/data/clients.repo";
import { listTeamMembers }  from "@/lib/data/team_members.repo";

type View = "day" | "week" | "month";

const VIEW_LABELS: Record<View, { short: string; full: string }> = {
  day:   { short: "Dia",  full: "Dia"    },
  week:  { short: "Sem",  full: "Semana" },
  month: { short: "Mês",  full: "Mês"    },
};

const WEEKDAYS = [
  { letter: "S", short: "Seg" },
  { letter: "T", short: "Ter" },
  { letter: "Q", short: "Qua" },
  { letter: "Q", short: "Qui" },
  { letter: "S", short: "Sex" },
  { letter: "S", short: "Sáb" },
  { letter: "D", short: "Dom" },
];

const HOUR_START = 6;
const HOUR_END   = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

export default function CalendarScreen() {
  const { data: appointments = [] } = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });
  const { data: services     = [] } = useQuery({ queryKey: ["services"],     queryFn: listServices });
  const { data: clients      = [] } = useQuery({ queryKey: ["clients"],      queryFn: listClients });
  const { data: team         = [] } = useQuery({ queryKey: ["team_members"], queryFn: listTeamMembers });

  const navigate = useNavigate();
  const goToAppt = useCallback((id: string) => navigate("/appointments", { state: { highlight: id } }), [navigate]);

  const [view, setView]           = useState<View>("week");
  const [cursor, setCursor]       = useState<Date>(new Date());
  const [expandedDay, setExpanded] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expandedDay) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setExpanded(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expandedDay]);

  const shift = (dir: number) => {
    if (view === "day")        setCursor((d) => addDays(d, dir));
    else if (view === "week")  setCursor((d) => addDays(d, dir * 7));
    else                       setCursor((d) => addMonths(d, dir));
  };

  const days = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      return Array.from({ length: 7 }).map((_, i) => addDays(s, i));
    }
    const s = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const e = endOfWeek(endOfMonth(cursor),     { weekStartsOn: 1 });
    const arr: Date[] = [];
    let d = s;
    while (d <= e) { arr.push(d); d = addDays(d, 1); }
    return arr;
  }, [view, cursor]);

  const apptsByDay = useMemo(() => {
    const m = new Map<string, typeof appointments>();
    for (const a of appointments) {
      // normaliza: aceita "2026-06-28" ou "2026-06-28T00:00:00.000Z"
      const k = (a.appointment_date ?? "").slice(0, 10);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    for (const v of m.values()) v.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    return m;
  }, [appointments]);

  const headerLabel = view === "month"
    ? format(cursor, "MMMM 'de' yyyy", { locale: ptBR })
    : view === "week"
      ? `${format(days[0], "d 'de' MMM", { locale: ptBR })} – ${format(days[6], "d 'de' MMM',' yyyy", { locale: ptBR })}`
      : format(cursor, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const gridMinWidth = `${48 + days.length * 140}px`;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Calendário"
        title="Agenda"
        description="Visualize agendamentos da equipe com serviços por cores."
        actions={
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-2.5 py-1.5 transition sm:px-3 ${view === v ? "bg-primary/15 text-primary" : "text-secondary hover:text-foreground"}`}
                >
                  <span className="sm:hidden">{VIEW_LABELS[v].short}</span>
                  <span className="hidden sm:inline">{VIEW_LABELS[v].full}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => shift(-1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card hover:bg-card-hover"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCursor(new Date())}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-card-hover"
              >
                Hoje
              </button>
              <button
                onClick={() => shift(1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card hover:bg-card-hover"
                aria-label="Próximo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      />

      <div className="mb-3 text-sm font-medium capitalize text-secondary">{headerLabel}</div>

      {view === "month" ? (
        <div className="card-surface overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-background-secondary text-[10px] font-semibold uppercase tracking-wider text-muted-strong sm:text-[11px]">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="py-2 text-center sm:px-3 sm:py-2.5 sm:text-left">
                <span className="sm:hidden">{d.letter}</span>
                <span className="hidden sm:inline">{d.short}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((d) => {
              const dayKey = format(d, "yyyy-MM-dd");
              const list   = apptsByDay.get(dayKey) ?? [];
              const muted  = !isSameMonth(d, cursor);
              const today  = isSameDay(d, new Date());
              const isOpen = expandedDay === dayKey;

              return (
                <div
                  key={d.toISOString()}
                  className={`relative min-h-[56px] border-b border-r border-border p-1 sm:min-h-[110px] sm:p-2 ${muted ? "bg-background-secondary/40" : ""}`}
                >
                  <div className="mb-1 flex items-start justify-between">
                    <span className={`grid h-5 w-5 place-items-center rounded-md text-[10px] sm:h-6 sm:w-6 sm:text-xs ${today ? "bg-primary text-primary-foreground" : muted ? "text-muted-strong" : "text-secondary"}`}>
                      {format(d, "d")}
                    </span>
                    {list.length > 0 && (
                      <span className="text-[9px] text-muted-strong sm:text-[10px]">{list.length}</span>
                    )}
                  </div>

                  {/* Mobile: colored dots */}
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {list.slice(0, 5).map((a) => {
                      const svc = services.find((s) => s.id === a.service_id);
                      return (
                        <span
                          key={a.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: svc?.color ?? "#16c784" }}
                          title={a.title}
                        />
                      );
                    })}
                    {list.length > 5 && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : dayKey)}
                        className="text-[8px] leading-none text-primary underline"
                      >
                        +{list.length - 5}
                      </button>
                    )}
                  </div>

                  {/* Desktop: text pills */}
                  <div className="hidden space-y-1 sm:block">
                    {list.slice(0, 3).map((a) => {
                      const svc = services.find((s) => s.id === a.service_id);
                      const isLate = deriveStatus(a.status, a.appointment_date, a.appointment_time) === "late";
                      return (
                        <div
                          key={a.id}
                          className="truncate rounded-md border px-1.5 py-0.5 text-[10px]"
                          style={isLate
                            ? { borderColor: "#f97316aa", background: "#f9731622", color: "#f97316" }
                            : { borderColor: (svc?.color ?? "#16c784") + "55", background: (svc?.color ?? "#16c784") + "18", color: svc?.color ?? "#16c784" }}
                        >
                          {a.appointment_time} {a.title}
                        </div>
                      );
                    })}
                    {list.length > 3 && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : dayKey)}
                        className="text-[10px] font-medium text-primary hover:underline"
                      >
                        +{list.length - 3} mais
                      </button>
                    )}
                  </div>

                  {/* Overflow popover */}
                  {isOpen && (
                    <div
                      ref={popoverRef}
                      className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-card shadow-xl"
                      style={{ minWidth: "240px" }}
                    >
                      <div className="flex items-center justify-between border-b border-border px-3 py-2">
                        <span className="text-xs font-semibold capitalize">
                          {format(d, "EEEE, d 'de' MMM", { locale: ptBR })}
                        </span>
                        <button onClick={() => setExpanded(null)} className="rounded-md p-0.5 hover:bg-card-hover">
                          <X className="h-3.5 w-3.5 text-secondary" />
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
                        {list.map((a) => {
                          const svc = services.find((s) => s.id === a.service_id);
                          const cli = clients.find((c) => c.id === a.client_id);
                          const tm  = team.find((t) => t.id === a.team_member_id);
                          const ds  = deriveStatus(a.status, a.appointment_date, a.appointment_time);
                          const isLate = ds === "late";
                          return (
                            <div
                              key={a.id}
                              onClick={() => { setExpanded(null); goToAppt(a.id); }}
                              className="cursor-pointer rounded-lg border p-2 transition hover:brightness-105"
                              style={isLate ? { borderColor: "#f97316aa", background: "#f9731620" } : { borderColor: (svc?.color ?? "#16c784") + "55", background: (svc?.color ?? "#16c784") + "12" }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[10px] text-secondary">{a.appointment_time}</span>
                                <StatusBadge status={ds} />
                              </div>
                              <div className="mt-0.5 text-[11px] font-semibold" style={{ color: svc?.color ?? "#16c784" }}>
                                {a.title}
                              </div>
                              {cli && <div className="text-[10px] text-secondary">{cli.full_name}</div>}
                              {tm  && <div className="text-[10px] text-muted-strong">{tm.full_name} · {a.duration_minutes}m</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: gridMinWidth }}>
              <div
                className="grid border-b border-border bg-background-secondary text-[11px] font-semibold uppercase tracking-wider text-muted-strong"
                style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))` }}
              >
                <div className="px-2 py-2.5 text-[10px]">Hora</div>
                {days.map((d) => (
                  <div key={d.toISOString()} className="px-2 py-2.5">
                    <span className={isSameDay(d, new Date()) ? "text-primary" : ""}>
                      {format(d, "EEE d", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="relative max-h-[55vh] overflow-y-auto sm:max-h-[640px]">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="grid border-b border-border"
                    style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))` }}
                  >
                    <div className="px-1.5 py-3 font-mono text-[10px] text-muted-strong sm:px-2">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    {days.map((d) => {
                      const dayKey = format(d, "yyyy-MM-dd");
                      const list = (apptsByDay.get(dayKey) ?? []).filter(
                        (a) => parseInt(a.appointment_time.slice(0, 2), 10) === hour
                      );
                      return (
                        <div key={d.toISOString() + hour} className="min-h-[56px] border-l border-border p-1 sm:min-h-[60px]">
                          {list.map((a) => {
                            const svc = services.find((s) => s.id === a.service_id);
                            const cli = clients.find((c) => c.id === a.client_id);
                            const tm  = team.find((t) => t.id === a.team_member_id);
                            const ds  = deriveStatus(a.status, a.appointment_date, a.appointment_time);
                            const isLate = ds === "late";
                            return (
                              <div
                                key={a.id}
                                onClick={() => goToAppt(a.id)}
                                className="mb-1 cursor-pointer overflow-hidden rounded-lg border p-1.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-2"
                                style={isLate ? { borderColor: "#f97316aa", background: "#f9731622" } : { borderColor: (svc?.color ?? "#16c784") + "55", background: (svc?.color ?? "#16c784") + "14" }}
                                title={`${a.title} — ${cli?.full_name} (${tm?.full_name})`}
                              >
                                <span className="font-mono text-[9px] text-secondary sm:text-[10px]">
                                  {a.appointment_time}
                                </span>
                                <div className="mt-0.5 truncate text-[10px] font-medium sm:mt-1 sm:text-[11px]" style={{ color: svc?.color ?? "#16c784" }}>
                                  {a.title}
                                </div>
                                <div className="truncate text-[9px] text-secondary sm:text-[10px]">
                                  {cli?.full_name}
                                </div>
                                <div className="mt-1">
                                  <StatusBadge status={ds} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-secondary">
        <span className="font-medium text-muted-strong">Serviços:</span>
        {services.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </AppShell>
  );
}
