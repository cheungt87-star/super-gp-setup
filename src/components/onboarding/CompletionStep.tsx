import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CompletionStep = () => {
  const navigate = useNavigate();

  return (
    <Card className="text-center">
      <CardHeader className="pb-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <CardTitle className="text-2xl">You're all set!</CardTitle>
        <CardDescription className="text-base">
          Your workspace is ready. You can now start using Super GP to manage your clinic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 text-left max-w-sm mx-auto">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <span className="text-sm">Sites configured</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <span className="text-sm">Job titles defined</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <span className="text-sm">Team members imported</span>
          </div>
        </div>

        <Button size="lg" className="gap-2" onClick={() => navigate("/dashboard")}>
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
