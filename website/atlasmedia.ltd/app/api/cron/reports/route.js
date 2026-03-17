import { NextResponse } from "next/server";
import { sendMonthlyReports } from "../../../../lib/reports";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminToken = request.headers.get("x-atlas-admin-token");
    if (authHeader!=="Bearer "+process.env.CRON_SECRET&&adminToken!==process.env.ATLAS_ADMIN_TOKEN) return NextResponse.json({ok:false,error:"UNAUTHORIZED"},{status:401});
    const db = getDb();
    await db.query(`CREATE TABLE IF NOT EXISTS public.ad_clicks (id TEXT PRIMARY KEY,campaign_id TEXT,publication_id TEXT,position TEXT,created_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS public.ad_impressions (id TEXT PRIMARY KEY,campaign_id TEXT,publication_id TEXT,position TEXT,created_at TIMESTAMPTZ DEFAULT NOW());`).catch(()=>{});
    return NextResponse.json(await sendMonthlyReports());
  } catch(error){return NextResponse.json({ok:false,error:error.message},{status:500});}
}
