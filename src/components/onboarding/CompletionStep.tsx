import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Loader2, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompletionStepProps {
  organisationId: string | null;
}

const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ORG-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const CompletionStep = ({ organisationId }: CompletionStepProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleComplete = async () => {
    if (!organisationId) {
      toast.error("Organisation not found");
      return;
    }

    setLoading(true);

    // Generate and insert invitation code
    const newCode = generateInviteCode();
    
    const { error: codeError } = await supabase
      .from("invitation_codes")
      .insert({
        code: newCode,
        email: null,
        organisation_id: organisationId,
        is_active: true,
        max_uses: 100,
        type: "general" as const,
      });

    if (codeError) {
      // If code already exists (rare collision), try again with different code
      if (codeError.code === '23505') {
        const retryCode = generateInviteCode();
        const { error: retryError } = await supabase
          .from("invitation_codes")
          .insert({
            code: retryCode,
            email: null,
            organisation_id: organisationId,
            is_active: true,
            max_uses: 100,
            type: "general" as const,
          });
        
        if (retryError) {
          toast.error("Failed to generate invitation code");
          setLoading(false);
          return;
        }
        setInviteCode(retryCode);
      } else {
        toast.error("Failed to generate invitation code");
        setLoading(false);
        return;
      }
    } else {
      setInviteCode(newCode);
    }

    // Mark onboarding as complete
    const { error } = await supabase
      .from("organisations")
      .update({ onboarding_complete: true })
      .eq("id", organisationId);

    if (error) {
      toast.error("Failed to complete onboarding");
      setLoading(false);
      return;
    }

    setLoading(false);
    toast.success("Onboarding complete!");
  };

  const handleCopy = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  // Show invite code screen after completion
  if (inviteCode) {
    return (
      <Card className="text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-2xl">Onboarding Complete!</CardTitle>
          <CardDescription className="text-base">
            Share this code with your team members so they can join your organisation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 border border-border rounded-lg p-4 max-w-sm mx-auto">
            <p className="text-xs text-muted-foreground mb-2">Team Invitation Code</p>
            <div className="flex items-center justify-between gap-3">
              <code className="text-2xl font-mono font-bold tracking-wider">{inviteCode}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Team members can use this code at signup to join your organisation automatically.
          </p>

          <Button 
            size="lg" 
            className="gap-2" 
            onClick={handleGoToDashboard}
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

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

        <Button 
          size="lg" 
          className="gap-2" 
          onClick={handleComplete}
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Complete Setup
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
