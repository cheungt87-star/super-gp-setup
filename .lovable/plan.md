

## Add Print Button to Full Rota Widget

Add a "Print" button to the Full Rota header that calls `window.print()`, along with CSS `@media print` rules to ensure only the rota table prints cleanly.

### Changes

**1. `src/components/dashboard/FullRotaWidget.tsx`**
- Import the `Printer` icon from `lucide-react`
- Add a `handlePrint` function that calls `window.print()`
- Add a Print button next to the week navigation controls (with `print:hidden` class so it doesn't appear on the printout itself)
- Add a print-specific title showing site name and week range (hidden on screen, visible in print)

**2. `src/index.css`**
- Add `@media print` styles:
  - Hide everything except the Full Rota table (sidebar, header, other dashboard widgets)
  - Remove card shadows/borders for clean printing
  - Ensure the table fills the page width
  - Force color printing for job title badges (`-webkit-print-color-adjust: exact; print-color-adjust: exact`)
  - Hide interactive controls (site selector, week nav, print button) from the printout
  - Add a visible header with site name and week range for the printed page

### Technical Details

The approach uses a CSS class (e.g., `print-full-rota`) on the widget container. The `@media print` rules will:
- Set `display: none` on `body > * :not(.print-full-rota)` patterns using a data attribute on the widget
- Use `print:hidden` utility on buttons/selectors that shouldn't print
- Use `print:block` on a hidden header element that shows site + week info on paper
- Preserve table borders and badge colors with `print-color-adjust: exact`

