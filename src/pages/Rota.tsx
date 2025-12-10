import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RotaScheduleTab } from "@/components/rota/RotaScheduleTab";

const Rota = () => {
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

  if (canManage === null) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="container py-12">
        <Card className="max-w-md mx-auto animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              Sorry, you don't have the right permissions to access this page. Please contact your Management Team to gain access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Rota Manager</h1>
        <p className="text-muted-foreground">Manage staff schedules and shifts.</p>
      </div>

      <RotaScheduleTab />
    </div>
  );
};

export default Rota;
