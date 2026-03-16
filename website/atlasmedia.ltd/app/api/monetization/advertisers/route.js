import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { ensureMonetizationTables } from "../../../../lib/monetization";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const db = getDb();
    await ensureMonetizationTables();
    const query = publicationId
      ? `SELECT a.*, t.name as territory_name, (SELECT COUNT(*) FROM public.ad_campaigns c WHERE c.advertiser_id=a.id AND c.status='active') as active_campaigns, (SELECT SUM(monthly_budget) FROM public.ad_campaigns c WHERE c.advertiser_id=a.id AND c.status='active') as monthly_spend FROM public.advertisers a LEFT JOIN public.territories t ON a.territory_id=t.id WHERE a.publication_id=$1 ORDER BY a.created_at DESC`
      : `SELECT a.*, t.name as territory_name, (SELECT COUNT(*) FROM public.ad_campaigns c WHERE c.advertiser_id=a.id AND c.status='active') as active_campaigns, (SELECT SUM(monthly_budget) FROM public.ad_campaigns c WHERE c.advertiser_id=a.id AND c.status='active') as monthly_spend FROM public.advertisers a LEFT JOIN public.territories t ON a.territory_id=t.id ORDER BY a.created_at DESC`;
    const result = publicationId ? await db.query(query, [publicationId]) : await db.query(query);
    return NextResponse.json({ ok: true, advertisers: result.rows });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const body = await request.json();
    const { businessName, contactEmail, contactPhone, publicationId, territoryId, notes, discoveredBy } = body;
    if (!businessName || !publicationId) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    const db = getDb();
    const id = `adv-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
    const result = await db.query(
      `INSERT INTO public.advertisers (id,publication_id,territory_id,business_name,contact_email,contact_phone,status,notes,discovered_by) VALUES ($1,$2,$3,$4,$5,$6,'prospect',$7,$8) RETURNING *`,
      [id, publicationId, territoryId||null, businessName, contactEmail||null, contactPhone||null, notes||null, discoveredBy||'manual']
    );
    return NextResponse.json({ ok: true, advertiser: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const body = await request.json();
    const { id, status, notes, monthlySpend } = body;
    const db = getDb();
    const result = await db.query(
      `UPDATE public.advertisers SET status=COALESCE($2,status), notes=COALESCE($3,notes), monthly_spend=COALESCE($4,monthly_spend) WHERE id=$1 RETURNING *`,
      [id, status||null, notes||null, monthlySpend||null]
    );
    return NextResponse.json({ ok: true, advertiser: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
