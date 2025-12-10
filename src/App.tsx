import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { OrganisationProvider } from "@/contexts/OrganisationContext";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { WorkflowsLayout } from "@/components/layout/WorkflowsLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Directory from "./pages/Directory";
import Rota from "./pages/Rota";
import WorkflowTaskManager from "./pages/workflows/WorkflowTaskManager";
import TaskAuditTrail from "./pages/workflows/TaskAuditTrail";
import PolicyGPT from "./pages/PolicyGPT";
import UserManagement from "./pages/admin/UserManagement";
import SiteManagement from "./pages/admin/SiteManagement";
import JobFamilyManagement from "./pages/admin/JobFamilyManagement";
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
              <Route path="/directory" element={<Directory />} />
              <Route path="/rota" element={<Rota />} />
              <Route path="/workflows" element={<WorkflowsLayout />}>
                <Route index element={<Navigate to="/workflows/tasksmanager" replace />} />
                <Route path="tasksmanager" element={<WorkflowTaskManager />} />
                <Route path="audittrail" element={<TaskAuditTrail />} />
              </Route>
              <Route path="/policy-gpt" element={<PolicyGPT />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/users" replace />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="sites" element={<SiteManagement />} />
                <Route path="job-families" element={<JobFamilyManagement />} />
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
