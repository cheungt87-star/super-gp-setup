

# Reconfigure "Weekly Rota Creation" — 3 Separate Containers

## Layout

Replace the single white container (lines 1017-1175) with 3 equal-width containers in a grid, each with its own border, background, and rounded corners.

```text
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    OVERVIEW      │  │  QUICK ACTIONS   │  │ PUBLISH & CONFIRM│
│                  │  │                  │  │                  │
│ Site: [dropdown] │  │ [Preview Week]   │  │   ┌──────────┐  │
│ Date: [selector] │  │ [Copy Previous]  │  │   │ PUBLISH  │  │
│ Status: 2/5 days │  │                  │  │   │ & CONFIRM│  │
│                  │  │                  │  │   └──────────┘  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Changes — `src/components/rota/RotaScheduleTab.tsx` (lines 1017-1175)

### Structure
- Keep title "Weekly Rota Creation" above the grid
- `grid grid-cols-1 md:grid-cols-3 gap-4` for the 3 containers
- Each container: `bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col`

### Container 1 — Overview
- Label "SITE" → site dropdown (existing)
- Label "DATE RANGE" → WeekSelector (existing)
- Label "WEEK STATUS" → status badge (move from current center column). Non-interactive badge, same amber/emerald styling

### Container 2 — Quick Actions
- Title "QUICK ACTIONS"
- "Preview Week" button with Eye icon (move from center column)
- "Copy from Previous Week" button with Copy icon (existing)
- Remove "Copy to Whole Week" (it was the 3rd action, user didn't mention it — keep it as a third button if space allows)

### Container 3 — Publish & Confirm Week
- Large prominent CTA filling most of the container
- `bg-teal-500 hover:bg-teal-600 text-white` with Send icon
- Label: "Publish & Confirm Week"
- Full-width, taller button (`h-14` or `h-16`) to feel like a large CTA
- Same disabled logic (only enabled when all days confirmed)
- Tooltip on disabled state remains

## Files
- `src/components/rota/RotaScheduleTab.tsx` — restructure lines 1017-1175

