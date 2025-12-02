import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { SitesStep } from "@/components/onboarding/SitesStep";
import { JobTitlesStep } from "@/components/onboarding/JobTitlesStep";
import { UsersStep } from "@/components/onboarding/UsersStep";
import { CompletionStep } from "@/components/onboarding/CompletionStep";
import { Loader2 } from "lucide-react";

const STEPS = ["Sites", "Job Titles", "Users", "Complete"];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
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
              <SitesStep onNext={handleNext} userId={userId} />
            )}
            {currentStep === 1 && (
              <JobTitlesStep onNext={handleNext} onBack={handleBack} />
            )}
            {currentStep === 2 && (
              <UsersStep onNext={handleNext} onBack={handleBack} />
            )}
            {currentStep === 3 && (
              <CompletionStep />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
