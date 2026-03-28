

# Fix Publish & Confirm Container — Rectangle CTA + Left-Aligned Title

## Changes — `src/components/rota/RotaScheduleTab.tsx`

### 1. Title alignment (line 1092)
Change from `text-center` to `text-left`, remove `items-center` from container.

### 2. CTA shape (line 1112)
Replace `aspect-square max-h-32` with `h-16` to make it a large rectangle instead of a square.

### 3. Container layout (line 1091)
Change `items-center` to `items-start` so the title aligns left. Keep the CTA and status centered via the inner flex wrapper.

