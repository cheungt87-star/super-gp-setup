import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  steps: string[];
  currentStep: number;
}

export const OnboardingProgress = ({ steps, currentStep }: OnboardingProgressProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                index < currentStep
                  ? "bg-primary text-primary-foreground"
                  : index === currentStep
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {index < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                "hidden sm:inline text-sm font-medium transition-colors",
                index <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5 w-8 mx-2 transition-colors",
                index < currentStep ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};
