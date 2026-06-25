import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
// 🔧 MOCK: import original comentado (descomente ao remover o mock)
// import { auth } from "@/lib/data/client";
import { useAuth } from "@/lib/auth";
import { FloatingBlobs } from "@/components/FloatingBlobs";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const navigate = useNavigate();
  const { reload } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Original:
    // try {
    //   if (mode === "signin") {
    //     await auth.signIn(email, password);
    //   } else {
    //     await auth.signUp(email, password, name);
    //   }
    //   await reload();
    //   navigate("/", { replace: true });
    // } catch (err) {
    //   setError(err instanceof Error ? err.message : "Erro ao autenticar");
    // } finally {
    //   setLoading(false);
    // }

    // 🔧 MOCK: simula login via localStorage
    try {
      await new Promise((r) => setTimeout(r, 400)); // simula latência
      const mockUser = {
        id: "u1",
        email: email || "admin@hub.app",
        name: name || email.split("@")[0] || "Admin",
      };
      localStorage.setItem("mock_user", JSON.stringify({ user: mockUser, role: "admin" }));
      localStorage.removeItem("mock_signed_out");
      await reload();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

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

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-secondary">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="input-base"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                className="input-base"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-base"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

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
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); }}
                  className="font-medium text-primary hover:underline"
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setError(""); }}
                  className="font-medium text-primary hover:underline"
                >
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
