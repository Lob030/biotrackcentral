import { useMemo } from "react";
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
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FlaskConical, LayoutDashboard, GitBranch, Package, Layers, BellRing, Boxes, Shield, Users, ShoppingCart, BarChart2, LogOut, Grid } from "lucide-react";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import type { NavigationItem } from "@/shared/types/workspace";

// Icon mapping for dynamic navigation
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-dashboard': LayoutDashboard,
  'folder': Layers,
  'package': Package,
  'users': Users,
  'shopping-cart': ShoppingCart,
  'dollar-sign': BarChart2,
  'bell': BellRing,
  'trending-down': BarChart2,
  'flask-conical': FlaskConical,
  'boxes': Boxes,
  'shield': Shield,
  'grid': Grid,
};

// Fallback static navigation (preserved for compatibility)
const FALLBACK_NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Líneas Genéticas", url: "/lineas", icon: GitBranch },
  { title: "Cajas", url: "/cajas", icon: Package },
  { title: "Lotes", url: "/lotes", icon: Layers },
  { title: "Stock por tamaño", url: "/stock", icon: Boxes },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Pedidos", url: "/pedidos", icon: ShoppingCart },
  { title: "Ventas & Analytics", url: "/ventas", icon: BarChart2 },
  { title: "Alertas", url: "/alertas", icon: BellRing },
];

/**
 * Convert module navigation items to sidebar-friendly format with grouping
 */
function groupNavigationItems(items: NavigationItem[]): Array<{ group: string; items: NavigationItem[] }> {
  const groups = new Map<string, NavigationItem[]>();
  
  for (const item of items) {
    // Extract module group from moduleId (e.g., "bioterio_lotes" -> "Bioterio")
    const moduleId = item.moduleId;
    const groupName = moduleId.split('_')[0] || 'General';
    // Capitalize first letter
    const displayGroupName = groupName.charAt(0).toUpperCase() + groupName.slice(1);
    
    if (!groups.has(displayGroupName)) {
      groups.set(displayGroupName, []);
    }
    groups.get(displayGroupName)!.push(item);
  }
  
  return Array.from(groups.entries()).map(([group, items]) => ({
    group,
    items: items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
  }));
}

export function AppSidebar() {
  const { profile, role, signOut, isSuperAdmin, organization } = useAuth();
  const location = useLocation();
  const { capabilities, isLoading } = useWorkspaceContext();
  const logoUrl = organization?.logo_url ?? null;
  const bioterioName = organization?.nombre_bioterio || organization?.nombre || "Bioterio";

  // Get dynamic navigation from workspace capabilities
  const navigationGroups = useMemo(() => {
    if (!capabilities?.navigation || capabilities.navigation.length === 0) {
      // Fallback to static navigation if dynamic navigation fails
      return [{ group: 'General', items: [] }];
    }
    return groupNavigationItems(capabilities.navigation);
  }, [capabilities]);

  // Build admin items based on role
  const adminItems = useMemo(() => {
    const items: NavigationItem[] = [];
    if (role === "admin" || isSuperAdmin) {
      items.push({
        id: 'workspace_selector',
        label: 'Volver al selector',
        path: '/hub',
        moduleId: 'bioterio_dashboard',
        icon: 'grid',
      });
      items.push({
        id: 'admin_panel',
        label: 'Administración',
        path: '/admin',
        moduleId: 'bioterio_dashboard',
        icon: 'shield',
      });
    }
    if (isSuperAdmin) {
      items.push({
        id: 'master_panel',
        label: 'Panel Maestro',
        path: '/master',
        moduleId: 'bioterio_dashboard',
        icon: 'shield',
      });
    }
    return items;
  }, [role, isSuperAdmin]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={bioterioName}
                className="h-full w-full object-cover"
              />
            ) : (
              <FlaskConical className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            )}
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="display-font text-base font-bold text-sidebar-foreground truncate max-w-[160px]">{bioterioName}</span>
            <span className="text-xs text-muted-foreground">Sistema de Gestión</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {isLoading ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-11 w-full animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : navigationGroups.length > 0 && navigationGroups[0].group !== 'General' ? (
          // Dynamic navigation from workspace capabilities
          navigationGroups.map(({ group, items }) => (
            <SidebarGroup key={group}>
              {group !== 'General' && (
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1" aria-label={`Navegación de ${group}`}>
                  {items.map((item) => {
                    const active = location.pathname === item.path;
                    const IconComponent = item.icon ? ICON_MAP[item.icon] : LayoutDashboard;
                    
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          className="h-11"
                          tooltip={item.label}
                          isActive={active}
                        >
                          <NavLink
                            to={item.path}
                            end
                            aria-current={active ? "page" : undefined}
                            className={
                              active
                                ? "!bg-sidebar-accent !text-primary font-medium relative"
                                : "text-sidebar-foreground hover:!bg-sidebar-accent/60 hover:!text-sidebar-foreground"
                            }
                          >
                            {IconComponent && <IconComponent className="h-[18px] w-[18px]" />}
                            <span>{item.label}</span>
                            {active && (
                              <span
                                className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-glow group-data-[collapsible=icon]:hidden"
                                aria-hidden
                              />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        ) : (
          // Fallback to static navigation
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1" aria-label="Navegación principal">
                {FALLBACK_NAV_ITEMS.map((item) => {
                  const active = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className="h-11"
                        tooltip={item.title}
                        isActive={active}
                      >
                        <NavLink
                          to={item.url}
                          end
                          aria-current={active ? "page" : undefined}
                          className={
                            active
                              ? "!bg-sidebar-accent !text-primary font-medium relative"
                              : "text-sidebar-foreground hover:!bg-sidebar-accent/60 hover:!text-sidebar-foreground"
                          }
                        >
                          <item.icon className="h-[18px] w-[18px]" />
                          <span>{item.title}</span>
                          {active && (
                            <span
                              className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-glow group-data-[collapsible=icon]:hidden"
                              aria-hidden
                            />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin section (always shown for admins) */}
        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1" aria-label="Navegación del sistema">
                {adminItems.map((item) => {
                  const active = location.pathname === item.path;
                  const IconComponent = item.icon ? ICON_MAP[item.icon] : Shield;
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        className="h-11"
                        tooltip={item.label}
                        isActive={active}
                      >
                        <NavLink
                          to={item.path}
                          end
                          aria-current={active ? "page" : undefined}
                          className={
                            active
                              ? "!bg-sidebar-accent !text-primary font-medium relative"
                              : "text-sidebar-foreground hover:!bg-sidebar-accent/60 hover:!text-sidebar-foreground"
                          }
                        >
                          {IconComponent && <IconComponent className="h-[18px] w-[18px]" />}
                          <span>{item.label}</span>
                          {active && (
                            <span
                              className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-glow group-data-[collapsible=icon]:hidden"
                              aria-hidden
                            />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
