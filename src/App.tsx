import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RequireWorkspace from "@/components/RequireWorkspace";
import AppLayout from "@/components/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageLoader from "@/components/PageLoader";
import RoleRoute from "@/components/RoleRoute";
import PublicRoute from "./components/PublicRoute";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { RuntimeConnectionMonitor } from "./core/connectivity/RuntimeConnectionMonitor";
import { SupabaseHealthMonitor } from "./core/connectivity/SupabaseHealthMonitor";
import { RuntimeHeartbeat } from "./core/connectivity/RuntimeHeartbeat";
import { ConnectivityStatusBanner } from "./core/connectivity/ConnectivityStatusBanner";

// Eager — small + on the critical path
import Auth from "./pages/Auth";
import Dashboard from "./modules/bioterio/pages/Dashboard";
import NotFound from "./pages/NotFound";
const SpeciesProfiles = lazy(() => import("./modules/bioterio/pages/SpeciesProfiles"));

// Lazy — heavier or rarely-first-visit pages.
// Code-splits the bundle so the initial load stays small.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LineasGeneticas = lazy(() => import("./modules/bioterio/pages/LineasGeneticas"));
const Cajas = lazy(() => import("./modules/bioterio/pages/Cajas"));
const Lotes = lazy(() => import("./modules/bioterio/pages/Lotes"));
const LoteDetalle = lazy(() => import("./modules/bioterio/pages/LoteDetalle"));
const Alertas = lazy(() => import("./modules/bioterio/pages/Alertas"));
const Stock = lazy(() => import("./modules/bioterio/pages/Stock"));
const Admin = lazy(() => import("./pages/Admin"));
const Clientes = lazy(() => import("./modules/bioterio/pages/Clientes"));
const ClientePerfil = lazy(() => import("./modules/bioterio/pages/ClientePerfil"));
const Pedidos = lazy(() => import("./modules/bioterio/pages/Pedidos"));
const Ventas = lazy(() => import("./modules/bioterio/pages/Ventas"));
const MasterPanel = lazy(() => import("./pages/MasterPanel"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const WorkspaceSelector = lazy(() => import("./modules/hub/components/WorkspaceSelector"));

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
      <RuntimeConnectionMonitor />
      <SupabaseHealthMonitor />
      <RuntimeHeartbeat />
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
              <Route
                path="/onboarding"
                element={<ProtectedRoute>{withSuspense(<Onboarding />)}</ProtectedRoute>}
              />
              <Route
                path="/hub"
                element={<ProtectedRoute>{withSuspense(<WorkspaceSelector />)}</ProtectedRoute>}
              />
              <Route element={<ProtectedRoute><RequireWorkspace><AppLayout /></RequireWorkspace></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/lineas" element={withSuspense(<LineasGeneticas />)} />
                <Route path="/cajas" element={withSuspense(<Cajas />)} />
                <Route path="/lotes" element={withSuspense(<Lotes />)} />
                <Route path="/lotes/:id" element={withSuspense(<LoteDetalle />)} />
                <Route path="/stock" element={withSuspense(<Stock />)} />
                <Route path="/species" element={withSuspense(<SpeciesProfiles />)} />
                <Route path="/species/:speciesId" element={withSuspense(<SpeciesProfiles />)} />
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
