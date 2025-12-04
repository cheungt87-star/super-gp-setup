import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  id: string;
  name: string;
}

interface UserFiltersProps {
  jobTitles: FilterOption[];
  sites: FilterOption[];
  jobTitleFilter: string;
  siteFilter: string;
  searchQuery: string;
  onJobTitleChange: (value: string) => void;
  onSiteChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
}

export function UserFilters({
  jobTitles,
  sites,
  jobTitleFilter,
  siteFilter,
  searchQuery,
  onJobTitleChange,
  onSiteChange,
  onSearchChange,
  onClearFilters,
}: UserFiltersProps) {
  const hasActiveFilters = jobTitleFilter || siteFilter || searchQuery;

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <Select value={jobTitleFilter} onValueChange={onJobTitleChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Job Titles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Job Titles</SelectItem>
          {jobTitles.map((jt) => (
            <SelectItem key={jt.id} value={jt.id}>
              {jt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={siteFilter} onValueChange={onSiteChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Sites" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sites</SelectItem>
          {sites.map((site) => (
            <SelectItem key={site.id} value={site.id}>
              {site.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={onClearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
