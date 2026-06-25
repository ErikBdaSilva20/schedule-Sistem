// PROTEGIDO — não editar. Contrato com o tenant-gateway.
// Lê config: ?gw=&t= → VITE_GATEWAY_URL → window.__MASI_GW__ (edge worker)

type Method = "GET" | "POST" | "PATCH" | "DELETE";

declare global {
  interface Window {
    __MASI_GW__?: string;
    __MASI_TENANT__?: string;
    __MASI_PREVIEW__?: boolean;
  }
}

function getConfig() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  return {
    gateway:
      params.get("gw") ??
      window.__MASI_GW__ ??
      import.meta.env.VITE_GATEWAY_URL ??
      "http://localhost:3000",
    tenant: params.get("t") ?? window.__MASI_TENANT__ ?? "",
  };
}

async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  if (window.__MASI_PREVIEW__) {
    const { previewApi } = await import("./preview-fixtures");
    return previewApi<T>(method, path, body);
  }

  const { gateway, tenant } = getConfig();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tenant) headers["X-Tenant-Id"] = tenant;

  const res = await fetch(`${gateway}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const db = {
  table<R = Record<string, unknown>>(name: string) {
    return {
      list: () => api<R[]>("GET", `/data/${name}`),
      create: (input: Partial<R>) => api<R>("POST", `/data/${name}`, input),
      update: (id: string, patch: Partial<R>) => api<R>("PATCH", `/data/${name}/${id}`, patch),
      remove: (id: string) => api<void>("DELETE", `/data/${name}/${id}`),
    };
  },
};

export const auth = {
  signIn: (email: string, password: string) =>
    api<{ user: { id: string; email: string; name: string }; role: string }>(
      "POST",
      "/auth/sign-in",
      { email, password },
    ),
  signUp: (email: string, password: string, name: string) =>
    api<{ user: { id: string; email: string; name: string } }>("POST", "/auth/sign-up", {
      email,
      password,
      name,
    }),
  signOut: () => api<void>("POST", "/auth/sign-out"),
  me: () =>
    api<{ user: { id: string; email: string; name: string }; role: string }>("GET", "/auth/me"),
};
