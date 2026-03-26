

# Email Notifications via Resend

## Overview

Set up four automated email notifications using Resend, delivered through Supabase Edge Functions. Emails are sent to users' profile email addresses.

## Prerequisites

A **Resend API key** is needed. You will need to:
1. Create an account at [resend.com](https://resend.com)
2. Add and verify your sending domain in Resend's dashboard
3. Generate an API key
4. Provide it when prompted -- Lovable will store it securely as an Edge Function secret

## Email Events

| Event | Trigger Point | Recipients | Subject |
|---|---|---|---|
| Rota Published | When admin clicks "Publish" | All users in the organisation | New rota published |
| Workflow Assigned | When a new task is created with an assignee | The assignee | New workflow task assigned |
| Workflow Due | Daily cron check | Assignees with tasks due today | Workflow task due today |
| Workflow Overdue | Daily cron check | Assignees with overdue tasks | Overdue workflow task |

## Architecture

```text
┌─────────────────────────┐
│  Frontend (React)       │
│  - Publish rota          │──► invoke("send-notification-email")
│  - Create workflow task  │──► invoke("send-notification-email")
└─────────────────────────┘

┌─────────────────────────┐
│  Edge Function:          │
│  send-notification-email │──► Resend API
│  (event-driven)          │
└─────────────────────────┘

┌─────────────────────────┐
│  Edge Function:          │
│  check-task-deadlines    │──► Resend API
│  (pg_cron daily @ 7am)   │
└─────────────────────────┘
```

## Implementation Plan

### 1. Store Resend API key as a secret

Add `RESEND_API_KEY` as an Edge Function secret.

### 2. Create Edge Function: `send-notification-email`

Handles event-driven emails (rota published, workflow assigned). Accepts a JSON body with:
- `type`: `"rota_published"` | `"workflow_assigned"`
- `organisation_id`: to look up recipients
- `task_name` (optional): for workflow emails
- `recipient_email` (optional): for single-recipient emails
- `recipient_name` (optional): for personalization

Logic:
- For `rota_published`: queries all profiles in the organisation with non-null emails, sends each an email
- For `workflow_assigned`: sends to the specified recipient

Email template: Clean HTML with the app name, message, and a CTA button linking to the site URL.

### 3. Create Edge Function: `check-task-deadlines`

Runs daily via pg_cron. Queries `workflow_tasks` joined with `profiles` to find:
- Tasks with `assignee_id` set and due today (based on recurrence calculation)
- Tasks with `assignee_id` set that are overdue

Sends emails via Resend for each match. Includes the task name in overdue emails.

### 4. Set up pg_cron job

Schedule `check-task-deadlines` to run daily at 7:00 AM UTC.

### 5. Update frontend trigger points

**Rota publish** (`RotaScheduleTab.tsx`): After `updateWeekStatus("published")` succeeds, invoke `send-notification-email` with type `rota_published` and the organisation ID.

**Workflow task creation** (`WorkflowManagementCard.tsx`): After a new task is inserted with an `assignee_id`, invoke `send-notification-email` with type `workflow_assigned`, the assignee's email/name, and the task name.

### 6. Email template design

All emails will use a consistent HTML template with:
- App branding header
- Clear message text
- Task name (where applicable)
- "Log in to view" CTA button pointing to the published app URL
- Clean, mobile-friendly layout

## Technical Details

- Resend is called directly from Edge Functions using `fetch()` to `https://api.resend.com/emails`
- The "from" address will use the verified domain in Resend (e.g. `notifications@yourdomain.com`)
- Edge Functions use service role to query profiles for email addresses
- Rate limiting is handled by batching in the cron function (small delays between sends)

