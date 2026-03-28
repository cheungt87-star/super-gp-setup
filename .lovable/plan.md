

# Rota UI Adjustments

## Changes

### 1. Rename "Preview" to "Preview Week" — `RotaScheduleTab.tsx` (line 1050)
Change label from `Preview` to `Preview Week`.

### 2. Move Preview Week + Publish next to Confirm Day — `RotaScheduleTab.tsx`
Currently Preview/Publish are in the top controls strip (lines 1043-1098) and Confirm Day is in the CardHeader below (lines 1169-1222). Move the Preview Week and Publish buttons from the top strip into the CardHeader area, right after the Confirm Day button/status, inside the same `flex items-center gap-2` div (line 1130).

### 3. Confirmed day → green button — `RotaScheduleTab.tsx` (lines 1176-1203)
When a day is confirmed, instead of the current green badge + Reset button combo, render a single green `Button` with label "Day Confirmed":
```
<Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white">
  <CheckCircle2 /> Day Confirmed
</Button>
```
Keep the Reset button next to it.

### 4. Replace "09:00 - 17:00" with "Quick Actions" — `ClinicRoomDayCell.tsx` (lines 498-504)
Replace the opening/closing time display with a "Quick Actions" label:
```
<span className="text-sm font-medium text-muted-foreground">Quick Actions</span>
```

## Files
- `src/components/rota/RotaScheduleTab.tsx`
- `src/components/rota/ClinicRoomDayCell.tsx`

