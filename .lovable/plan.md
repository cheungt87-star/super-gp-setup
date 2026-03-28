

# Rota Controls — Logical Grouping Redesign

## Current Problem
9 actions scattered across 3 locations:
- **Top strip**: Site select, Week select, Status badge
- **Card header**: In Progress badge, Confirm Day, Preview Week, Publish
- **Inside day tab**: Copy from Previous Week, Copy to Whole Week, Copy Previous Day, Clear All

Users must scan multiple areas to find what they need.

## Proposed Layout — 3 Tiers

```text
┌─────────────────────────────────────────────────────────────┐
│ TIER 1: Navigation (top strip - bg-slate-50)                │
│  [Site ▼]   [< Mar 23 – Mar 29, 2026 >] [Today]   draft    │
├─────────────────────────────────────────────────────────────┤
│ TIER 2: Week Actions (card header)                          │
│  Weekly Schedule                    [⏳ In Progress (2/5)]  │
│  Click + to add staff...            [Preview Week] [Publish]│
├─────────────────────────────────────────────────────────────┤
│ [Mon] [Tue] [Wed] [Thu] [Fri]                               │
├─────────────────────────────────────────────────────────────┤
│ TIER 3: Day Actions (inside tab, "Quick Actions" bar)       │
│  Quick Actions:                                             │
│  [✓ Confirm Day] | [Copy Prev Day] [Copy Prev Week]        │
│                    [Copy to Week]   [Clear All]    [Reset]  │
└─────────────────────────────────────────────────────────────┘
```

### Key changes:

**1. Move Confirm Day down to the "Quick Actions" bar** — `RotaScheduleTab.tsx`
Remove Confirm Day / Day Confirmed + Reset from the card header. Pass confirmation state + handlers as props to `ClinicRoomDayCell`, which already renders the Quick Actions bar per day.

**2. Keep Preview Week + Publish in card header** — `RotaScheduleTab.tsx`
These are week-level actions. They stay in the header alongside the progress badge. This keeps Tier 2 focused on week-level concerns only.

**3. Add Confirm Day to Quick Actions bar** — `ClinicRoomDayCell.tsx`
Add new props: `confirmation`, `onConfirmDay`, `onResetConfirmation`, `savingConfirmation`. Render the Confirm Day button (or green "Day Confirmed" + Reset) as the first item in the Quick Actions bar, separated from copy/clear actions with a visual divider (`border-r`).

**4. Group copy actions together with a separator** — `ClinicRoomDayCell.tsx`
Structure the Quick Actions bar as:
- **Left group**: Confirm Day / Day Confirmed + Reset
- **Divider**: `border-r border-slate-300 h-6`
- **Right group**: Copy Previous Day, Copy from Previous Week, Copy to Whole Week, Clear All

This creates a clear mental model:
- **Tier 1** = "Where am I?" (navigation)
- **Tier 2** = "How's the week?" (status + week-level actions)
- **Tier 3** = "What can I do today?" (all day-specific actions)

## Files to edit
- `src/components/rota/RotaScheduleTab.tsx` — remove Confirm Day from header, pass confirmation props to ClinicRoomDayCell
- `src/components/rota/ClinicRoomDayCell.tsx` — add Confirm Day to Quick Actions bar, add visual grouping

