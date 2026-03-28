

# Fix Rota Slot Assignment Delay — Optimistic Updates

## Root Cause

When a shift is added or removed, the flow is:
1. **DB insert/delete** (~100-200ms)
2. **`resetDayOnEdit`** — deletes day confirmation + potentially updates week status (~100-200ms)
3. **`fetchSchedule(true)`** — full re-query of ALL shifts with joins (~200-400ms)

The UI only updates after step 3 completes — a total round-trip of ~400-800ms. The user sees nothing happen until the entire chain finishes.

## Solution — Optimistic Local State Updates

Update the local `shifts` array immediately before the DB calls, then let the background refetch silently reconcile.

### Changes to `src/hooks/useRotaSchedule.ts`

**1. `addShift` — optimistic insert**
- After building the insert payload, immediately push a temporary shift object into `setShifts` with a temporary ID (e.g., `temp-${Date.now()}`) and the known user name/job title from the caller
- Then proceed with the DB insert as before
- The background `fetchSchedule(true)` will replace the temp entry with the real one

To support this, `addShift` needs the user's display name and job title passed in (or we look it up from the `staff` list). We'll add optional `userName` and `jobTitleName` parameters.

**2. `deleteShift` — optimistic remove**
- Immediately filter out the shift (and its linked shift) from local `shifts` state before the DB call
- If the DB call fails, refetch to restore the correct state

**3. `updateShift` — optimistic update**
- Immediately apply the updates to the matching shift in local state before the DB call

### Changes to `src/hooks/useRotaOncalls.ts`
- Apply the same pattern: optimistic insert/delete on the local `oncalls` array before DB operations

### Changes to calling components
- Pass `userName` and `jobTitleName` when calling `addShift` so the optimistic entry can render correctly (rather than showing "Unknown")

## Technical details

```text
Current flow:
  User action → DB write → DB reset → DB refetch → UI update (400-800ms)

New flow:
  User action → UI update (instant) → DB write + reset + refetch (background)
```

- On DB error, the background refetch naturally corrects the state
- No new dependencies or realtime subscriptions needed
- The existing `refetching` flag already prevents UI flashing during background sync

## Files to edit
- `src/hooks/useRotaSchedule.ts` — optimistic state updates in addShift, deleteShift, updateShift
- `src/hooks/useRotaOncalls.ts` — same pattern for oncall operations
- `src/components/rota/ClinicRoomDayCell.tsx` — pass user display info when calling add functions

