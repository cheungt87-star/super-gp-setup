

# Prevent Duplicate On-Call Assignments in Same Time Slot

## Problem
`getConflictingUserIds` (line 254-256) returns `[]` for on-call assignments — it never checks if a user is already assigned to another on-call slot in the same period. This allows the same person to be assigned as both On-Call Manager AM and On-Call Doctor 1 AM simultaneously.

## Fix — `src/components/rota/ClinicRoomDayCell.tsx`

### 1. Update `getConflictingUserIds` on-call branch (lines 254-258)

Replace the early `return []` with logic that collects user IDs from all on-call slots for the same period:

- Determine the target period(s) from the shift type being assigned (AM → check AM oncalls, PM → check PM oncalls, Full Day → check both)
- Loop through `oncalls` array and collect `user_id` values where `shift_period` overlaps with the target period
- Exclude the current slot being assigned to (so editing a slot doesn't conflict with itself)

This applies to both the **drag-and-drop** path (`handleOncallDrop`) and the **"Add" button** path (`StaffSelectionDialog` via `handleAddClick`), since both use `getConflictingUserIds` to build `excludeUserIds`.

### 2. Add validation in `handleOncallDrop` (line 182-204)

After resolving the `staffId` from the drag data, check if that user is already in any on-call slot for the same period on this day. If so, show a toast error and return early instead of calling `onAddShift`.

This provides a safety net for the drag path in case the `excludeUserIds` filtering doesn't fully prevent it.

