import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import LineasGeneticas from "./pages/LineasGeneticas";
import Cajas from "./pages/Cajas";
import Lotes from "./pages/Lotes";
import LoteDetalle from "./pages/LoteDetalle";
import Alertas from "./pages/Alertas";
import Stock from "./pages/Stock";
import Admin from "./pages/Admin";
import Clientes from "./pages/Clientes";
import ClientePerfil from "./pages/ClientePerfil";
import Pedidos from "./pages/Pedidos";
import Ventas from "./pages/Ventas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/lineas" element={<LineasGeneticas />} />
              <Route path="/cajas" element={<Cajas />} />
              <Route path="/lotes" element={<Lotes />} />
              <Route path="/lotes/:id" element={<LoteDetalle />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id" element={<ClientePerfil />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/alertas" element={<Alertas />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
