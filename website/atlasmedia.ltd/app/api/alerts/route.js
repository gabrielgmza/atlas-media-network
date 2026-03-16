import { NextResponse } from "next/server";
import { getAlerts, createAlert, sendEmailAlert, ensureAlertsTable } from "../../../lib/alerts";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || null;
    const limit = parseInt(searchParams.get("limit") || "50");
    const alerts = await getAlerts({ status, limit });
    const db = getDb();
    await ensureAlertsTable();
    const counts = await db.query(`SELECT status, COUNT(*) as count FROM public.alerts GROUP BY status`);
    const summary = {};
    counts.rows.forEach(r => { summary[r.status] = parseInt(r.count); });
    return NextResponse.json({ ok: true, alerts, summary });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const { type, title, detail, publicationId, severity, sendEmail } = body;
    const id = await createAlert({ type, title, detail, publicationId, severity });
    let emailSent = false;
    if (sendEmail || severity === "critical" || severity === "high") {
      emailSent = await sendEmailAlert({ type, title, detail, severity, publicationId });
      if (emailSent) { const db = getDb(); await db.query(`UPDATE public.alerts SET email_sent=true WHERE id=$1`, [id]); }
    }
    return NextResponse.json({ ok: true, id, emailSent }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const { id, status, markAllRead } = body;
    const db = getDb();
    if (markAllRead) { await db.query(`UPDATE public.alerts SET status='read' WHERE status='new'`); return NextResponse.json({ ok: true }); }
    await db.query(`UPDATE public.alerts SET status=$2 WHERE id=$1`, [id, status]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
