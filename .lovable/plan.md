

# Staff Panel Refinements

## Changes

### 1. Right-align job title badges — `StaffPanel.tsx`
Add `ml-auto` to push the Badge to the right side of each staff pill row (line 207-212). This creates a clean `[Grip] [Name...] [Badge→]` layout.

### 2. Show job titles on on-call assignments — `ClinicRoomDayCell.tsx`
The `oncall` data already includes `job_title_name` (fetched in `useRotaOncalls.ts` line 79). Add a colored job title Badge next to `user_name` in both AM (line 602) and PM on-call cells — same style as the staff panel badges.

### 3. Sticky staff panel — `StaffPanel.tsx`
Change the root `<div>` (line 110) from `h-full` to `sticky top-0 self-start h-screen` so the panel sticks to the top of the viewport as the rota grid scrolls. The parent flex container in `RotaScheduleTab.tsx` already uses `flex` layout, so `sticky` + `self-start` will work correctly.

