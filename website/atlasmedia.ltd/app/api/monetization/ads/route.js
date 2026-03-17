import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const position = searchParams.get("position");
    if (!publicationId||!position) return NextResponse.json({ ok:false, error:"MISSING_PARAMS" }, { status:400 });
    const db = getDb();
    const result = await db.query(`SELECT c.id,c.ad_title,c.ad_url,c.ad_image_url,c.ad_html,a.business_name FROM public.ad_campaigns c LEFT JOIN public.ad_slots s ON c.slot_id=s.id LEFT JOIN public.advertisers a ON c.advertiser_id=a.id WHERE c.publication_id=$1 AND s.position=$2 AND c.status='active' ORDER BY c.started_at DESC LIMIT 1`, [publicationId, position]);
    return NextResponse.json({ ok:true, ad:result.rows[0]||null });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}
