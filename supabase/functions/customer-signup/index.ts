import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function responseHeaders(origin: string | null) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Vary": "Origin",
  });
  if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return headers;
}

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const headers = responseHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405, headers });
  }

  if (!origin || !allowedOrigins.includes(origin)) {
    return Response.json({ error: "Request origin is not allowed." }, { status: 403, headers });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 8192) {
    return Response.json({ error: "Request is too large." }, { status: 413, headers });
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Content type must be application/json." }, { status: 415, headers });
  }

  let requestBody: string;
  try {
    requestBody = await request.text();
  } catch {
    return Response.json({ error: "Could not read request body." }, { status: 400, headers });
  }
  if (requestBody.length > 8192) {
    return Response.json({ error: "Request is too large." }, { status: 413, headers });
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(requestBody);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400, headers });
  }
  if (!parsedPayload || typeof parsedPayload !== "object" || Array.isArray(parsedPayload)) {
    return Response.json({ error: "Request body must be an object." }, { status: 400, headers });
  }
  const payload = parsedPayload as Record<string, unknown>;

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const fullName = typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8 ||
    password.length > 128 ||
    !fullName ||
    fullName.length > 120 ||
    phone.length > 40
  ) {
    return Response.json({ error: "Enter a valid name, email, phone number, and password of at least 8 characters." }, { status: 400, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Customer signup function is missing Supabase server credentials.");
    return Response.json({ error: "Account creation is temporarily unavailable." }, { status: 503, headers });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown";
  const [ipKey, emailKey] = await Promise.all([
    hash(`customer-signup:ip:${clientIp}`),
    hash(`customer-signup:email:${email}`),
  ]);
  const { data: rateAllowed, error: rateError } = await adminClient.rpc(
    "consume_customer_signup_rate_limit",
    { ip_key: ipKey, email_key: emailKey },
  );

  if (rateError) {
    console.error("Customer signup rate limiter failed:", rateError.message);
    return Response.json({ error: "Account creation is temporarily unavailable." }, { status: 503, headers });
  }
  if (!rateAllowed) {
    return Response.json({ error: "Too many signup attempts. Please wait a little before trying again." }, { status: 429, headers });
  }

  const { error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      account_type: "customer",
      full_name: fullName,
      phone,
    },
  });

  if (createError) {
    console.error("Customer account creation failed:", createError.message);
    return Response.json({ error: "We couldn’t create an account with those details. Check the email or try signing in." }, { status: 400, headers });
  }

  return Response.json({ success: true }, { status: 201, headers });
});
