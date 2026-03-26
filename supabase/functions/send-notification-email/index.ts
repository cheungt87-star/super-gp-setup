import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APP_NAME = "Super GP";
const APP_URL = "https://id-preview--10ab1ed7-52c4-4135-91b8-670760c25303.lovable.app";
const FROM_EMAIL = "notifications@supergp.co.uk";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, organisation_id, recipient_email, recipient_name, task_name } =
      await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (type === "rota_published") {
      // Send to all users in the organisation
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("organisation_id", organisation_id)
        .eq("is_active", true)
        .not("email", "is", null);

      if (error) throw error;

      const html = emailTemplate(
        "New Rota Published",
        "A new rota has been published for your site. Log in to view your upcoming shifts.",
        "View Rota"
      );

      let sent = 0;
      for (const profile of profiles || []) {
        if (profile.email) {
          const ok = await sendEmail(profile.email, "New rota published", html);
          if (ok) sent++;
        }
      }

      return new Response(JSON.stringify({ success: true, sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "workflow_assigned") {
      if (!recipient_email) {
        return new Response(
          JSON.stringify({ error: "recipient_email required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const name = recipient_name || "there";
      const html = emailTemplate(
        "New Workflow Task Assigned",
        `Hi ${name}, you have been assigned a new workflow task${task_name ? `: <strong>${task_name}</strong>` : ""}. Log in to view the details.`,
        "View Task"
      );

      await sendEmail(recipient_email, "New workflow task assigned", html);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unknown type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
