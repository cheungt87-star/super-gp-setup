

## Add Due Date Filter to Dashboard Task Widgets

Add a time-frame filter (1 day, 7 days, 30 days, 60 days, 90 days) to both the "Tasks Assigned to Me" and "Tasks Assigned to My Job Family" widgets, allowing users to scope visible tasks by how soon they are due.

---

### How It Will Work

- A row of small filter buttons (like toggle pills) will appear in each TaskWidget header, next to the task count badge
- Filter options: **1d**, **7d**, **30d**, **60d**, **90d**
- Default selection: **7d** (shows tasks due within the next 7 days, plus any overdue tasks)
- Overdue tasks always remain visible regardless of the selected filter
- The task count badge will update to reflect the filtered count

---

### Technical Details

**1. Update `TaskWidget` component** (`src/components/dashboard/TaskWidget.tsx`)

- Add internal state for the selected filter (default: 7)
- Define filter options: `[1, 7, 30, 60, 90]`
- Filter the `tasks` array client-side: include tasks where `task.eta <= selectedDays` (due within N days) OR `task.isOverdue` (always show overdue)
- Render a row of small toggle buttons in the CardHeader between the title and count badge
- Update the count badge to show filtered task count

**2. No changes needed to Dashboard.tsx or data fetching**

- The Dashboard already fetches all active, non-completed tasks
- Filtering is purely a UI/client-side concern within the widget
- Both widgets independently manage their own filter state

