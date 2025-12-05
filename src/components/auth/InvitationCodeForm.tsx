import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

interface InvitationValidationResult {
  code: string;
  organisationId: string | null;
  organisationName: string | null;
  onboardingComplete: boolean;
  isEmailLinked: boolean;
  profileExists: boolean;
  email: string;
  hasAuthAccount: boolean;
  csvProfile?: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    primarySiteId: string | null;
    primarySiteName: string | null;
    jobTitleId: string | null;
    jobTitleName: string | null;
  };
}

interface InvitationCodeFormProps {
  onValidCode: (result: InvitationValidationResult) => void;
  onBackToLogin: () => void;
}

export const InvitationCodeForm = ({ onValidCode, onBackToLogin }: InvitationCodeFormProps) => {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error("Please enter an invitation code");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    // Call the SECURITY DEFINER function to validate the invitation code
    const { data, error } = await supabase.rpc('validate_invitation_code', {
      p_code: code.trim(),
      p_email: email.trim()
    });

    if (error) {
      console.error("Invitation code validation error:", error);
      toast.error("Failed to validate invitation code");
      setLoading(false);
      return;
    }

    // Type the response
    const result = data as {
      valid: boolean;
      error?: string;
      code?: string;
      organisation_id?: string | null;
      organisation_name?: string | null;
      onboarding_complete?: boolean;
      is_email_linked?: boolean;
      profile_exists?: boolean;
      has_auth_account?: boolean;
      csv_profile?: {
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        primary_site_id: string | null;
        primary_site_name: string | null;
        job_title_id: string | null;
        job_title_name: string | null;
      };
    } | null;

    if (!result?.valid) {
      toast.error(result?.error || "Invalid invitation code");
      setLoading(false);
      return;
    }

    // Code is valid
    toast.success("Invitation code accepted");
    onValidCode({
      code: result.code!,
      organisationId: result.organisation_id ?? null,
      organisationName: result.organisation_name ?? null,
      onboardingComplete: result.onboarding_complete ?? false,
      isEmailLinked: result.is_email_linked ?? false,
      profileExists: result.profile_exists ?? false,
      email: email.trim(),
      hasAuthAccount: result.has_auth_account ?? false,
      csvProfile: result.csv_profile ? {
        firstName: result.csv_profile.first_name ?? null,
        lastName: result.csv_profile.last_name ?? null,
        phone: result.csv_profile.phone ?? null,
        primarySiteId: result.csv_profile.primary_site_id ?? null,
        primarySiteName: result.csv_profile.primary_site_name ?? null,
        jobTitleId: result.csv_profile.job_title_id ?? null,
        jobTitleName: result.csv_profile.job_title_name ?? null,
      } : undefined,
    });
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
        </div>
        <CardTitle>Enter your invitation code</CardTitle>
        <CardDescription>
          You'll need an invitation code from your organisation to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@clinic.nhs.uk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Invitation Code</Label>
            <Input
              id="code"
              placeholder="Enter your code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono text-center text-lg tracking-widest"
              autoComplete="off"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </form>
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <button
            type="button"
            className="text-primary font-medium hover:underline"
            onClick={onBackToLogin}
          >
            Sign in
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
