import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import {
  Briefcase,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FloatingBlobs } from "./FloatingBlobs";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/", label: "Painel", icon: LayoutDashboard, exact: true },
  { to: "/calendar", label: "Agenda", icon: CalendarDays },
  { to: "/appointments", label: "Agendamentos", icon: ListChecks },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/services", label: "Serviços", icon: Briefcase },
  { to: "/team", label: "Equipe", icon: UserCog },
];

function SidenavContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">Schedly</div>
          <div className="truncate text-[11px] text-muted-strong">Console de Operações</div>
        </div>
      </div>

      <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-strong">
        Navegação
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-0.5 px-2">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[rgba(22,199,132,0.18)] text-foreground ring-1 ring-[rgba(22,199,132,0.40)]"
                  : "text-secondary hover:bg-black/[0.06] hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
              <span className="truncate">{item.label}</span>
              {active && (
                <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary-glow)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl border border-border bg-card/60 p-3">
        <div className="text-xs font-medium text-foreground">Pronto para usar</div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-strong">
          Sistema de agendamento adaptável para qualquer negócio de serviços.
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="relative flex min-h-screen w-full">
      <FloatingBlobs />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar/95 backdrop-blur-xl md:flex">
        <SidenavContent pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-sidebar/95 backdrop-blur-xl [&>button]:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de navegação</SheetTitle>
            <SheetDescription>Navegação principal do Schedly</SheetDescription>
          </SheetHeader>
          <SidenavContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/70 px-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card hover:bg-card-hover md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <nav className="flex items-center gap-2 text-xs text-muted-strong">
              <span className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[10px] text-secondary">
                ⌘K
              </span>
              <span className="hidden sm:inline">Ir para...</span>
            </nav>
          </div>
          <div className="flex items-center gap-2.5">
            {role && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary-glow)]" />
                {role}
              </span>
            )}
            {user && (
              <span className="hidden text-xs text-secondary sm:inline truncate max-w-[120px]">
                {user.name || "Minha conta"}
              </span>
            )}
            <button
              onClick={handleSignOut}
              title="Sair"
              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-secondary hover:bg-card-hover hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <main className="relative flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>

        <footer className="border-t border-border px-5 py-3 text-center text-[11px] text-muted-strong md:px-8">
          <span className="font-bold">© {new Date().getFullYear()} </span> MasIA. Todos os direitos
          reservados.
        </footer>
      </div>
    </div>
  );
}
