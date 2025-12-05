import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WorkflowManagementCard from "@/components/workflows/WorkflowManagementCard";

const Workflows = () => {
  const [canManage, setCanManage] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanManage(false);
        return;
      }

      const { data } = await supabase.rpc("can_manage_roles", { _user_id: user.id });
      setCanManage(data === true);
    };

    checkPermissions();
  }, []);

  // Show loading state while checking permissions
  if (canManage === null) {
    return (
      <div className="container py-12">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Workflows</h1>
          <p className="text-muted-foreground">Create and manage recurring operational tasks across your sites.</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!canManage) {
    return (
      <div className="container py-12">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Workflows</h1>
          <p className="text-muted-foreground">Create and manage recurring operational tasks across your sites.</p>
        </div>

        <Card className="max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You don't have permission to manage workflow tasks. Contact your administrator for access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Workflows</h1>
        <p className="text-muted-foreground">Create and manage recurring operational tasks across your sites.</p>
      </div>

      <WorkflowManagementCard />
    </div>
  );
};

export default Workflows;
