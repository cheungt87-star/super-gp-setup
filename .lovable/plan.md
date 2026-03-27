

# Slim First Column + Colored Headers

## Changes — `src/components/rota/ClinicRoomDayCell.tsx`

### 1. Slim first column
Change the 3-column grid from `grid-cols-[1fr_1fr_1fr]` to `grid-cols-[160px_1fr_1fr]` across all four grid instances:
- On-Call header (line 533)
- On-Call slot rows (line 562)
- Clinic Rooms header (line 713)
- Clinic Room rows (line 734)

This gives the first column a fixed narrow width while AM/PM columns expand to fill remaining space.

### 2. Colored header rows
- **On-Call header** (line 533): Change `bg-muted/50` to a subtle teal tint — `bg-primary/5` with the first cell ("On-Call") getting `bg-primary/10 text-primary` for emphasis.
- **Clinic Rooms header** (line 713): Same treatment — `bg-primary/5` background, first cell ("Room") with `bg-primary/10 text-primary`.

### 3. Colored first column cells (row labels)
- On-Call slot name cells (line 567): Add `bg-muted/30 border-r` to give the label column a subtle background distinct from the data cells.
- Clinic Room name cells (line 736): Same `bg-muted/30 border-r` treatment.

This creates a visual hierarchy: colored header row at top, subtly shaded label column on left, white data cells for AM/PM.

