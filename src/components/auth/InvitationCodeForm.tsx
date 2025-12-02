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

    // Validate the invitation code and check email
    const { data: invitation, error } = await supabase
      .from("invitation_codes")
      .select(`
        id, 
        organisation_id, 
        max_uses, 
        used_count, 
        expires_at, 
        is_active,
        email,
        organisations!invitation_codes_organisation_id_fkey (
          id,
          name,
          onboarding_complete
        )
      `)
      .eq("code", code.trim())
      .maybeSingle();

    if (error) {
      toast.error("Failed to validate invitation code");
      setLoading(false);
      return;
    }

    if (!invitation) {
      toast.error("Invitation code not recognised");
      setLoading(false);
      return;
    }

    if (!invitation.is_active) {
      toast.error("This invitation code is no longer active");
      setLoading(false);
      return;
    }

    if (invitation.used_count >= invitation.max_uses) {
      toast.error("This invitation code has already been used");
      setLoading(false);
      return;
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      toast.error("This invitation code has expired");
      setLoading(false);
      return;
    }

    // Check if email matches the invitation code's email (if set)
    if (invitation.email && invitation.email.toLowerCase() !== email.trim().toLowerCase()) {
      toast.error("This invitation code is not valid for this email address");
      setLoading(false);
      return;
    }

    // Type assertion for the joined organisation data
    const org = invitation.organisations as { id: string; name: string; onboarding_complete: boolean } | null;

    // Check if this user's email is specifically linked to the invitation code
    const isEmailLinked = invitation.email !== null && 
      invitation.email.toLowerCase() === email.trim().toLowerCase();

    // Check if a profile already exists for this email
    const { data: profileExists } = await supabase
      .rpc('check_profile_exists_by_email', { check_email: email.trim() });

    // Code is valid
    toast.success("Invitation code accepted");
    onValidCode({
      code: code.trim(),
      organisationId: invitation.organisation_id,
      organisationName: org?.name || null,
      onboardingComplete: org?.onboarding_complete || false,
      isEmailLinked,
      profileExists: profileExists || false,
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
