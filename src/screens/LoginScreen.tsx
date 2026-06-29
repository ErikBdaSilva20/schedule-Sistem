import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, AlertCircle, UserX, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/data/client";
import { useAuth } from "@/lib/auth";
import { FloatingBlobs } from "@/components/FloatingBlobs";

type Mode = "signin" | "signup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// client.ts lança: "METHOD /path → STATUS StatusText"
// Extrai o código numérico de status da mensagem de erro
function parseStatus(msg: string): number | null {
  const m = msg.match(/→ (\d{3})/);
  return m ? parseInt(m[1], 10) : null;
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="flex items-center gap-1 text-[11px] text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {msg}
    </p>
  );
}

export default function LoginScreen() {
  const navigate = useNavigate();
  const { reload } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [touched, setTouched] = useState({ email: false, password: false, name: false });
  const touch = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const emailErr = !EMAIL_RE.test(email) ? "E-mail inválido" : "";
  const passErr  = password.length > 0 && password.length < 6 ? "Mínimo de 6 caracteres" : "";
  const nameErr  = mode === "signup" && !name.trim() ? "Nome obrigatório" : "";

  type BannerType = "not_found" | "wrong_pass" | "email_taken" | "generic";
  const [banner, setBanner] = useState<{ type: BannerType; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setBanner(null);
    setTouched({ email: false, password: false, name: false });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true, name: true });
    setBanner(null);

    const hasFieldError =
      emailErr ||
      (password.length < 6) ||
      (mode === "signup" && !name.trim());
    if (hasFieldError) return;

    setLoading(true);
    try {
      if (mode === "signin") {
        await auth.signIn(email, password);
        toast.success("Bem-vindo de volta!");
      } else {
        await auth.signUp(email, password, name);
        toast.success("Conta criada com sucesso!");
      }
      await reload();
      navigate("/", { replace: true });
    } catch (err) {
      const msg    = err instanceof Error ? err.message : "";
      const status = parseStatus(msg);

      if (mode === "signin") {
        if (status === 404) {
          setBanner({ type: "not_found", msg: "Nenhuma conta encontrada com este e-mail." });
          toast.error("Conta não encontrada");
        } else if (status === 401) {
          setBanner({ type: "wrong_pass", msg: "Senha incorreta. Verifique e tente novamente." });
          toast.error("Senha incorreta");
        } else {
          setBanner({ type: "generic", msg: "Erro ao autenticar. Tente novamente." });
          toast.error("Erro ao autenticar");
        }
      } else {
        if (status === 409) {
          setBanner({ type: "email_taken", msg: "Este e-mail já possui uma conta." });
          toast.error("E-mail já cadastrado");
        } else if (status === 400) {
          setBanner({ type: "generic", msg: "Verifique os dados e tente novamente." });
          toast.error("Dados inválidos");
        } else {
          setBanner({ type: "generic", msg: "Erro ao criar conta. Tente novamente." });
          toast.error("Erro ao criar conta");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength = (() => {
    if (password.length === 0) return null;
    if (password.length < 6)   return { label: "Fraca", color: "bg-destructive", w: "w-1/3" };
    if (password.length < 10)  return { label: "Média", color: "bg-amber-400",   w: "w-2/3" };
    return                            { label: "Forte", color: "bg-primary",      w: "w-full" };
  })();

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center">
      <FloatingBlobs />

      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="card-surface p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-semibold tracking-tight">AppointmentHub</h1>
              <p className="mt-0.5 text-[13px] text-muted-strong">
                {mode === "signin" ? "Acesse sua conta" : "Crie sua conta"}
              </p>
            </div>
          </div>

          {/* Banner: conta não encontrada */}
          {banner?.type === "not_found" && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
              <UserX className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-xs font-semibold text-destructive">{banner.msg}</p>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="mt-0.5 text-[11px] text-destructive/80 underline underline-offset-2 hover:text-destructive"
                >
                  Criar uma conta com este e-mail →
                </button>
              </div>
            </div>
          )}

          {/* Banner: e-mail já cadastrado */}
          {banner?.type === "email_taken" && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-xs font-semibold text-destructive">{banner.msg}</p>
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="mt-0.5 text-[11px] text-destructive/80 underline underline-offset-2 hover:text-destructive"
                >
                  Entrar com este e-mail →
                </button>
              </div>
            </div>
          )}

          {/* Banner: senha errada ou erro genérico */}
          {banner && banner.type !== "not_found" && banner.type !== "email_taken" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{banner.msg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            {mode === "signup" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-secondary">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => touch("name")}
                  placeholder="Seu nome"
                  className={`input-base ${touched.name && nameErr ? "border-destructive/60" : ""}`}
                />
                {touched.name && nameErr && <FieldError msg={nameErr} />}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-secondary">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setBanner(null); }}
                onBlur={() => touch("email")}
                placeholder="voce@empresa.com"
                className={`input-base ${touched.email && emailErr ? "border-destructive/60" : ""}`}
              />
              {touched.email && emailErr && <FieldError msg={emailErr} />}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-secondary">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => touch("password")}
                placeholder="••••••••"
                className={`input-base ${touched.password && passErr ? "border-destructive/60" : ""}`}
              />

              {mode === "signup" && passwordStrength && (
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.w}`} />
                  </div>
                  <span className="text-[11px] text-muted-strong">{passwordStrength.label}</span>
                </div>
              )}

              {touched.password && passErr && <FieldError msg={passErr} />}

              {mode === "signup" && !password && (
                <p className="flex items-center gap-1 text-[11px] text-muted-strong">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  Mínimo de 6 caracteres
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-strong">
            {mode === "signin" ? (
              <>
                Não tem conta?{" "}
                <button type="button" onClick={() => switchMode("signup")} className="font-medium text-primary hover:underline">
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button type="button" onClick={() => switchMode("signin")} className="font-medium text-primary hover:underline">
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
