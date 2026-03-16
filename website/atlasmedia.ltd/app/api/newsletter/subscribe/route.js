import { NextResponse } from "next/server";
import { subscribeEmail, getSubscriberStats } from "../../../../lib/newsletter";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, publicationId } = body;
    if (!email || !publicationId) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    await subscribeEmail(email, publicationId);
    return NextResponse.json({ ok: true, message: "Suscripción confirmada." });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    if (!publicationId) return NextResponse.json({ ok: false, error: "MISSING_PUBLICATION" }, { status: 400 });
    const stats = await getSubscriberStats(publicationId);
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
