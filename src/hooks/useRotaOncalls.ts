import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface RotaOncall {
  id: string;
  organisation_id: string;
  oncall_date: string;
  oncall_slot: number;
  user_id: string | null;
  user_name?: string;
  job_title_name?: string | null;
  is_temp_staff: boolean;
  temp_staff_name: string | null;
  temp_confirmed: boolean;
}

interface UseRotaOncallsProps {
  organisationId: string | null;
  weekStart: string; // yyyy-MM-dd format
}

export function useRotaOncalls({ organisationId, weekStart }: UseRotaOncallsProps) {
  const [oncalls, setOncalls] = useState<RotaOncall[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchOncalls = useCallback(async () => {
    if (!organisationId || !weekStart) return;

    setLoading(true);
    try {
      // Calculate week end (7 days from week start)
      const startDate = new Date(weekStart);
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split("T")[0]);
      }

      const { data, error } = await supabase
        .from("rota_oncalls")
        .select(`
          id,
          organisation_id,
          oncall_date,
          oncall_slot,
          user_id,
          is_temp_staff,
          temp_staff_name,
          temp_confirmed,
          profiles(first_name, last_name, job_titles(name))
        `)
        .eq("organisation_id", organisationId)
        .in("oncall_date", dates)
        .order("oncall_date")
        .order("oncall_slot");

      if (error) throw error;

      const mappedOncalls: RotaOncall[] = (data || []).map((row: any) => ({
        id: row.id,
        organisation_id: row.organisation_id,
        oncall_date: row.oncall_date,
        oncall_slot: row.oncall_slot,
        user_id: row.user_id,
        user_name: row.is_temp_staff && !row.user_id
          ? row.temp_staff_name
          : row.profiles
            ? `${row.profiles.first_name || ""} ${row.profiles.last_name || ""}`.trim()
            : null,
        job_title_name: row.profiles?.job_titles?.name || null,
        is_temp_staff: row.is_temp_staff,
        temp_staff_name: row.temp_staff_name,
        temp_confirmed: row.temp_confirmed,
      }));

      setOncalls(mappedOncalls);
    } catch (error) {
      console.error("Error fetching oncalls:", error);
    } finally {
      setLoading(false);
    }
  }, [organisationId, weekStart]);

  useEffect(() => {
    fetchOncalls();
  }, [fetchOncalls]);

  const addOncall = useCallback(
    async (
      dateKey: string,
      slot: number,
      userId: string | null,
      isTempStaff = false,
      tempConfirmed = false,
      tempStaffName?: string
    ) => {
      if (!organisationId) return null;

      setSaving(true);
      try {
        const { data, error } = await supabase
          .from("rota_oncalls")
          .upsert(
            {
              organisation_id: organisationId,
              oncall_date: dateKey,
              oncall_slot: slot,
              user_id: userId,
              is_temp_staff: isTempStaff,
              temp_confirmed: tempConfirmed,
              temp_staff_name: tempStaffName || null,
            },
            { onConflict: "organisation_id,oncall_date,oncall_slot" }
          )
          .select()
          .single();

        if (error) throw error;

        // Refetch to get updated data with profile info
        await fetchOncalls();
        return data;
      } catch (error) {
        console.error("Error adding oncall:", error);
        toast({
          title: "Error",
          description: "Failed to add on-call assignment",
          variant: "destructive",
        });
        return null;
      } finally {
        setSaving(false);
      }
    },
    [organisationId, fetchOncalls]
  );

  const deleteOncall = useCallback(
    async (dateKey: string, slot: number) => {
      if (!organisationId) return false;

      setSaving(true);
      try {
        const { error } = await supabase
          .from("rota_oncalls")
          .delete()
          .eq("organisation_id", organisationId)
          .eq("oncall_date", dateKey)
          .eq("oncall_slot", slot);

        if (error) throw error;

        setOncalls((prev) =>
          prev.filter((oc) => !(oc.oncall_date === dateKey && oc.oncall_slot === slot))
        );
        return true;
      } catch (error) {
        console.error("Error deleting oncall:", error);
        toast({
          title: "Error",
          description: "Failed to remove on-call assignment",
          variant: "destructive",
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [organisationId]
  );

  const deleteOncallsForDay = useCallback(
    async (dateKey: string) => {
      if (!organisationId) return false;

      setSaving(true);
      try {
        const { error } = await supabase
          .from("rota_oncalls")
          .delete()
          .eq("organisation_id", organisationId)
          .eq("oncall_date", dateKey);

        if (error) throw error;

        setOncalls((prev) => prev.filter((oc) => oc.oncall_date !== dateKey));
        return true;
      } catch (error) {
        console.error("Error deleting oncalls for day:", error);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [organisationId]
  );

  const copyOncallsFromDay = useCallback(
    async (sourceDateKey: string, targetDateKey: string) => {
      if (!organisationId) return 0;

      const sourceOncalls = oncalls.filter((oc) => oc.oncall_date === sourceDateKey);
      if (sourceOncalls.length === 0) return 0;

      // Delete existing oncalls for target day first
      await deleteOncallsForDay(targetDateKey);

      let copiedCount = 0;
      for (const oc of sourceOncalls) {
        const result = await addOncall(
          targetDateKey,
          oc.oncall_slot,
          oc.user_id,
          oc.is_temp_staff,
          oc.temp_confirmed,
          oc.temp_staff_name || undefined
        );
        if (result) copiedCount++;
      }

      return copiedCount;
    },
    [organisationId, oncalls, deleteOncallsForDay, addOncall]
  );

  const getOncallsForDate = useCallback(
    (dateKey: string) => {
      return oncalls.filter((oc) => oc.oncall_date === dateKey);
    },
    [oncalls]
  );

  const getOncallForSlot = useCallback(
    (dateKey: string, slot: number) => {
      return oncalls.find((oc) => oc.oncall_date === dateKey && oc.oncall_slot === slot) || null;
    },
    [oncalls]
  );

  return {
    oncalls,
    loading,
    saving,
    addOncall,
    deleteOncall,
    deleteOncallsForDay,
    copyOncallsFromDay,
    getOncallsForDate,
    getOncallForSlot,
    refetch: fetchOncalls,
  };
}
