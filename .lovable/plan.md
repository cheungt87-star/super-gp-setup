

# Estimated Patient Capacity Feature

## Overview
Add site-level capacity settings (AM/PM patients per room) and display a calculated "Estimated Patient Capacity" card on the dashboard based on how many rooms are staffed today.

---

## 1. Database Migration

Add two new columns to the `sites` table:

- `am_capacity_per_room` (integer, default 0, not null)
- `pm_capacity_per_room` (integer, default 0, not null)

No new tables needed -- these are simple global constants per site.

---

## 2. Site Management -- Capacity Settings UI

**File:** `src/components/admin/SiteCard.tsx`

Add a new "Capacity Settings" section (below Facilities or Opening Hours) showing:
- AM Capacity per Room (numeric input)
- PM Capacity per Room (numeric input)
- Inline save button

**File:** `src/components/admin/SiteManagementCard.tsx`

- Update the Site interface and fetch query to include the two new columns.
- Pass capacity values through to SiteCard.
- Add a handler to update capacity values via `supabase.from('sites').update(...)`.

**File:** `src/components/admin/SiteForm.tsx`

- Add the two capacity fields to the edit site dialog form as well, so they can be set when creating/editing a site.

---

## 3. Calculation Logic

**New file:** `src/hooks/usePatientCapacity.ts`

A custom hook that:
1. Takes the user's `primary_site_id` and today's date.
2. Fetches the site's `am_capacity_per_room` and `pm_capacity_per_room`.
3. Finds the current rota week for that site.
4. Queries `rota_shifts` for today, filtering to non-oncall shifts at clinic rooms (joined with `facilities` to check `facility_type = 'clinic_room'`).
5. Counts unique `facility_id` values where shift_type is `am` or `full_day` (AM rooms).
6. Counts unique `facility_id` values where shift_type is `pm` or `full_day` (PM rooms).
7. Custom shifts: checks time range against site opening hours to classify as AM/PM.
8. Returns `{ amRooms, pmRooms, amCapacity, pmCapacity, totalCapacity, loading }`.

---

## 4. Dashboard Card

**New file:** `src/components/dashboard/PatientCapacityCard.tsx`

A card matching the "Friendly Professional" aesthetic:
- Outer wrapper: `rounded-3xl bg-white p-6 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)]`
- Label: "ESTIMATED PATIENT CAPACITY" in muted uppercase slate
- Large bold navy total number
- Below: "AM: [value] | PM: [value]" in slate-500
- If zero rooms staffed: shows "0" with "(No rooms staffed)" subtitle

**File:** `src/components/dashboard/YourDayCard.tsx`

- Import and use `usePatientCapacity` hook.
- Replace the existing "Due Tasks" card (bottom-right of the 3x2 grid) with a 2-card layout, or expand the grid to 3x2+1. 

**Alternative (cleaner):** Expand the bottom row to 4 cards by converting the grid to `lg:grid-cols-3` with the capacity card added as a 7th item that spans correctly, OR place it as a standalone card just below the Your Day grid (simpler, no layout disruption).

Given the instruction says "Add a new card to the 'Your Day' dashboard," the simplest approach is to place it directly below the Your Day grid as a standalone floating card within the same `bg-[#F8FAFC]` section.

**File:** `src/pages/Dashboard.tsx`

- No changes needed if the capacity card is rendered inside `YourDayCard`.

---

## 5. Reactive Updates

The capacity card re-fetches whenever the dashboard is loaded (on mount). Since the rota scheduler is on a different page, the dashboard will pick up changes on navigation. For same-page reactivity, the hook can optionally subscribe to Supabase Realtime on `rota_shifts` table changes, but this adds complexity. The simpler approach (refetch on mount) matches the existing dashboard pattern.

---

## Technical Summary

| Step | Files | Type |
|------|-------|------|
| DB migration | SQL migration | Add 2 columns to `sites` |
| Admin UI | `SiteCard.tsx`, `SiteManagementCard.tsx`, `SiteForm.tsx` | Edit existing |
| Capacity hook | `src/hooks/usePatientCapacity.ts` | New file |
| Dashboard card | `src/components/dashboard/PatientCapacityCard.tsx` | New file |
| Integration | `src/components/dashboard/YourDayCard.tsx` | Edit existing |

