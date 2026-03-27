

# Locum Badges in Staff Panel

## Overview

Replace the "Add Locum / Temp" button at the bottom of the Staff Panel with two fixed, always-available locum badges pinned to the top of the staff list. These badges are draggable and reusable (never greyed out). Dropping "Locum - Confirmed" or "Locum - Unconfirmed" onto a cell triggers a name-entry dialog before creating the shift.

## Changes

### 1. `src/components/rota/StaffPanel.tsx`

**Remove**: The bottom "Add Locum / Temp" button and `onOpenLocumDialog` prop.

**Add**: Two fixed locum badges above the staff list (between the filters section and the ScrollArea):
- **Locum - Confirmed**: Green background (`bg-green-500 text-white`), draggable with `dataTransfer` set to `locum-confirmed`
- **Locum - Unconfirmed**: Red background (`bg-red-500 text-white`), draggable with `dataTransfer` set to `locum-unconfirmed`

These badges:
- Are always visible, never greyed out, never filtered out
- Use a separate `dataTransfer` key (e.g. `locumType`) to distinguish from regular staff drags
- Have the same grip icon + pill style as staff cards

### 2. `src/components/rota/ClinicRoomDayCell.tsx`

**Update `handleDrop`**: Check for `locumType` in `dataTransfer`. If present, show a name-entry dialog (small inline Dialog or prompt) before calling `onAddShift` with:
- `userId: null`
- `isTempStaff: true`
- `tempConfirmed: true/false` (based on confirmed vs unconfirmed)
- `tempStaffName: <entered name>`

**Add**: A small `LocumNameDialog` (can be inline in the file or a separate component) — a simple Dialog with a text input for the locum's name and a confirm button. On submit, calls `onAddShift` with the locum parameters.

### 3. Existing behaviour preserved

- Once placed, locum shifts appear as normal shift cards with edit (pencil) and delete (X) icons — same as regular staff
- The existing `StaffSelectionDialog` locum flow is no longer needed from the panel but remains available if triggered elsewhere

## Technical Details

- Drag data: regular staff uses `e.dataTransfer.setData("staffId", id)`. Locum badges use `e.dataTransfer.setData("locumType", "confirmed" | "unconfirmed")` — no `staffId` set
- `handleDrop` in `ClinicRoomDayCell` checks for `locumType` first; if found, opens name dialog instead of directly adding shift
- Locum badges are rendered in a dedicated section with a subtle separator, not inside the ScrollArea, so they stay pinned

