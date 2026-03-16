import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

async function ensurePushTable() {
  const db = getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS public.push_subscriptions (id TEXT PRIMARY KEY, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, publication_id TEXT, status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')), created_at TIMESTAMPTZ DEFAULT NOW())`);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    if (action === "vapid-key") {
      const publicKey = process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa40HI80Y1Q7EEsWc";
      return NextResponse.json({ ok: true, publicKey });
    }
    const adminToken = request.headers.get("x-atlas-admin-token");
    if (adminToken === process.env.ATLAS_ADMIN_TOKEN) {
      const db = getDb(); await ensurePushTable();
      const pub = searchParams.get("publication");
      const result = pub ? await db.query(`SELECT id,endpoint,publication_id,status,created_at FROM public.push_subscriptions WHERE publication_id=$1 AND status='active'`, [pub]) : await db.query(`SELECT publication_id, COUNT(*) as count FROM public.push_subscriptions WHERE status='active' GROUP BY publication_id`);
      return NextResponse.json({ ok: true, subscriptions: result.rows });
    }
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { subscription, publicationId } = body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return NextResponse.json({ ok: false, error: "INVALID_SUBSCRIPTION" }, { status: 400 });
    const db = getDb(); await ensurePushTable();
    const id = "push-" + Date.now() + "-" + Math.random().toString(36).slice(2,5);
    await db.query(`INSERT INTO public.push_subscriptions (id,endpoint,p256dh,auth,publication_id,status) VALUES ($1,$2,$3,$4,$5,'active') ON CONFLICT (endpoint) DO UPDATE SET publication_id=$5,status='active'`, [id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, publicationId||null]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    if (!endpoint) return NextResponse.json({ ok: false, error: "MISSING_ENDPOINT" }, { status: 400 });
    const db = getDb();
    await db.query(`UPDATE public.push_subscriptions SET status='inactive' WHERE endpoint=$1`, [endpoint]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
