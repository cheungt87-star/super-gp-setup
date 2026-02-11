

## Cross-Period Custom Time Ranges

Allow custom shift times to span across AM and PM periods, automatically splitting them into linked entries displayed in the correct slots.

### Overview

Currently, custom time pickers are restricted to the AM or PM period boundaries. This change removes those restrictions, allows a continuous 06:00-23:30 range, and auto-splits spanning shifts into AM and PM entries that remain linked.

### Changes

**1. Database: Add `linked_shift_id` column to `rota_shifts`**
- Add a nullable `linked_shift_id` (uuid, self-referencing) column to `rota_shifts`
- This links two halves of a cross-period shift together
- When one half is edited or deleted, the other is updated/removed accordingly

**2. `src/components/rota/StaffSelectionDialog.tsx` -- Remove period restrictions**
- Change `generateTimeSlots` to always use range `06:00` to `23:30` instead of period-constrained bounds
- Remove the `periodConstraints` logic that limits custom time to AM-only or PM-only
- Show the custom time option for all shift types (AM, PM, full_day)
- Add a visual indicator when the selected range spans the AM/PM boundary (e.g. info text: "This will create entries in both AM and PM slots")
- Add a "Spans Break" warning when the range overlaps the break period (gap between `am_close_time` and `pm_open_time`)

**3. `src/hooks/useRotaSchedule.ts` -- Split logic on save**
- Update `addShift` to detect when a custom time range crosses the PM start boundary
- If it spans: create two `rota_shifts` records:
  - AM entry: `custom_start_time` = user's start, `custom_end_time` = PM start time (e.g. 14:00)
  - PM entry: `custom_start_time` = PM start time, `custom_end_time` = user's end
  - Both records get each other's ID in `linked_shift_id`
- If it doesn't span: save as single entry (current behavior)
- Update `deleteShift` to also delete the linked shift (if `linked_shift_id` is set)
- Update `updateShift` to recalculate the split when times change, deleting/recreating linked entries as needed

**4. `src/components/rota/EditShiftDialog.tsx` -- Edit linked shifts**
- When editing a shift that has a `linked_shift_id`, load the full original time range (start of AM entry to end of PM entry)
- Show the combined time range in the custom time picker (06:00-23:30 range, no period restriction)
- On save, update both linked records or re-split if the range changed

**5. `src/components/rota/ClinicRoomDayCell.tsx` -- Display and badge**
- Update `getShiftsForRoom` to recognize linked shifts -- both halves already appear in correct AM/PM slots via existing `isCustomInAM`/`isCustomInPM` logic
- Add a "Spans Break" badge to `renderShiftCard` when:
  - The shift has a `linked_shift_id`, OR
  - The shift's custom time range overlaps the break period (between `am_close_time` and `pm_open_time`)
- Badge styled with a distinct color (e.g. purple/violet background with dark text) to differentiate from the existing amber custom-time badge

**6. `src/lib/rotaUtils.ts` -- Helper for break detection**
- Add `doesSpanBreak(startTime, endTime, amEnd, pmStart)` utility function
- Returns `true` if the shift time range overlaps the break period

**7. `src/components/rota/RotaScheduleTab.tsx` -- Pass linked_shift_id through**
- Update the `RotaShift` type reference to include `linked_shift_id`
- Ensure `handleDeleteShift` cascades to linked shifts
- Ensure `handleEditShift` updates both linked entries

### Technical Details

**Split boundary detection:**
The PM start time comes from `site_opening_hours.pm_open_time` (passed as `pmShiftStart` prop). A custom range `[start, end]` spans if `start < pmStart && end > pmStart`.

**Database migration SQL:**
```sql
ALTER TABLE rota_shifts ADD COLUMN linked_shift_id uuid REFERENCES rota_shifts(id) ON DELETE SET NULL;
```

**Linked shift lifecycle:**
- Create: Insert AM half, get ID, insert PM half with `linked_shift_id` = AM ID, then update AM half with PM ID
- Delete: Delete both shifts in a single operation
- Edit: Load combined range from both halves, re-split on save (delete old pair, create new pair)

**Break detection example:**
If AM ends at 13:00 and PM starts at 14:00, the break is 13:00-14:00. A shift 10:30-15:30 spans this break and gets the badge.

