import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const masterEmail = "itz.me.mario.brother@gmail.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const token = authorization.replace("Bearer ", "");
    const { data: authData } = await admin.auth.getUser(token);

    if (!authData.user?.email || authData.user.email.toLowerCase() !== masterEmail) {
      return json({ error: "Unauthorized" }, 403);
    }

    const body = await req.json() as { action?: string; profileId?: string };
    if (!body.profileId || !["approve", "deny"].includes(body.action || "")) {
      return json({ error: "Invalid request" }, 400);
    }

    const { data: profile, error: profileError } = await admin
      .from("authority_profiles")
      .select("id, email, name, status")
      .eq("id", body.profileId)
      .maybeSingle();

    if (profileError || !profile) return json({ error: "Application not found" }, 404);
    if (profile.status !== "pending") return json({ error: "Application already reviewed" }, 409);

    if (body.action === "deny") {
      const { error } = await admin.from("authority_profiles").update({ status: "rejected", approved_until: null }).eq("id", profile.id);
      if (error) return json({ error: "Could not update application" }, 500);
      const emailSent = await sendDenialEmail(profile.email, profile.name);
      return json({ ok: true, emailSent });
    }

    const userId = await ensureUser(admin, profile.email);
    const loginEmailResponse = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, create_user: false }),
    });

    if (!loginEmailResponse.ok) return json({ error: "Could not send the login email" }, 502);

    const { error: updateError } = await admin
      .from("authority_profiles")
      .update({ user_id: userId, status: "approved", approved_until: new Date(Date.now() + 2 * 365.25 * 24 * 60 * 60 * 1000).toISOString() })
      .eq("id", profile.id);

    if (updateError) return json({ error: "Could not approve application" }, 500);
    return json({ ok: true, emailSent: true });
  } catch {
    return json({ error: "Could not process the application" }, 500);
  }
});

async function ensureUser(admin: ReturnType<typeof createClient>, email: string): Promise<string> {
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.user) return created.user.id;
  if (!createError) throw new Error("User could not be created");

  const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const existing = users.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw createError;
  return existing.id;
}

async function sendDenialEmail(email: string, name: string): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Nexus Civic Sense <onboarding@resend.dev>",
      to: [email],
      subject: "Your Nexus Civic Sense authority application was denied",
      text: `Hello ${name},\n\nYour application was denied. Please submit a new application if your details change.`,
    }),
  });
  return response.ok;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
