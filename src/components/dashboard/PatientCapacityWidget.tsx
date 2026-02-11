import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfWeek } from "date-fns";

interface SiteCapacityRow {
  siteId: string;
  siteName: string;
  amCapacity: number;
  pmCapacity: number;
  totalCapacity: number;
}

export function PatientCapacityWidget() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SiteCapacityRow[]>([]);

  useEffect(() => {
    const fetchAllSiteCapacities = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.organisation_id) { setLoading(false); return; }

      // Fetch all active sites with capacity settings
      const { data: sites } = await supabase
        .from("sites")
        .select("id, name, am_capacity_per_room, pm_capacity_per_room" as any)
        .eq("organisation_id", profile.organisation_id)
        .eq("is_active", true)
        .order("name");

      if (!sites || sites.length === 0) { setLoading(false); return; }

      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

      // Fetch all rota weeks for this week across all sites
      const siteIds = sites.map((s: any) => s.id);
      const { data: rotaWeeks } = await supabase
        .from("rota_weeks")
        .select("id, site_id")
        .in("site_id", siteIds)
        .eq("week_start", weekStart);

      const weekMap = new Map<string, string>();
      (rotaWeeks || []).forEach(rw => weekMap.set(rw.site_id, rw.id));

      const rotaWeekIds = Array.from(weekMap.values());

      // Fetch all shifts for today across all rota weeks
      let shiftsMap = new Map<string, { am: Set<string>; pm: Set<string> }>();

      if (rotaWeekIds.length > 0) {
        const { data: shifts } = await supabase
          .from("rota_shifts")
          .select("facility_id, shift_type, rota_week_id, facilities(facility_type)")
          .in("rota_week_id", rotaWeekIds)
          .eq("shift_date", todayStr)
          .eq("is_oncall", false)
          .not("facility_id", "is", null);

        if (shifts) {
          // Group shifts by site via rota_week_id
          const weekToSite = new Map<string, string>();
          weekMap.forEach((weekId, siteId) => weekToSite.set(weekId, siteId));

          for (const s of shifts) {
            const facility = s.facilities as any;
            if (facility?.facility_type !== "clinic_room") continue;

            const siteId = weekToSite.get(s.rota_week_id);
            if (!siteId) continue;

            if (!shiftsMap.has(siteId)) {
              shiftsMap.set(siteId, { am: new Set(), pm: new Set() });
            }
            const entry = shiftsMap.get(siteId)!;
            const fid = s.facility_id!;
            const st = s.shift_type as string;

            if (st === "am" || st === "full_day" || st === "custom") entry.am.add(fid);
            if (st === "pm" || st === "full_day" || st === "custom") entry.pm.add(fid);
          }
        }
      }

      // Build rows
      const result: SiteCapacityRow[] = sites.map((site: any) => {
        const siteShifts = shiftsMap.get(site.id);
        const amRooms = siteShifts?.am.size ?? 0;
        const pmRooms = siteShifts?.pm.size ?? 0;
        const amCap = amRooms * ((site as any).am_capacity_per_room ?? 0);
        const pmCap = pmRooms * ((site as any).pm_capacity_per_room ?? 0);
        return {
          siteId: site.id,
          siteName: site.name,
          amCapacity: amCap,
          pmCapacity: pmCap,
          totalCapacity: amCap + pmCap,
        };
      });

      setRows(result);
      setLoading(false);
    };

    fetchAllSiteCapacities();
  }, []);

  const totalAm = rows.reduce((sum, r) => sum + r.amCapacity, 0);
  const totalPm = rows.reduce((sum, r) => sum + r.pmCapacity, 0);
  const grandTotal = totalAm + totalPm;

  if (loading) {
    return (
      <div className="mb-8 rounded-2xl bg-[#F8FAFC] p-6 animate-fade-in">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl bg-[#F8FAFC] p-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-[#1E293B] mb-6">Estimated Patient Capacity</h2>

      <div className="rounded-3xl bg-white shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold uppercase tracking-widest text-slate-500 px-6 py-4">
                Site
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-widest text-slate-500 px-6 py-4">
                AM
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-widest text-slate-500 px-6 py-4">
                PM
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-widest text-slate-500 px-6 py-4">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-sm italic text-slate-400 px-6 py-8">
                  No sites configured
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.siteId} className="border-b border-slate-50 last:border-b-0">
                  <td className="px-6 py-4 text-sm font-medium text-[#0F172A]">{row.siteName}</td>
                  <td className="px-6 py-4 text-sm text-right text-[#64748B]">{row.amCapacity}</td>
                  <td className="px-6 py-4 text-sm text-right text-[#64748B]">{row.pmCapacity}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-[#1E293B]">{row.totalCapacity}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/50">
                <td className="px-6 py-4 text-sm font-bold text-[#1E293B]">All Sites</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-[#64748B]">{totalAm}</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-[#64748B]">{totalPm}</td>
                <td className="px-6 py-4 text-sm text-right font-bold text-[#1E293B]">{grandTotal}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
