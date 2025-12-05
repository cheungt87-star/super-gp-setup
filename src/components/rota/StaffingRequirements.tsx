import { cn } from "@/lib/utils";
import { Check, AlertTriangle } from "lucide-react";
import type { RotaShift } from "@/hooks/useRotaSchedule";
import type { StaffingRule } from "@/hooks/useRotaRules";

interface JobTitle {
  id: string;
  name: string;
}

interface StaffingRequirementsProps {
  shifts: RotaShift[];
  staffingRules: StaffingRule[];
  jobTitles: JobTitle[];
}

export const StaffingRequirements = ({
  shifts,
  staffingRules,
  jobTitles,
}: StaffingRequirementsProps) => {
  if (staffingRules.length === 0) return null;

  // Count staff by job title (excluding on-call shifts)
  const assignedByJobTitle: Record<string, number> = {};
  shifts
    .filter((s) => !s.is_oncall)
    .forEach((shift) => {
      const jobTitleId = shift.job_title_id;
      if (jobTitleId) {
        assignedByJobTitle[jobTitleId] = (assignedByJobTitle[jobTitleId] || 0) + 1;
      }
    });

  return (
    <div className="space-y-0.5 mb-2 px-1">
      {staffingRules.map((rule) => {
        const jobTitle = jobTitles.find((jt) => jt.id === rule.job_title_id);
        if (!jobTitle) return null;

        const assigned = assignedByJobTitle[rule.job_title_id] || 0;
        const met = assigned >= rule.min_staff;
        const shortName = jobTitle.name.length > 8 
          ? jobTitle.name.substring(0, 7) + "…" 
          : jobTitle.name;

        return (
          <div
            key={rule.id}
            className={cn(
              "flex items-center justify-between text-xs rounded px-1.5 py-0.5",
              met ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"
            )}
          >
            <span className="truncate font-medium" title={jobTitle.name}>
              {shortName}
            </span>
            <div className="flex items-center gap-1">
              <span className="font-mono">
                {assigned}/{rule.min_staff}
              </span>
              {met ? (
                <Check className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
