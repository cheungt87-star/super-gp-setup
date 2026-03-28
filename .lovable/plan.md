# Redesign Rota Section Header — 3-Column Layout

## Current State

The rota has two separate areas: a top control strip (site select + week selector + status badge) and a card header below ("Weekly Schedule" title + In Progress + Preview Week + Publish). Copy actions live inside the day tab's Quick Actions bar.

## New Layout

Replace both the top control strip AND the card header with a single unified header block titled **"Rota creation dashboard"**, split into 3 sub-sections:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Weekly Rota Creation                                                    │
├────────────────────┬────────────────────────┬───────────────────────────┤
│  Site              │  Preview Week  (btn)   │  Quick Actions            │
│  [Site dropdown ▼] │  In Progress (0/5)     │  [Copy from Prev Week]   │
│                    │  Publish       (btn)   │  [Copy to Whole Week]    │
│  Date Range        │                        │                           │
│  [< Week Range >]  │                        │                           │
│  [Today]           │                        │                           │
└────────────────────┴────────────────────────┴───────────────────────────┘
```

## Changes — `src/components/rota/RotaScheduleTab.tsx`

### 1. Replace top control strip + CardHeader with unified 3-column header

- Remove the existing `bg-slate-50` controls div (lines 1017-1046)
- Replace `CardHeader` content (lines 1063-1173) with the new 3-column layout
- Use a single container with `bg-slate-50 border border-slate-200 rounded-lg` and a header title "Weekly Rota Creation"
- Inside, use `grid grid-cols-3 gap-6` with sub-section labels in muted text

### 2. Sub-section 1 (left): Navigation

- Label "Site" above the site `<Select>` dropdown
- Label "Date Range" above the `<WeekSelector>` + Today button
- Stack vertically with `space-y-3`

### 3. Sub-section 2 (center): Status & Actions

- Preview Week button
- In Progress badge (existing logic)
- Publish button (existing logic with tooltip)
- Stack vertically with `space-y-2`, center-aligned

### 4. Sub-section 3 (right): Quick Actions

- Label "Quick Actions"
- Move "Copy from Previous Week" and "Copy to Whole Week" buttons here from `ClinicRoomDayCell`
- Stack vertically with `space-y-2`

### 5. Remove copy buttons from ClinicRoomDayCell

- Remove the `isFirstOpenDay && onCopyFromPreviousWeek` and `isFirstOpenDay && onCopyToWholeWeek` button blocks from `ClinicRoomDayCell.tsx` (lines 556-581)
- Keep "Copy Previous Day" and "Clear All" in the day-level Quick Actions bar since those are day-specific

## Files

- `src/components/rota/RotaScheduleTab.tsx` — merge controls into single 3-column header
- `src/components/rota/ClinicRoomDayCell.tsx` — remove week-level copy buttons
