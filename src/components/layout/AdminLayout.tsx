import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Users, Building2, Loader2, ShieldAlert, ClipboardList, Briefcase, FolderTree } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { canManageRoles } from "@/lib/roles";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { title: "Users", path: "/admin/users", icon: Users },
  { title: "Sites", path: "/admin/sites", icon: Building2 },
  { title: "Job Families", path: "/admin/job-families", icon: FolderTree },
  { title: "Job Titles", path: "/admin/job-titles", icon: Briefcase },
  { title: "Task Audit", path: "/admin/tasks", icon: ClipboardList },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setHasAccess(canManageRoles(roleData?.role));
      setLoading(false);
    };

    checkAccess();
  }, [navigate]);

  if (loading) {
    return (
      <div className="container py-12">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container py-12">
        <Card className="max-w-md mx-auto animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Sorry, you don't have access to this page. Only administrators can manage users.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Admin</h1>
        <p className="text-muted-foreground">Manage your organisation settings and users.</p>
      </div>

      {/* Sub-navigation tabs */}
      <nav className="flex gap-1 mb-6 border-b border-border">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </NavLink>
        ))}
      </nav>

      {/* Nested route content */}
      <Outlet />
    </div>
  );
}
