import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageLoader from "@/components/PageLoader";
import RoleRoute from "@/components/RoleRoute";
import PublicRoute from "./components/PublicRoute";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";

// Eager — small + on the critical path
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy — heavier or rarely-first-visit pages.
// Code-splits the bundle so the initial load stays small.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LineasGeneticas = lazy(() => import("./pages/LineasGeneticas"));
const Cajas = lazy(() => import("./pages/Cajas"));
const Lotes = lazy(() => import("./pages/Lotes"));
const LoteDetalle = lazy(() => import("./pages/LoteDetalle"));
const Alertas = lazy(() => import("./pages/Alertas"));
const Stock = lazy(() => import("./pages/Stock"));
const Admin = lazy(() => import("./pages/Admin"));
const Clientes = lazy(() => import("./pages/Clientes"));
const ClientePerfil = lazy(() => import("./pages/ClientePerfil"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const Ventas = lazy(() => import("./pages/Ventas"));
const MasterPanel = lazy(() => import("./pages/MasterPanel"));
const CopilotAnalytics = lazy(() => import("./pages/CopilotAnalytics"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reasonable defaults for an internal CRUD app:
      // - Avoid refetch storms on tab focus
      // - Cache data 30s before considering stale
      // - Single retry on transient network errors
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{node}</Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <ConfirmDialogProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <PublicRoute>{withSuspense(<LandingPage />)}</PublicRoute>
                }
              />
              <Route path="/auth" element={<Auth />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/lineas" element={withSuspense(<LineasGeneticas />)} />
                <Route path="/cajas" element={withSuspense(<Cajas />)} />
                <Route path="/lotes" element={withSuspense(<Lotes />)} />
                <Route path="/lotes/:id" element={withSuspense(<LoteDetalle />)} />
                <Route path="/stock" element={withSuspense(<Stock />)} />
                <Route path="/clientes" element={withSuspense(<Clientes />)} />
                <Route path="/clientes/:id" element={withSuspense(<ClientePerfil />)} />
                <Route path="/pedidos" element={withSuspense(<Pedidos />)} />
                <Route path="/ventas" element={withSuspense(<Ventas />)} />
                <Route path="/alertas" element={withSuspense(<Alertas />)} />
                <Route
                  path="/admin"
                  element={
                    <RoleRoute allow={["admin"]}>{withSuspense(<Admin />)}</RoleRoute>
                  }
                />
                <Route
                  path="/admin/ai-analytics"
                  element={
                    <RoleRoute allow={["admin"]}>{withSuspense(<CopilotAnalytics />)}</RoleRoute>
                  }
                />
                <Route
                  path="/master"
                  element={
                    <RoleRoute allow={[]}>{withSuspense(<MasterPanel />)}</RoleRoute>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ConfirmDialogProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
