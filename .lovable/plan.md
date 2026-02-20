
# Fix: Blank Pages When Printing the Full Rota

## Root Cause

Every CSS-based approach so far has failed because the rota is deeply nested inside layout wrappers (`SidebarProvider > div.min-h-screen > SidebarInset > main > div.container`). Using `visibility: hidden` preserves layout space, and using `height: 0` on `body *` conflicts with needing ancestors to have proper dimensions for the rota to render. There is no clean way to hide everything except a deeply-nested element using pure CSS without side effects that create phantom pages.

## Solution: JavaScript-Based Print

Instead of fighting CSS, switch to a JavaScript approach. When the user clicks Print, we:

1. Open a new browser window
2. Write only the rota HTML (cloned) into it, with minimal inline styles
3. Call `print()` on that window
4. Close it after printing

This completely isolates the rota from the page layout, guaranteeing no blank pages, no duplication, and proper multi-page table flow.

## Changes

### 1. `src/components/dashboard/FullRotaWidget.tsx` -- Update `handlePrint`

Replace the current `window.print()` call with logic that:
- Grabs the `.print-full-rota` element via ref
- Clones its inner HTML
- Opens a new window with a self-contained HTML document containing:
  - `@page { size: A4 landscape; margin: 12mm; }`
  - A print header (site name + week range)
  - The table with basic styles (borders, font size, badge colors)
  - `thead { display: table-header-group }` for repeating headers
  - `tr { page-break-inside: avoid }`
- Calls `window.print()` on the new window
- Closes the popup after printing

### 2. `src/index.css` -- Remove all `@media print` rules

Delete the entire `@media print` block (lines 130-224). It is no longer needed since printing is handled in an isolated window.

## End State

- Clicking Print opens a clean print dialog with only the rota
- No blank pages
- No duplication
- Table headers repeat on each page
- Multi-page tables flow naturally
- No CSS hacks remain in the codebase
