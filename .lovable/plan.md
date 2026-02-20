

# Full Rota: Abbreviated Job Title Badges with Colour Key

## Overview

Replace full job title names with 2-letter abbreviations in the Full Rota table cells, and add a colour-coded key/legend below the table so users can look up what each abbreviation means.

## Changes

### 1. Update `src/lib/jobTitleColors.ts` -- Dynamic colour assignment

The current system only handles a few hardcoded job titles. Replace it with a dynamic approach:

- Add a new function `getJobTitleAbbreviation(name: string): string` that returns the first 2 letters uppercased (e.g. "Surgeon" -> "SU", "Receptionist" -> "RE", "GP Partner" -> "GP")
- Add a new function `getJobTitleColorByIndex(index: number): string` that cycles through a palette of distinct colours (emerald, blue, purple, amber, teal, rose, indigo, cyan, orange, pink, etc.) so every unique job title gets a consistent, different colour
- Keep the existing `getJobTitleColors` function for backward compatibility elsewhere in the app

### 2. Update `src/components/dashboard/FullRotaWidget.tsx`

**Collect unique job titles**: After building the schedule, gather all unique `job_title_name` values from the shifts into a sorted array. Assign each a stable colour index so the same title always gets the same colour.

**Update `formatStaffName`**: Replace the full job title badge with the 2-letter abbreviation badge using the dynamically assigned colour.

Before:
```
Jane Smith [Receptionist]
```

After:
```
Jane Smith [RE]
```

**Add a Key/Legend section**: Below the table (inside the white card), render a flex-wrap row of badge items showing each abbreviation + full title, e.g.:

```
Key: [SU] Surgeon  [RE] Receptionist  [GP] GP Partner  [NU] Nurse
```

Each badge uses its assigned colour. Only job titles that actually appear in the current week's data are shown.

### 3. Abbreviation Logic

- Take the job title name, uppercase it, return the first 2 characters
- Special case: if the name contains a space and starts with a short word (e.g. "GP Partner"), use the first letter of each word instead ("GP")
- This keeps abbreviations intuitive

### 4. Colour Palette

A palette of 10+ distinct Tailwind colour sets that cycle deterministically based on the sorted position of the job title name. This ensures every title gets a unique colour (up to the palette size), and colours are consistent within the same week view.

