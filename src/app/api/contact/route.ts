import { NextResponse } from "next/server";

/**
 * Placeholder contact endpoint. It validates the payload and returns success.
 * Wire this up to your inbox / CRM / email provider (Resend, Postmark, a
 * Slack webhook, etc.) — the client form already posts JSON here.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const details = String(body.details ?? "").trim();

  if (body.company_website) {
    // Honeypot tripped — pretend everything is fine.
    return NextResponse.json({ ok: true });
  }

  if (!name || !email || !details) {
    return NextResponse.json(
      { error: "Name, email and details are required." },
      { status: 422 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 422 },
    );
  }

  // TODO: deliver the message. For now we just log it server-side.
  console.info("[contact] new enquiry", { name, email });

  return NextResponse.json({ ok: true });
}
