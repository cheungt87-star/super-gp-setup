import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Search, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { getJobTitleColors } from "@/lib/jobTitleColors";

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title_id: string | null;
  job_title_name: string | null;
  working_days: Record<string, boolean> | null;
  contracted_hours: number | null;
  primary_site_id?: string | null;
}

interface JobTitle {
  id: string;
  name: string;
  job_family_id?: string | null;
}

interface JobFamily {
  id: string;
  name: string;
}

interface StaffPanelProps {
  staff: StaffMember[];
  allStaff: StaffMember[];
  jobTitles: JobTitle[];
  jobFamilies: JobFamily[];
  scheduledHours: Record<string, number>;
  assignedUserIds: string[];
  onOpenLocumDialog: () => void;
}

export const StaffPanel = ({
  staff,
  allStaff,
  jobTitles,
  jobFamilies,
  scheduledHours,
  assignedUserIds,
  onOpenLocumDialog,
}: StaffPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [jobFamilyFilter, setJobFamilyFilter] = useState<string>("all");
  const [jobTitleFilter, setJobTitleFilter] = useState<string>("all");

  // Filter job titles based on selected job family
  const filteredJobTitles = useMemo(() => {
    if (jobFamilyFilter === "all") return jobTitles;
    return jobTitles.filter((jt) => jt.job_family_id === jobFamilyFilter);
  }, [jobTitles, jobFamilyFilter]);

  // Filter staff based on all filters
  const filteredStaff = useMemo(() => {
    let result = staff;

    if (jobFamilyFilter !== "all") {
      const familyJobTitleIds = jobTitles
        .filter((jt) => jt.job_family_id === jobFamilyFilter)
        .map((jt) => jt.id);
      result = result.filter((s) => s.job_title_id && familyJobTitleIds.includes(s.job_title_id));
    }

    if (jobTitleFilter !== "all") {
      result = result.filter((s) => s.job_title_id === jobTitleFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
        return name.includes(q);
      });
    }

    return result.sort((a, b) => {
      const nameA = `${a.first_name || ""} ${a.last_name || ""}`.toLowerCase();
      const nameB = `${b.first_name || ""} ${b.last_name || ""}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [staff, jobFamilyFilter, jobTitleFilter, searchQuery, jobTitles]);

  const handleDragStart = (e: React.DragEvent, staffId: string) => {
    e.dataTransfer.setData("staffId", staffId);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="w-[240px] shrink-0 border-r bg-card flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b">
        <h3 className="text-sm font-semibold mb-2">Available Staff</h3>

        {/* Filters */}
        <div className="space-y-1.5">
          <Select value={jobFamilyFilter} onValueChange={(v) => { setJobFamilyFilter(v); setJobTitleFilter("all"); }}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Job Family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Families</SelectItem>
              {jobFamilies.map((jf) => (
                <SelectItem key={jf.id} value={jf.id}>{jf.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={jobTitleFilter} onValueChange={setJobTitleFilter}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Job Title" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Titles</SelectItem>
              {filteredJobTitles.map((jt) => (
                <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 text-xs pl-7"
            />
          </div>
        </div>
      </div>

      {/* Staff list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredStaff.map((s) => {
            const name = `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unknown";
            const isAssigned = assignedUserIds.includes(s.id);
            const hours = scheduledHours[s.id] || 0;
            const contracted = s.contracted_hours || 0;

            return (
              <div
                key={s.id}
                draggable={!isAssigned}
                onDragStart={(e) => handleDragStart(e, s.id)}
                className={cn(
                  "flex items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors border",
                  isAssigned
                    ? "opacity-40 cursor-not-allowed bg-muted/30 border-transparent"
                    : "cursor-grab active:cursor-grabbing hover:bg-accent/50 border-border/50"
                )}
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate leading-tight">{name}</p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {s.job_title_name && (
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] px-1 py-0 leading-tight", getJobTitleColors(s.job_title_name))}
                      >
                        {s.job_title_name}
                      </Badge>
                    )}
                    {contracted > 0 && (
                      <span className="text-[9px] text-muted-foreground">
                        {hours}/{contracted}h
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredStaff.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No staff found</p>
          )}
        </div>
      </ScrollArea>

      {/* Add Locum button */}
      <div className="p-2 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8"
          onClick={onOpenLocumDialog}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Add Locum / Temp
        </Button>
      </div>
    </div>
  );
};
