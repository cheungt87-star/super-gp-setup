import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Users, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { useRotaRules } from "@/hooks/useRotaRules";
import { toast } from "@/hooks/use-toast";
import { StaffingRuleRow } from "./StaffingRuleRow";

interface Site {
  id: string;
  name: string;
}

interface JobTitle {
  id: string;
  name: string;
}

export const RulesConfigurationTab = () => {
  const { organisationId } = useOrganisation();
  const [sites, setSites] = useState<Site[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [loadingSites, setLoadingSites] = useState(true);

  // Adding new staffing rule
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newJobTitleId, setNewJobTitleId] = useState("");
  const [newMinStaff, setNewMinStaff] = useState(0);
  const [newMaxStaff, setNewMaxStaff] = useState<number | null>(null);

  const { rotaRule, staffingRules, loading, saving, saveRotaRule, addStaffingRule, updateStaffingRule, deleteStaffingRule } =
    useRotaRules({ siteId: selectedSiteId, organisationId });

  // Fetch sites and job titles
  useEffect(() => {
    const fetchData = async () => {
      if (!organisationId) return;

      setLoadingSites(true);
      try {
        const [sitesRes, jobTitlesRes] = await Promise.all([
          supabase.from("sites").select("id, name").eq("organisation_id", organisationId).eq("is_active", true).order("name"),
          supabase.from("job_titles").select("id, name").eq("organisation_id", organisationId).order("name"),
        ]);

        if (sitesRes.error) throw sitesRes.error;
        if (jobTitlesRes.error) throw jobTitlesRes.error;

        setSites(sitesRes.data || []);
        setJobTitles(jobTitlesRes.data || []);

        // Auto-select first site
        if (sitesRes.data && sitesRes.data.length > 0 && !selectedSiteId) {
          setSelectedSiteId(sitesRes.data[0].id);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingSites(false);
      }
    };

    fetchData();
  }, [organisationId]);

  const handleAddStaffingRule = async () => {
    if (!newJobTitleId) {
      toast({
        title: "Select job title",
        description: "Please select a job title for the staffing rule",
        variant: "destructive",
      });
      return;
    }

    // If no rota rule exists yet, create one first
    if (!rotaRule) {
      const saved = await saveRotaRule({
        require_oncall: true, // Always mandatory
      });
      if (!saved) return;
    }

    const success = await addStaffingRule(newJobTitleId, newMinStaff, newMaxStaff);
    if (success) {
      setIsAddingRule(false);
      setNewJobTitleId("");
      setNewMinStaff(0);
      setNewMaxStaff(null);
      toast({
        title: "Rule added",
        description: "Staffing requirement has been added",
      });
    }
  };

  // Filter out job titles that already have rules
  const availableJobTitles = jobTitles.filter(
    (jt) => !staffingRules.some((sr) => sr.job_title_id === jt.id)
  );

  if (loadingSites) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No sites found. Please create a site first in the Admin panel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Site Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Site</CardTitle>
          <CardDescription>Configure rota rules for a specific site</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedSiteId || ""} onValueChange={setSelectedSiteId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSiteId && (
        <>

          {/* Staffing Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Staffing Requirements
              </CardTitle>
              <CardDescription>Set minimum and maximum staff numbers per job title</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Title</TableHead>
                        <TableHead className="w-32">Min Staff</TableHead>
                        <TableHead className="w-32">Max Staff</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffingRules.length === 0 && !isAddingRule ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No staffing requirements configured yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {staffingRules.map((rule) => (
                            <StaffingRuleRow
                              key={rule.id}
                              rule={rule}
                              onUpdate={updateStaffingRule}
                              onDelete={deleteStaffingRule}
                            />
                          ))}
                        </>
                      )}

                      {isAddingRule && (
                        <TableRow>
                          <TableCell>
                            <Select value={newJobTitleId} onValueChange={setNewJobTitleId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select job title" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableJobTitles.map((jt) => (
                                  <SelectItem key={jt.id} value={jt.id}>
                                    {jt.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={newMinStaff}
                              onChange={(e) => setNewMinStaff(parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={newMaxStaff ?? ""}
                              onChange={(e) => setNewMaxStaff(e.target.value ? parseInt(e.target.value) : null)}
                              placeholder="∞"
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" onClick={handleAddStaffingRule}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setIsAddingRule(false);
                                  setNewJobTitleId("");
                                  setNewMinStaff(0);
                                  setNewMaxStaff(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {!isAddingRule && availableJobTitles.length > 0 && (
                    <Button variant="outline" className="mt-4" onClick={() => setIsAddingRule(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Staffing Rule
                    </Button>
                  )}

                  {availableJobTitles.length === 0 && staffingRules.length > 0 && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      All job titles have staffing rules configured.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
