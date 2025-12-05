import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RotaRule {
  id: string;
  site_id: string;
  organisation_id: string;
  am_shift_start: string;
  am_shift_end: string;
  pm_shift_start: string;
  pm_shift_end: string;
  require_oncall: boolean;
}

interface StaffingRule {
  id: string;
  rota_rule_id: string;
  job_title_id: string;
  job_title_name?: string;
  min_staff: number;
  max_staff: number | null;
  organisation_id: string;
}

interface UseRotaRulesProps {
  siteId: string | null;
  organisationId: string | null;
}

export const useRotaRules = ({ siteId, organisationId }: UseRotaRulesProps) => {
  const [rotaRule, setRotaRule] = useState<RotaRule | null>(null);
  const [staffingRules, setStaffingRules] = useState<StaffingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!siteId || !organisationId) {
      setRotaRule(null);
      setStaffingRules([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch rota rule for the site
      const { data: ruleData, error: ruleError } = await supabase
        .from("rota_rules")
        .select("*")
        .eq("site_id", siteId)
        .maybeSingle();

      if (ruleError) throw ruleError;

      if (ruleData) {
        setRotaRule(ruleData);

        // Fetch staffing rules with job title names
        const { data: staffingData, error: staffingError } = await supabase
          .from("rota_staffing_rules")
          .select(`
            *,
            job_titles(name)
          `)
          .eq("rota_rule_id", ruleData.id);

        if (staffingError) throw staffingError;

        setStaffingRules(
          (staffingData || []).map((rule: any) => ({
            ...rule,
            job_title_name: rule.job_titles?.name,
          }))
        );
      } else {
        setRotaRule(null);
        setStaffingRules([]);
      }
    } catch (error: any) {
      console.error("Error fetching rota rules:", error);
      toast({
        title: "Error",
        description: "Failed to load rota rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [siteId, organisationId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const saveRotaRule = async (ruleData: Partial<RotaRule>) => {
    if (!siteId || !organisationId) return null;

    setSaving(true);
    try {
      if (rotaRule) {
        // Update existing rule
        const { data, error } = await supabase
          .from("rota_rules")
          .update({
            am_shift_start: ruleData.am_shift_start,
            am_shift_end: ruleData.am_shift_end,
            pm_shift_start: ruleData.pm_shift_start,
            pm_shift_end: ruleData.pm_shift_end,
            require_oncall: ruleData.require_oncall,
          })
          .eq("id", rotaRule.id)
          .select()
          .single();

        if (error) throw error;
        setRotaRule(data);
        return data;
      } else {
        // Create new rule
        const { data, error } = await supabase
          .from("rota_rules")
          .insert({
            site_id: siteId,
            organisation_id: organisationId,
            am_shift_start: ruleData.am_shift_start || "09:00",
            am_shift_end: ruleData.am_shift_end || "13:00",
            pm_shift_start: ruleData.pm_shift_start || "13:00",
            pm_shift_end: ruleData.pm_shift_end || "18:00",
            require_oncall: ruleData.require_oncall || false,
          })
          .select()
          .single();

        if (error) throw error;
        setRotaRule(data);
        return data;
      }
    } catch (error: any) {
      console.error("Error saving rota rule:", error);
      toast({
        title: "Error",
        description: "Failed to save rota rules",
        variant: "destructive",
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const addStaffingRule = async (jobTitleId: string, minStaff: number, maxStaff: number | null) => {
    if (!rotaRule || !organisationId) return false;

    try {
      const { error } = await supabase.from("rota_staffing_rules").insert({
        rota_rule_id: rotaRule.id,
        job_title_id: jobTitleId,
        min_staff: minStaff,
        max_staff: maxStaff,
        organisation_id: organisationId,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Duplicate rule",
            description: "A staffing rule for this job title already exists",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return false;
      }

      await fetchRules();
      return true;
    } catch (error: any) {
      console.error("Error adding staffing rule:", error);
      toast({
        title: "Error",
        description: "Failed to add staffing rule",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateStaffingRule = async (id: string, minStaff: number, maxStaff: number | null) => {
    try {
      const { error } = await supabase
        .from("rota_staffing_rules")
        .update({ min_staff: minStaff, max_staff: maxStaff })
        .eq("id", id);

      if (error) throw error;
      await fetchRules();
      return true;
    } catch (error: any) {
      console.error("Error updating staffing rule:", error);
      toast({
        title: "Error",
        description: "Failed to update staffing rule",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteStaffingRule = async (id: string) => {
    try {
      const { error } = await supabase.from("rota_staffing_rules").delete().eq("id", id);

      if (error) throw error;
      await fetchRules();
      return true;
    } catch (error: any) {
      console.error("Error deleting staffing rule:", error);
      toast({
        title: "Error",
        description: "Failed to delete staffing rule",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    rotaRule,
    staffingRules,
    loading,
    saving,
    saveRotaRule,
    addStaffingRule,
    updateStaffingRule,
    deleteStaffingRule,
    refetch: fetchRules,
  };
};
