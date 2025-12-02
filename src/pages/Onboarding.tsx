import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { SitesStep } from "@/components/onboarding/SitesStep";
import { JobTitlesStep } from "@/components/onboarding/JobTitlesStep";
import { UsersStep } from "@/components/onboarding/UsersStep";
import { CompletionStep } from "@/components/onboarding/CompletionStep";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["Sites", "Job Titles", "Users", "Complete"];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUserId(session.user.id);
      
      // Fetch user's profile and role
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("organisation_id")
          .eq("id", session.user.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle()
      ]);
      
      if (!profileResult.data?.organisation_id) {
        toast.error("Organisation setup incomplete. Please contact support.");
        navigate("/auth");
        return;
      }
      
      setOrganisationId(profileResult.data.organisation_id);
      
      // Check if user is admin
      const userIsAdmin = roleResult.data?.role === "admin";
      setIsAdmin(userIsAdmin);
      
      // If not admin, check if org onboarding is complete and redirect to dashboard
      if (!userIsAdmin) {
        const { data: org } = await supabase
          .from("organisations")
          .select("onboarding_complete")
          .eq("id", profileResult.data.organisation_id)
          .maybeSingle();
        
        if (org?.onboarding_complete) {
          // Non-admin user, org already set up - go to dashboard
          navigate("/dashboard");
          return;
        } else {
          // Non-admin but onboarding not complete - shouldn't happen, but handle it
          toast.error("Organisation onboarding is not complete. Please contact your manager.");
          await supabase.auth.signOut();
          navigate("/auth");
          return;
        }
      }
      
      // Admin user - check if onboarding already complete
      const { data: org } = await supabase
        .from("organisations")
        .select("onboarding_complete")
        .eq("id", profileResult.data.organisation_id)
        .maybeSingle();
      
      if (org?.onboarding_complete) {
        // Onboarding already done, go to dashboard
        navigate("/dashboard");
        return;
      }
      
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">GP</span>
            </div>
            <span className="font-semibold text-lg">Super GP</span>
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="max-w-3xl mx-auto">
          <OnboardingProgress steps={STEPS} currentStep={currentStep} />

          <div className="mt-10 animate-fade-in">
            {currentStep === 0 && (
              <SitesStep 
                onNext={handleNext} 
                userId={userId} 
                organisationId={organisationId}
              />
            )}
            {currentStep === 1 && (
              <JobTitlesStep 
                onNext={handleNext} 
                onBack={handleBack}
                organisationId={organisationId}
              />
            )}
            {currentStep === 2 && (
              <UsersStep 
                onNext={handleNext} 
                onBack={handleBack}
                organisationId={organisationId}
              />
            )}
            {currentStep === 3 && (
              <CompletionStep organisationId={organisationId} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
