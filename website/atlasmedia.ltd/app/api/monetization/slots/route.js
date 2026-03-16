import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { seedAdSlots, getMonetizationStats } from "../../../../lib/monetization";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const db = getDb();
    const slots = publicationId
      ? await db.query(`SELECT s.*, (SELECT COUNT(*) FROM public.ad_campaigns c WHERE c.slot_id=s.id AND c.status='active') as active_campaigns FROM public.ad_slots s WHERE s.publication_id=$1 ORDER BY s.base_price DESC`, [publicationId])
      : await db.query(`SELECT s.*, (SELECT COUNT(*) FROM public.ad_campaigns c WHERE c.slot_id=s.id AND c.status='active') as active_campaigns FROM public.ad_slots s ORDER BY s.publication_id, s.base_price DESC`);
    const stats = publicationId ? await getMonetizationStats(publicationId) : null;
    return NextResponse.json({ ok: true, slots: slots.rows, stats });
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
    if (body.action === "seed" && body.publicationId) {
      const slots = await seedAdSlots(body.publicationId);
      return NextResponse.json({ ok: true, message: `${slots.length} slots creados`, slots });
    }
    if (body.action === "campaign") {
      const db = getDb();
      const id = `camp-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
      const result = await db.query(
        `INSERT INTO public.ad_campaigns (id,advertiser_id,publication_id,slot_id,title,description,url,format,status,monthly_budget,start_date,end_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11) RETURNING *`,
        [id, body.advertiserId, body.publicationId, body.slotId, body.title, body.description||null, body.url||null, body.format||'banner', body.monthlyBudget||null, body.startDate||null, body.endDate||null]
      );
      await db.query(`UPDATE public.ad_slots SET status='occupied' WHERE id=$1`, [body.slotId]);
      return NextResponse.json({ ok: true, campaign: result.rows[0] }, { status: 201 });
    }
    return NextResponse.json({ ok: false, error: "INVALID_ACTION" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
