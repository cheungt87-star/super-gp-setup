

# Right-Align Job Titles + Add Edit for On-Call Slots

## Changes

### 1. Right-align job titles in clinic room shift cards — `ClinicRoomDayCell.tsx`

In `renderShiftCard` (line 397-422), change the layout from a wrapping flex to a row with the name on the left and badges pushed right:
- Change `flex-wrap` to `flex-nowrap` on the inner div
- Add `ml-auto` to the job title badge to push it right
- Or restructure: name in a `flex-1 min-w-0` span, badges in a `ml-auto flex gap-1` group

### 2. Right-align job titles in on-call assigned cards — `ClinicRoomDayCell.tsx`

Same change for AM on-call (lines 601-613) and PM on-call (lines 668-680): restructure the inner `div` so name is left-aligned and job title badge is pushed right with `ml-auto`.

### 3. Add edit (pencil) button to on-call assigned cards — `ClinicRoomDayCell.tsx`

**Props**: Add `onEditOncall: (oncall: any, slot: number, period: "am" | "pm") => void` to `ClinicRoomDayCellProps`.

**UI**: In both AM (line 615-622) and PM (line 682-689) on-call cards, add a Pencil button before the X button, matching the clinic room shift card pattern. The pencil triggers `onEditOncall(amOncall, slot, "am")` / `onEditOncall(pmOncall, slot, "pm")`.

### 4. Wire up `onEditOncall` in parent — `RotaScheduleTab.tsx`

Create a handler that opens the `EditShiftDialog` (or a similar dialog) for on-call entries, converting the oncall data to the format the dialog expects. Pass it as `onEditOncall` prop to `ClinicRoomDayCell`.

