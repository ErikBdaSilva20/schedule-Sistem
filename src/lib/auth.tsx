import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth } from "./data/client";

type User = { id: string; email: string; name: string };
type Role = "admin" | "manager" | "rep" | string;

interface AuthState {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, role: null, isLoading: true });

  const load = useCallback(async () => {
    try {
      const res = await auth.me();
      setState({ user: res.user, role: res.role, isLoading: false });
    } catch {
      setState({ user: null, role: null, isLoading: false });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setState({ user: null, role: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, reload: load, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useIsAdmin(): boolean {
  const { role } = useAuth();
  return role === "admin" || role === "manager";
}
