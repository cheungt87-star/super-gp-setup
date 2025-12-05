import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { OrganisationProvider } from "@/contexts/OrganisationContext";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Rota from "./pages/Rota";
import Workflows from "./pages/Workflows";
import PolicyGPT from "./pages/PolicyGPT";
import UserManagement from "./pages/admin/UserManagement";
import SiteManagement from "./pages/admin/SiteManagement";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <OrganisationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<AuthenticatedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/rota" element={<Rota />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/policy-gpt" element={<PolicyGPT />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/users" replace />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="sites" element={<SiteManagement />} />
              </Route>
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </OrganisationProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
