

# Rota Grid Color & Border Improvements

## Changes — `src/components/rota/ClinicRoomDayCell.tsx`

### 1. On-Call section: Replace amber with blue/violet theme
Switch all amber references in the On-Call section to a blue-purple palette (avoiding green/red/amber):

- **Header row** (line 537-548): Change to a uniform darker accent:
  - All three cells: `bg-violet-100 text-violet-800 border-violet-200` (same shade across On-Call, AM, PM)
  - Sun/Moon icon colors: `text-violet-600` instead of `text-amber-500`/`text-indigo-500`
- **Slot name cells** (line 571): `bg-violet-50/50 border-r border-violet-200`
- **AM data cells** (line 578): `bg-violet-50/20` instead of `bg-amber-50/30`
- **PM data cells** (line 657): `bg-violet-50/10` instead of `bg-indigo-50/30`

### 2. Clinic Rooms section: Matching darker accent header
- **Header row** (line 741-752): Make all three cells the same darker slate accent:
  - All cells: `bg-slate-200 text-slate-700` (currently only the first cell is `bg-slate-200`, AM/PM are lighter `bg-slate-50`)
  - Sun/Moon icon colors: `text-slate-600`
- **Room name cells** (line 764): keep `bg-slate-50 border-r border-slate-200`

### 3. More prominent grid borders
- Outer containers (lines 535, 739): Add `border-2` instead of `border`
- All `border-b` on rows: Add `border-slate-300` (darker than default)
- All `border-l` between columns: Add `border-slate-300`
- Header row `border-b`: Change to `border-slate-400` for stronger separation

### 4. Keep traffic-light colors untouched
- Temp confirmed (`bg-amber-50 border-amber-300`) — these stay as-is since they're part of the traffic light system for staff cards
- Custom time badges (`bg-amber-50 text-amber-700`) — keep as-is

