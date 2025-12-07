import { Home, Calendar, GitBranch, MessageSquare, Settings, User, LogOut, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { canManageRoles, AppRole } from "@/lib/roles";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  userRole: AppRole | null;
}

const mainNavItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Directory", url: "/directory", icon: Users },
  { title: "Rota", url: "/rota", icon: Calendar },
  { title: "Workflows", url: "/workflows", icon: GitBranch },
  { title: "Policy GPT", url: "/policy-gpt", icon: MessageSquare },
];

const adminNavItem = { title: "Admin", url: "/admin", icon: Settings };

export function AppSidebar({ userRole }: AppSidebarProps) {
  const navigate = useNavigate();
  const showAdmin = userRole && canManageRoles(userRole);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">GP</span>
          </div>
          <span className="font-semibold text-lg">Super GP</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {showAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={adminNavItem.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <adminNavItem.icon className="h-4 w-4" />
                      <span>{adminNavItem.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/profile"
                className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarSeparator />
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent text-muted-foreground hover:text-foreground w-full"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
