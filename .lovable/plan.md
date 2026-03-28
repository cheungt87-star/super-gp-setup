

# Design System: Prominent CTAs, Dropdowns & Section Hierarchy

## Problem
1. **Outline buttons** (arrows, "Today", "Copy from previous week") use `border-input` which maps to a very light `hsl(220 13% 91%)` — nearly invisible
2. **Sections** on dashboard ("Your Day", "My Upcoming Shifts") and admin pages ("Capacity Settings", "Facilities") lack clear visual boundaries and hierarchy

## Changes

### 1. Stronger outline buttons globally — `src/components/ui/button.tsx`

Change the `outline` variant from:
```
border border-input bg-background hover:bg-accent hover:text-accent-foreground
```
to:
```
border-2 border-slate-300 bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-slate-400
```

This makes every outline button across the app (week selector arrows, "Today", "Copy from previous week", dropdowns triggers, etc.) immediately more visible with a stronger border and subtle shadow.

### 2. Stronger select/dropdown triggers — `src/components/ui/select.tsx`

The `SelectTrigger` likely uses `border-input`. Update its base class to include `border-slate-300 shadow-sm` for consistency with the button treatment.

### 3. Dashboard section headers — `src/pages/Dashboard.tsx` + widgets

Each major section ("Your Day", "My Upcoming Shifts", "Full Rota", etc.) already has its own wrapper `div` with `bg-[#F8FAFC]` and `rounded-2xl`. These are fairly well separated. Add:
- A left accent border (`border-l-4 border-primary`) on each section's heading for visual anchoring
- Increase `mb-8` to `mb-10` between sections for breathing room

### 4. Admin SiteCard sub-section styling — `src/components/admin/SiteCard.tsx`

Currently sub-sections (Details, Opening Hours, Capacity Settings, Facilities) use plain `<Separator />` dividers and small muted labels. Improve:
- Wrap each sub-section in a `bg-slate-50/50 rounded-lg p-4` container instead of relying on separators
- Remove `<Separator />` elements (the background containers create visual separation)
- Make sub-section headers slightly larger: `text-sm font-semibold` instead of `text-sm font-medium`

### 5. WeekSelector — more prominent controls — `src/components/rota/WeekSelector.tsx`

The week range text sits between two outline icon buttons. Add a subtle `bg-muted/50 rounded-lg px-4 py-1` background to the date text to make it feel like a cohesive control group.

## Summary of files to edit
- `src/components/ui/button.tsx` (line 14 — outline variant)
- `src/components/ui/select.tsx` (SelectTrigger border)
- `src/components/admin/SiteCard.tsx` (sub-section containers)
- `src/components/rota/WeekSelector.tsx` (date display background)
- `src/components/dashboard/YourDayCard.tsx` (heading accent)
- `src/components/dashboard/MyShiftsWidget.tsx` (heading accent)

