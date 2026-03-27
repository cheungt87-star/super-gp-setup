import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, GripVertical } from "lucide-react";
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

interface Site {
  id: string;
  name: string;
}

interface StaffPanelProps {
  staff: StaffMember[];
  allStaff: StaffMember[];
  jobTitles: JobTitle[];
  jobFamilies: JobFamily[];
  sites: Site[];
  assignedUserIds: string[];
}

export const StaffPanel = ({
  staff,
  allStaff,
  jobTitles,
  jobFamilies,
  sites,
  assignedUserIds,
}: StaffPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState<string>("all");
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

    if (siteFilter !== "all") {
      result = result.filter((s) => s.primary_site_id === siteFilter);
    }

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
  }, [staff, siteFilter, jobFamilyFilter, jobTitleFilter, searchQuery, jobTitles]);

  const handleDragStart = (e: React.DragEvent, staffId: string) => {
    e.dataTransfer.setData("staffId", staffId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleLocumDragStart = (e: React.DragEvent, type: "confirmed" | "unconfirmed") => {
    e.dataTransfer.setData("locumType", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="w-[240px] shrink-0 border-r bg-card flex flex-col sticky top-0 self-start h-screen">
      {/* Header */}
      <div className="px-3 py-3 border-b">
        <h3 className="text-sm font-semibold mb-2">Available Staff</h3>

        {/* Filters */}
        <div className="space-y-1.5">
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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

      {/* Fixed Locum Badges */}
      <div className="px-2 pt-2 pb-1 space-y-1 border-b">
        <div
          draggable
          onDragStart={(e) => handleLocumDragStart(e, "confirmed")}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing border border-green-300 bg-green-500 text-white font-medium"
        >
          <GripVertical className="h-3.5 w-3.5 text-white/70 shrink-0" />
          <span className="truncate">Locum - Confirmed</span>
        </div>
        <div
          draggable
          onDragStart={(e) => handleLocumDragStart(e, "unconfirmed")}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing border border-red-300 bg-red-500 text-white font-medium"
        >
          <GripVertical className="h-3.5 w-3.5 text-white/70 shrink-0" />
          <span className="truncate">Locum - Unconfirmed</span>
        </div>
      </div>

      {/* Staff list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredStaff.map((s) => {
            const name = `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unknown";
            const isAssigned = assignedUserIds.includes(s.id);

            return (
              <div
                key={s.id}
                draggable={!isAssigned}
                onDragStart={(e) => handleDragStart(e, s.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors border",
                  isAssigned
                    ? "opacity-40 cursor-not-allowed bg-muted/30 border-transparent"
                    : "cursor-grab active:cursor-grabbing hover:bg-accent/50 border-border/50"
                )}
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                <span className="font-medium truncate">{name}</span>
                {s.job_title_name && (
                  <Badge
                    variant="outline"
                    className={cn("text-[9px] px-1 py-0 leading-tight shrink-0 whitespace-nowrap", getJobTitleColors(s.job_title_name))}
                  >
                    {s.job_title_name}
                  </Badge>
                )}
              </div>
            );
          })}
          {filteredStaff.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No staff found</p>
          )}
        </div>
      </ScrollArea>

    </div>
  );
};
