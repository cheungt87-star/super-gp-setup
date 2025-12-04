import { Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Admin = () => {
  return (
    <div className="container py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Admin</h1>
        <p className="text-muted-foreground">Manage your organisation settings and users.</p>
      </div>

      <Card className="max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Admin features are currently in development. Check back soon for user management, role assignments, and organisation settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Full administrative control is on the way.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
