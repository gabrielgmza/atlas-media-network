import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminToken = request.headers.get("x-atlas-admin-token");
    if (authHeader!=="Bearer "+process.env.CRON_SECRET&&adminToken!==process.env.ATLAS_ADMIN_TOKEN) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });
    const db = getDb();
    const expired=await db.query(`UPDATE public.ad_campaigns SET status='expired' WHERE status='active' AND ends_at IS NOT NULL AND ends_at<NOW() RETURNING id,slot_id`).catch(()=>({rows:[]}));
    for (const camp of expired.rows) await db.query(`UPDATE public.ad_slots SET status='available' WHERE id=$1`,[camp.slot_id]).catch(()=>{});
    const revenue=await db.query(`SELECT SUM(monthly_price) as mrr,COUNT(*) as active FROM public.ad_campaigns WHERE status='active'`).catch(()=>({rows:[{mrr:0,active:0}]}));
    const mrr=parseFloat(revenue.rows[0]?.mrr||0).toFixed(2);
    const active=parseInt(revenue.rows[0]?.active||0);
    if (process.env.RESEND_API_KEY&&process.env.FOUNDER_EMAIL) {
      await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.RESEND_API_KEY},body:JSON.stringify({from:"Atlas Billing <billing@atlasmedia.ltd>",to:[process.env.FOUNDER_EMAIL],subject:"Reporte mensual — USD "+mrr+" MRR",html:"<h2>Reporte de Monetizacion</h2><p><strong>MRR:</strong> USD "+mrr+"/mes</p><p><strong>Campanas activas:</strong> "+active+"</p><p><strong>Expiradas:</strong> "+expired.rows.length+"</p>"})}).catch(()=>{});
    }
    return NextResponse.json({ ok:true, expired:expired.rows.length, mrr, activeCampaigns:active });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}
