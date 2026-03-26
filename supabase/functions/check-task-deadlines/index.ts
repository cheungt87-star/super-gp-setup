import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APP_NAME = "Super GP";
const APP_URL = "https://id-preview--10ab1ed7-52c4-4135-91b8-670760c25303.lovable.app";
const FROM_EMAIL = "notifications@supergp.co.uk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function emailTemplate(heading: string, message: string, ctaText: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#1a9e8f,#157a6e);padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${APP_NAME}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#1a1f2c;font-size:20px;font-weight:600;">${heading}</h2>
          <p style="margin:0 0 28px;color:#55575d;font-size:15px;line-height:1.6;">${message}</p>
          <a href="${APP_URL}" style="display:inline-block;background:#1a9e8f;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">${ctaText}</a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:12px;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to send to ${to}:`, err);
    return false;
  }
  return true;
}

// Calculate the next due date for a task given its initial_due_date and recurrence
function getNextDueDate(initialDueDate: string, pattern: string, intervalDays: number | null): Date {
  const initial = new Date(initialDueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (initial >= today) return initial;

  let intervalMs: number;
  switch (pattern) {
    case "daily":
      intervalMs = 86400000;
      break;
    case "weekly":
      intervalMs = 7 * 86400000;
      break;
    case "monthly": {
      // For monthly, step month-by-month
      const d = new Date(initial);
      while (d < today) {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    }
    case "custom":
      intervalMs = (intervalDays || 1) * 86400000;
      break;
    default:
      intervalMs = 86400000;
  }

  const elapsed = today.getTime() - initial.getTime();
  const periods = Math.floor(elapsed / intervalMs);
  let next = new Date(initial.getTime() + periods * intervalMs);
  if (next < today) next = new Date(next.getTime() + intervalMs);
  return next;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);

    // Fetch all active workflow tasks with assignees
    const { data: tasks, error } = await supabase
      .from("workflow_tasks")
      .select(`
        id, name, initial_due_date, recurrence_pattern, recurrence_interval_days,
        assignee_id, organisation_id,
        profiles!workflow_tasks_assignee_id_fkey(email, first_name)
      `)
      .eq("is_active", true)
      .not("assignee_id", "is", null);

    if (error) throw error;

    let dueSent = 0;
    let overdueSent = 0;

    for (const task of tasks || []) {
      const profile = task.profiles as any;
      if (!profile?.email) continue;

      const nextDue = getNextDueDate(
        task.initial_due_date,
        task.recurrence_pattern,
        task.recurrence_interval_days
      );
      const nextDueStr = formatDate(nextDue);

      // Check if already completed for this due date
      const { data: completion } = await supabase
        .from("task_completions")
        .select("id")
        .eq("workflow_task_id", task.id)
        .eq("due_date", nextDueStr)
        .maybeSingle();

      if (completion) continue; // Already completed

      const name = profile.first_name || "there";

      if (nextDueStr === todayStr) {
        // Task due today
        const html = emailTemplate(
          "Workflow Task Due Today",
          `Hi ${name}, your workflow task <strong>${task.name}</strong> is due today. Please log in to complete it.`,
          "View Task"
        );
        const ok = await sendEmail(profile.email, "Workflow task due today", html);
        if (ok) dueSent++;
      } else if (nextDue < today) {
        // Task overdue
        const html = emailTemplate(
          "Overdue Workflow Task",
          `Hi ${name}, you have an overdue task: <strong>${task.name}</strong>. Please log in and complete it as soon as possible.`,
          "View Task"
        );
        const ok = await sendEmail(profile.email, `Overdue: ${task.name}`, html);
        if (ok) overdueSent++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, due_sent: dueSent, overdue_sent: overdueSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
