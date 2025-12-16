import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NuevoTicket from "./pages/NuevoTicket";
import TicketDetail from "./pages/TicketDetail";
import Cobro from "./pages/Cobro";
import Servicios from "./pages/Servicios";
import Tarifas from "./pages/Tarifas";
import Usuarios from "./pages/Usuarios";
import Clientes from "./pages/Clientes";
import Reportes from "./pages/Reportes";
import CierreDia from "./pages/CierreDia";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/nuevo-ticket" element={
              <ProtectedRoute>
                <NuevoTicket />
              </ProtectedRoute>
            } />
            <Route path="/ticket/:id" element={
              <ProtectedRoute>
                <TicketDetail />
              </ProtectedRoute>
            } />
            <Route path="/cobro/:id" element={
              <ProtectedRoute>
                <Cobro />
              </ProtectedRoute>
            } />
            <Route path="/servicios" element={
              <ProtectedRoute requireAdmin>
                <Servicios />
              </ProtectedRoute>
            } />
            <Route path="/tarifas" element={
              <ProtectedRoute requireAdmin>
                <Tarifas />
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute requireAdmin>
                <Usuarios />
              </ProtectedRoute>
            } />
            <Route path="/clientes" element={
              <ProtectedRoute requireAdmin>
                <Clientes />
              </ProtectedRoute>
            } />
            <Route path="/reportes" element={
              <ProtectedRoute requireAdmin>
                <Reportes />
              </ProtectedRoute>
            } />
            <Route path="/cierre-dia" element={
              <ProtectedRoute>
                <CierreDia />
              </ProtectedRoute>
            } />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
