import { GitBranch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Workflows = () => {
  return (
    <div className="container py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Workflows</h1>
        <p className="text-muted-foreground">Automate and manage clinical workflows.</p>
      </div>

      <Card className="max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <GitBranch className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Workflow management features are currently in development. Check back soon for process automation and task management.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Streamline your clinical operations with intelligent workflows.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Workflows;
