import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./lib/auth";
import App from "./App";
import "./styles.css";

// ============================================================
// 🔧 MOCK: Ativa modo preview para usar dados fictícios (fixtures)
//    em vez do gateway real. Remova/comente a linha abaixo para
//    voltar ao comportamento original com backend.
// ============================================================
window.__MASI_PREVIEW__ = true;

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
