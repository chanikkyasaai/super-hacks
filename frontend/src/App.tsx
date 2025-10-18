import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import DashboardView from "@/views/DashboardView";
import SandboxView from "@/views/SandboxView";
import ComplianceView from "@/views/ComplianceView";
import EventLogView from "@/views/EventLogView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<SidebarLayout />}>
            <Route path="/" element={<DashboardView />} />
            <Route path="/sandbox" element={<SandboxView />} />
            <Route path="/sandbox/:patchId" element={<SandboxView />} />
            <Route path="/compliance" element={<ComplianceView />} />
            <Route path="/logs" element={<EventLogView />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
