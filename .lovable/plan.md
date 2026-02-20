

# Fix: Facility Add/Edit Not Working

## Problem

The `handleSaveFacility` function in `SiteManagementCard.tsx` (line 299-301) has been emptied -- it contains only `// ... keep existing code` instead of actual implementation. This means when you click "Add facility", nothing happens and the form gets stuck in a disabled/saving state.

## Solution

Restore the `handleSaveFacility` function with the correct implementation that either inserts a new facility or updates an existing one in Supabase.

## Changes

### `src/components/admin/SiteManagementCard.tsx` -- Restore `handleSaveFacility`

Replace the empty function body (lines 299-301) with the full implementation:

1. If `facilityId` is provided, update the existing facility (`name`, `capacity`, `facility_type`) using `.update().eq('id', facilityId)`
2. If no `facilityId`, insert a new facility with `site_id`, `name`, `capacity`, `facility_type`, and `organisation_id`
3. Show success/error toast
4. Call `fetchData(true)` to refresh the list

No database changes are needed -- the `facilities` table and RLS policies are already correctly configured.

