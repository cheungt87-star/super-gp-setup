import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";

interface PatientCapacity {
  amRooms: number;
  pmRooms: number;
  amCapacity: number;
  pmCapacity: number;
  totalCapacity: number;
  loading: boolean;
}

export function usePatientCapacity(primarySiteId: string | null): PatientCapacity {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({ amRooms: 0, pmRooms: 0, amCapacity: 0, pmCapacity: 0, totalCapacity: 0 });

  useEffect(() => {
    if (!primarySiteId) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

      // Fetch site capacity settings
      const { data: siteData } = await supabase
        .from("sites")
        .select("am_capacity_per_room, pm_capacity_per_room" as any)
        .eq("id", primarySiteId)
        .maybeSingle();

      const amCapPerRoom = (siteData as any)?.am_capacity_per_room ?? 0;
      const pmCapPerRoom = (siteData as any)?.pm_capacity_per_room ?? 0;

      // Find current rota week
      const { data: rotaWeek } = await supabase
        .from("rota_weeks")
        .select("id")
        .eq("site_id", primarySiteId)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (!rotaWeek) {
        setResult({ amRooms: 0, pmRooms: 0, amCapacity: 0, pmCapacity: 0, totalCapacity: 0 });
        setLoading(false);
        return;
      }

      // Get today's non-oncall shifts with facility info
      const { data: shifts } = await supabase
        .from("rota_shifts")
        .select("facility_id, shift_type, facilities(facility_type)")
        .eq("rota_week_id", rotaWeek.id)
        .eq("shift_date", todayStr)
        .eq("is_oncall", false)
        .not("facility_id", "is", null);

      if (!shifts || shifts.length === 0) {
        setResult({ amRooms: 0, pmRooms: 0, amCapacity: 0, pmCapacity: 0, totalCapacity: 0 });
        setLoading(false);
        return;
      }

      // Filter to clinic rooms only and count unique facilities per period
      const amFacilities = new Set<string>();
      const pmFacilities = new Set<string>();

      for (const s of shifts) {
        const facility = s.facilities as any;
        if (facility?.facility_type !== "clinic_room") continue;
        const fid = s.facility_id!;
        const st = s.shift_type as string;

        if (st === "am" || st === "full_day") amFacilities.add(fid);
        if (st === "pm" || st === "full_day") pmFacilities.add(fid);
        // Custom shifts count for both AM and PM
        if (st === "custom") {
          amFacilities.add(fid);
          pmFacilities.add(fid);
        }
      }

      const amRooms = amFacilities.size;
      const pmRooms = pmFacilities.size;
      const amCap = amRooms * amCapPerRoom;
      const pmCap = pmRooms * pmCapPerRoom;

      setResult({ amRooms, pmRooms, amCapacity: amCap, pmCapacity: pmCap, totalCapacity: amCap + pmCap });
      setLoading(false);
    };

    fetch();
  }, [primarySiteId]);

  return { ...result, loading };
}
