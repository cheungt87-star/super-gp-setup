import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Mail, Phone, MapPin, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { getJobTitleColors } from "@/lib/jobTitleColors";
import { Json } from "@/integrations/supabase/types";

interface WorkingDays {
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
}

interface SecondaryRole {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  job_title_id: string | null;
  job_title_name: string | null;
  primary_site_id: string | null;
  site_name: string | null;
  working_days: Json | null;
  secondary_roles: SecondaryRole[];
}

interface Site {
  id: string;
  name: string;
}

interface JobTitle {
  id: string;
  name: string;
}

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
const dayKeys: (keyof WorkingDays)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function Directory() {
  const { organisationId } = useOrganisation();
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"name" | "job_title" | "site">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const parseSecondaryRoles = (roles: Json | null): SecondaryRole[] => {
    if (!roles || !Array.isArray(roles)) return [];
    return roles.map((r: any) => ({ id: r.id, name: r.name }));
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!organisationId) return;
      
      setLoading(true);
      
      const [usersResult, sitesResult, jobTitlesResult] = await Promise.all([
        supabase.rpc("get_organisation_users", { p_organisation_id: organisationId }),
        supabase.from("sites").select("id, name").eq("organisation_id", organisationId).eq("is_active", true).order("name"),
        supabase.from("job_titles").select("id, name").eq("organisation_id", organisationId).order("name"),
      ]);

      if (usersResult.data) {
        const mappedUsers: User[] = usersResult.data
          .filter((u: any) => u.is_active)
          .map((u: any) => ({
            ...u,
            secondary_roles: parseSecondaryRoles(u.secondary_roles),
          }));
        setUsers(mappedUsers);
      }
      if (sitesResult.data) setSites(sitesResult.data);
      if (jobTitlesResult.data) setJobTitles(jobTitlesResult.data);
      
      setLoading(false);
    };

    fetchData();
  }, [organisationId]);

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    if (jobTitleFilter && jobTitleFilter !== "all") {
      result = result.filter(u => u.job_title_id === jobTitleFilter);
    }

    if (siteFilter && siteFilter !== "all") {
      result = result.filter(u => u.primary_site_id === siteFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u =>
        (u.first_name?.toLowerCase() || "").includes(query) ||
        (u.last_name?.toLowerCase() || "").includes(query) ||
        `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      switch (sortField) {
        case "name":
          aVal = `${a.first_name || ""} ${a.last_name || ""}`.toLowerCase();
          bVal = `${b.first_name || ""} ${b.last_name || ""}`.toLowerCase();
          break;
        case "job_title":
          aVal = (a.job_title_name || "").toLowerCase();
          bVal = (b.job_title_name || "").toLowerCase();
          break;
        case "site":
          aVal = (a.site_name || "").toLowerCase();
          bVal = (b.site_name || "").toLowerCase();
          break;
      }

      const comparison = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [users, jobTitleFilter, siteFilter, searchQuery, sortField, sortDirection]);

  const parseWorkingDays = (wd: Json | null): WorkingDays => {
    const defaultDays = { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false };
    if (!wd || typeof wd !== "object" || Array.isArray(wd)) {
      return defaultDays;
    }
    return { ...defaultDays, ...(wd as Record<string, boolean>) };
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">People Directory</h1>
        <p className="text-muted-foreground">Find and connect with colleagues in your organisation</p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={jobTitleFilter} onValueChange={setJobTitleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Job Titles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Job Titles</SelectItem>
            {jobTitles.map((jt) => (
              <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={`${sortField}-${sortDirection}`} onValueChange={(val) => {
          const [field, dir] = val.split("-") as ["name" | "job_title" | "site", "asc" | "desc"];
          setSortField(field);
          setSortDirection(dir);
        }}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="job_title-asc">Job Title (A-Z)</SelectItem>
            <SelectItem value="job_title-desc">Job Title (Z-A)</SelectItem>
            <SelectItem value="site-asc">Site (A-Z)</SelectItem>
            <SelectItem value="site-desc">Site (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredAndSortedUsers.length} of {users.length} people
      </p>

      {/* People Grid */}
      {filteredAndSortedUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No people found matching your criteria
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedUsers.map((user) => {
            const workingDays = parseWorkingDays(user.working_days);
            const jobTitleColor = getJobTitleColors(user.job_title_name || "");
            
            return (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-4">
                  {/* Name and Job Title */}
                  <div>
                    <h3 className="font-semibold text-lg">
                      {user.first_name || ""} {user.last_name || ""}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.job_title_name && (
                        <Badge className={jobTitleColor}>
                          {user.job_title_name}
                        </Badge>
                      )}
                      {user.secondary_roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant="secondary"
                          className="bg-violet-100 text-violet-700"
                        >
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 text-sm">
                    {user.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${user.email}`} className="hover:text-foreground hover:underline truncate">
                          {user.email}
                        </a>
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${user.phone}`} className="hover:text-foreground hover:underline">
                          {user.phone}
                        </a>
                      </div>
                    )}
                    {user.site_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{user.site_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Working Days */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Working Days</p>
                    <div className="flex gap-1">
                      {dayKeys.map((day, idx) => (
                        <span
                          key={day}
                          className={`w-7 h-7 rounded text-xs font-medium flex items-center justify-center ${
                            workingDays[day]
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {dayLabels[idx]}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}