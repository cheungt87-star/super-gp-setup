

# Rota Creator Visual Hierarchy Improvements

## Problem
The rota grid lacks visual distinction — On-Call and Clinic Rooms sections blend together, headers are subtle, staff cards are flat, and there's no color differentiation between AM/PM columns.

## Changes — `src/components/rota/ClinicRoomDayCell.tsx`

### 1. Distinct section headers with stronger colors

**On-Call header** (line 537-550): Change from generic `bg-primary/5` to a warm amber theme:
- First cell: `bg-amber-100 text-amber-800 border-amber-200` (was `bg-primary/10 text-primary`)
- AM/PM cells: `bg-amber-50/50` subtle warmth

**Clinic Rooms header** (line 741-754): Use a cool slate/blue theme:
- First cell: `bg-slate-200 text-slate-700` (was `bg-primary/10 text-primary`)
- AM/PM cells: `bg-slate-50` subtle cool tint

### 2. AM/PM column tinting on data cells

Add alternating subtle backgrounds to differentiate AM vs PM columns visually:
- AM data cells (lines 576, 776): Add `bg-amber-50/30` base background
- PM data cells (lines 655, 801): Add `bg-indigo-50/30` base background

This gives a very subtle warm/cool split across the grid.

### 3. Stronger staff shift cards

Regular staff cards (line 382): Change from `bg-muted/50` to `bg-white border border-slate-200 shadow-sm` for more definition and a "card-like" feel.

On-call assigned cards (lines 591, 670): Same treatment — `bg-white border border-slate-200 shadow-sm` for non-temp staff.

### 4. Section spacing and separation

Add `mt-6` gap between On-Call and Clinic Rooms sections (line 738) instead of `mt-0` (currently just `space-y-4` from parent). Add a subtle label or increase the gap for clearer section breaks.

### 5. Row label column — stronger identity

On-call slot name cells (line 571): Change from `bg-muted/30` to `bg-amber-50/50 border-r border-amber-100`
Clinic room name cells (line 764): Change from `bg-muted/30` to `bg-slate-50 border-r border-slate-200`

### 6. "Add AM/PM" buttons — softer, less prominent

Add `opacity-60 hover:opacity-100` to the Add AM/PM ghost buttons so they recede when not needed.

