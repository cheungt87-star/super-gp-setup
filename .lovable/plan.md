

# Redesign: Invitation Code as Inline Pill

## What Changes

Replace the full-width invitation code card with a compact pill positioned to the right of the "Welcome, {name}!" header row.

## Layout

```text
Welcome, Tak!                              [ Invite your colleagues to join  ORG-THETA1  📋 ]
Here's an overview of your clinic setup.
```

## Technical Details

**File:** `src/pages/Dashboard.tsx`

1. **Remove** the standalone `Card` block for the invitation code (lines 270-308)
2. **Modify** the welcome header section (lines 263-267) to use `flex justify-between items-start` layout
3. **Add** a compact pill inline with the header (admin-only, same `isAdmin && inviteCode` condition):
   - Styled as a rounded-full pill with subtle border and background
   - Contains: label text "Invite your colleagues to join", the code in monospace, and a copy icon button
   - Copy behaviour remains the same (click copies code, icon switches to checkmark)

**Rough JSX structure for the pill:**
```tsx
<div className="flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm">
  <span className="text-muted-foreground whitespace-nowrap">Invite your colleagues to join</span>
  <code className="font-mono font-semibold tracking-wider">{inviteCode.code}</code>
  <button onClick={handleCopy}>
    {copied ? <Check /> : <Copy />}
  </button>
</div>
```

The pill will be hidden on very small screens or allowed to wrap naturally below the heading on mobile using responsive flex classes.

