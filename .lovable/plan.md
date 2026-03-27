

# Fix: Enable Drag-and-Drop for On-Call Slots

## Problem

The on-call AM/PM cells (lines 547-650 in `ClinicRoomDayCell.tsx`) have no `onDragOver`/`onDrop` handlers. Only clinic room cells support drag-and-drop. Dragging a staff member or locum badge onto an on-call slot does nothing.

## Changes

### `src/components/rota/ClinicRoomDayCell.tsx`

1. **New drop handler for on-call**: Add `handleOncallDrop(e, slot, period)` that:
   - Checks for `locumType` in dataTransfer → opens locum name dialog with on-call context (store `oncallSlot` in the dialog state)
   - Checks for `staffId` → calls `onAddShift(staffId, dateKey, period, true, undefined, undefined, undefined, undefined, undefined, undefined, slot)`

2. **Extend locum name dialog state**: Add `oncallSlot?: number` and `isOncall?: boolean` fields to the `locumNameDialog` state object so we know whether the locum is being dropped on a room or an on-call slot.

3. **Update `handleLocumNameConfirm`**: When `locumNameDialog.oncallSlot` is set, call `onAddShift` with `isOnCall: true` and the `oncallSlot` parameter instead of a `facilityId`.

4. **Add drag handlers to on-call AM/PM cells**: On the empty-state containers (the `<div>` wrapping the "Add AM"/"Add PM" buttons, lines 547 and 601), add:
   - `onDragOver={(e) => handleDragOver(e, \`oncall-${slot}-${period}\`)}`
   - `onDragLeave={handleDragLeave}`
   - `onDrop={(e) => handleOncallDrop(e, slot, period)}`
   - Visual highlight when `dragOverTarget === \`oncall-${slot}-${period}\``
   - Apply these handlers to the entire cell `<div>`, not just the empty state, so drops work even when a slot is already occupied (to allow replacement or the system can reject duplicates)

