import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface FilterOption {
  id: string;
  name: string;
}

interface WorkflowTaskFiltersProps {
  sites: FilterOption[];
  siteFilter: string;
  searchQuery: string;
  onSiteFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onClearFilters: () => void;
}

const WorkflowTaskFilters = ({
  sites,
  siteFilter,
  searchQuery,
  onSiteFilterChange,
  onSearchQueryChange,
  onClearFilters,
}: WorkflowTaskFiltersProps) => {
  const hasActiveFilters = siteFilter !== "all" || searchQuery !== "";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select value={siteFilter} onValueChange={onSiteFilterChange}>
        <SelectTrigger className="w-[180px]">
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-9 w-[200px]"
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
};

export default WorkflowTaskFilters;
