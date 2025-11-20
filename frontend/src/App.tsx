import { SidebarLayout } from "@/components/SidebarLayout";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SandboxWSProvider } from "@/context/SandboxWSContext";
import ComplianceView from "@/views/ComplianceView";
import DashboardView from "@/views/DashboardView";
import EventLogView from "@/views/EventLogView";
import SandboxView from "@/views/SandboxView";
import SettingsView from "@/views/SettingsView";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as HotToast } from "react-hot-toast";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
	<QueryClientProvider client={queryClient}>
		<SandboxWSProvider>
			<TooltipProvider>
				<Toaster />
				<Sonner />
				<HotToast
					position="top-right"
					toastOptions={{
						duration: 3000,
						style: {
							background: "#363636",
							color: "#fff",
						},
						success: {
							duration: 3000,
							iconTheme: {
								primary: "#4ade80",
								secondary: "#fff",
							},
						},
						error: {
							duration: 4000,
							iconTheme: {
								primary: "#ef4444",
								secondary: "#fff",
							},
						},
					}}
				/>
				<BrowserRouter>
					<Routes>
						<Route element={<SidebarLayout />}>
							<Route path="/" element={<DashboardView />} />
							<Route path="/sandbox" element={<SandboxView />} />
							<Route
								path="/sandbox/:patchId"
								element={<SandboxView />}
							/>
							<Route
								path="/compliance"
								element={<ComplianceView />}
							/>
							<Route path="/logs" element={<EventLogView />} />
							<Route
								path="/settings"
								element={<SettingsView />}
							/>
						</Route>
						<Route path="*" element={<NotFound />} />
					</Routes>
				</BrowserRouter>
			</TooltipProvider>
		</SandboxWSProvider>
	</QueryClientProvider>
);

export default App;
