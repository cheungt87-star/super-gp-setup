

# Refactor "Weekly Rota Creation" Header to High-Fidelity SaaS Standard

## Overview
Redesign the header control panel from the current slate-100/border-heavy look to a clean, white, premium SaaS aesthetic with proper action hierarchy and polished interactive elements.

## Changes

### 1. WeekSelector — Cohesive date group (`src/components/rota/WeekSelector.tsx`)

Combine arrows + date into a single inline-flex group with shared border and rounded corners. The "Today" button becomes a ghost-style text button beside it.

```text
[ < | 24/03/26 - 30/03/26 | > ]  Today
```

- Wrap arrows + date in a single `inline-flex items-center border border-slate-300 rounded-lg bg-slate-50 overflow-hidden` container
- Arrow buttons become borderless icon buttons inside the group (no separate outline)
- Date text sits between with `border-l border-r border-slate-300` dividers
- "Today" button uses `variant="ghost"` with `text-xs text-slate-500`

### 2. Main header container (`src/components/rota/RotaScheduleTab.tsx`, lines 1017-1173)

Replace the entire header block:

**Container**: `bg-white border border-slate-200 rounded-xl shadow-sm p-6`

**Title**: `text-xl font-semibold text-slate-900 mb-5`

**Grid**: `grid grid-cols-1 md:grid-cols-3 gap-8` (stacks on mobile)

**Labels**: All sub-labels use `text-xs font-bold uppercase tracking-wider text-slate-400 mb-2`

### 3. Sub-section 1 — Navigation (left column)

- **Site dropdown**: `h-10 bg-slate-50 border-slate-300 focus:ring-teal-500 focus:border-teal-500`
- **Date Range**: Uses the redesigned WeekSelector from step 1

### 4. Sub-section 2 — Week Status (center column)

- Separator: `border-l border-r border-slate-100 px-8`
- **Label**: "WEEK STATUS"
- **Status badge** (not a button): `bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-medium` — shows "{x}/{y} days complete". When all complete: `bg-emerald-50 text-emerald-700 border-emerald-200`
- **Preview Week**: Secondary CTA — `border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 h-10` with Eye icon
- **Publish**: Primary CTA — `bg-teal-500 hover:bg-teal-600 text-white h-10 font-medium` with Send icon. Disabled state uses `opacity-50`

### 5. Sub-section 3 — Quick Actions (right column)

- **Label**: "QUICK ACTIONS"
- Buttons: `bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 h-10` with Copy icons
- Subtle, utility feel — not competing with primary/secondary CTAs

### 6. SelectTrigger update (`src/components/ui/select.tsx`)

Update the SelectTrigger to support the new focus style: add `focus:ring-teal-500 focus:border-teal-500` and `bg-slate-50` when used in the rota header (pass via className).

## Files to edit
- `src/components/rota/WeekSelector.tsx` — cohesive date group
- `src/components/rota/RotaScheduleTab.tsx` (lines 1017-1173) — full header redesign
- No changes to select.tsx base — styling applied via className overrides

