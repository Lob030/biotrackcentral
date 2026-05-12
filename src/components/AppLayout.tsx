import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import AIAgentBar from "./ai/AIAgentBar";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden h-14 flex items-center border-b border-border/60 px-4 backdrop-blur-xl bg-background/70 sticky top-0 z-30">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
        <AICommandBar />
      </div>
    </SidebarProvider>
  );
}
