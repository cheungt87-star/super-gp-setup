

# Allow Job Title Deletion by Unassigning Users First

## Problem
Deleting a job title fails because the `profiles` table has a foreign key (`profiles_job_title_id_fkey`) referencing `job_titles.id`. If any user profiles are assigned that job title, the database blocks the deletion.

## Solution
Before deleting the job title, set `job_title_id = null` on all profiles that reference it. This effectively moves those users to "unassigned" status, then proceeds with the deletion.

## Changes

### `src/pages/admin/JobFamilyManagement.tsx` -- Update `handleDeleteTitle`

Add a step before the delete call:

1. Run `supabase.from("profiles").update({ job_title_id: null }).eq("job_title_id", deleteTitleId)` to unassign all users from this job title
2. If the update fails, show an error toast and abort
3. If successful, proceed with the existing `supabase.from("job_titles").delete().eq("id", deleteTitleId)` call
4. Update the success toast to mention that affected users were unassigned, e.g. "Job title deleted. Any assigned users have been moved to unassigned."

### Update delete confirmation dialog text

Change the dialog description (around line 860) to inform the user: *"This will permanently delete this job title. Any users currently assigned to it will be moved to unassigned."*

No database changes are needed.

