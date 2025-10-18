import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TestTube,
  Shield,
  ScrollText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Sandbox", url: "/sandbox", icon: TestTube },
  { title: "Compliance", url: "/compliance", icon: Shield },
  { title: "Event Logs", url: "/logs", icon: ScrollText },
];

export function SidebarLayout() {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-lg font-bold px-4 py-6">
                Patch Orchestration
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url || 
                      (item.url === "/sandbox" && location.pathname.startsWith("/sandbox/"));
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
