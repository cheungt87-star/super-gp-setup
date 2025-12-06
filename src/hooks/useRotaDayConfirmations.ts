import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DayConfirmation {
  id: string;
  rota_week_id: string;
  shift_date: string;
  status: "confirmed" | "confirmed_with_overrides";
  confirmed_by: string;
  confirmed_at: string;
}

export interface DayOverride {
  rule_type: string;
  rule_description: string;
  reason: string;
  shift_date: string;
  facility_id?: string;
}

interface UseRotaDayConfirmationsProps {
  rotaWeekId: string | null;
  organisationId: string | null;
}

export function useRotaDayConfirmations({
  rotaWeekId,
  organisationId,
}: UseRotaDayConfirmationsProps) {
  const [confirmations, setConfirmations] = useState<DayConfirmation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConfirmations = useCallback(async () => {
    if (!rotaWeekId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rota_day_confirmations")
        .select("*")
        .eq("rota_week_id", rotaWeekId);

      if (error) throw error;
      setConfirmations((data || []) as DayConfirmation[]);
    } catch (error) {
      console.error("Error fetching day confirmations:", error);
    } finally {
      setLoading(false);
    }
  }, [rotaWeekId]);

  useEffect(() => {
    fetchConfirmations();
  }, [fetchConfirmations]);

  const confirmDay = useCallback(
    async (
      shiftDate: string,
      status: "confirmed" | "confirmed_with_overrides",
      overrides?: DayOverride[]
    ): Promise<boolean> => {
      if (!rotaWeekId || !organisationId) return false;

      setSaving(true);
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Upsert the day confirmation
        const { error: confirmError } = await supabase
          .from("rota_day_confirmations")
          .upsert(
            {
              rota_week_id: rotaWeekId,
              shift_date: shiftDate,
              status,
              confirmed_by: user.id,
              confirmed_at: new Date().toISOString(),
              organisation_id: organisationId,
            },
            { onConflict: "rota_week_id,shift_date" }
          );

        if (confirmError) throw confirmError;

        // If there are overrides, save them
        if (overrides && overrides.length > 0) {
          const overrideRecords = overrides.map((o) => ({
            rota_week_id: rotaWeekId,
            organisation_id: organisationId,
            overridden_by: user.id,
            rule_type: o.rule_type,
            rule_description: o.rule_description,
            reason: o.reason,
            shift_date: o.shift_date,
            facility_id: o.facility_id || null,
          }));

          const { error: overrideError } = await supabase
            .from("rota_rule_overrides")
            .insert(overrideRecords);

          if (overrideError) throw overrideError;
        }

        // Refresh confirmations
        await fetchConfirmations();
        
        return true;
      } catch (error) {
        console.error("Error confirming day:", error);
        toast({
          title: "Error",
          description: "Failed to confirm day",
          variant: "destructive",
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [rotaWeekId, organisationId, fetchConfirmations]
  );

  const resetDayConfirmation = useCallback(
    async (shiftDate: string): Promise<boolean> => {
      if (!rotaWeekId) return false;

      setSaving(true);
      try {
        const { error } = await supabase
          .from("rota_day_confirmations")
          .delete()
          .eq("rota_week_id", rotaWeekId)
          .eq("shift_date", shiftDate);

        if (error) throw error;

        await fetchConfirmations();
        return true;
      } catch (error) {
        console.error("Error resetting day confirmation:", error);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [rotaWeekId, fetchConfirmations]
  );

  const getConfirmationStatus = useCallback(
    (shiftDate: string): DayConfirmation | undefined => {
      return confirmations.find((c) => c.shift_date === shiftDate);
    },
    [confirmations]
  );

  return {
    confirmations,
    loading,
    saving,
    confirmDay,
    resetDayConfirmation,
    getConfirmationStatus,
    refetch: fetchConfirmations,
  };
}
