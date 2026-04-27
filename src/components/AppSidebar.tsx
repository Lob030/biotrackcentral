import { LayoutDashboard, GitBranch, Package, Layers, FlaskConical, LogOut, BellRing, Boxes, Shield } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const baseItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Líneas Genéticas", url: "/lineas", icon: GitBranch },
  { title: "Cajas", url: "/cajas", icon: Package },
  { title: "Lotes", url: "/lotes", icon: Layers },
  { title: "Stock por tamaño", url: "/stock", icon: Boxes },
  { title: "Alertas", url: "/alertas", icon: BellRing },
];

export function AppSidebar() {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const items = role === "admin"
    ? [...baseItems, { title: "Administración", url: "/admin", icon: Shield }]
    : baseItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <FlaskConical className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="display-font text-base font-bold text-sidebar-foreground">Bioterio</span>
            <span className="text-xs text-muted-foreground">Sistema de Gestión</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-11">
                      <NavLink
                        to={item.url}
                        end
                        className={
                          active
                            ? "!bg-sidebar-accent !text-primary font-medium relative"
                            : "text-sidebar-foreground hover:!bg-sidebar-accent/60 hover:!text-sidebar-foreground"
                        }
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        <span>{item.title}</span>
                        {active && (
                          <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
            {profile?.nombre?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{profile?.nombre ?? "Usuario"}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">{role ?? "—"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-8 w-8 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:hidden"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
