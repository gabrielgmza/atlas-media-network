import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { generateCampaignReport, getCampaignMetrics, sendReportEmail, sendMonthlyReports } from "../../../lib/reports";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken||request.headers.get("x-atlas-admin-token")!==adminToken) return NextResponse.json({ok:false,error:"UNAUTHORIZED"},{status:401});
    const body = await request.json();
    const {action,campaignId} = body;
    const db = getDb();
    if (action==="send_monthly") return NextResponse.json(await sendMonthlyReports());
    if (action==="send_campaign"&&campaignId) {
      const c=await db.query(`SELECT c.*,a.business_name,a.contact_email,s.name as slot_name,s.position as slot_position,p.name as publication_name,p.slug as publication_slug FROM public.ad_campaigns c LEFT JOIN public.advertisers a ON c.advertiser_id=a.id LEFT JOIN public.ad_slots s ON c.slot_id=s.id LEFT JOIN public.publications p ON c.publication_id=p.id WHERE c.id=$1`,[campaignId]);
      if (!c.rows.length) return NextResponse.json({ok:false,error:"NOT_FOUND"},{status:404});
      const now=new Date(); const ms=new Date(now.getFullYear(),now.getMonth()-1,1); const me=new Date(now.getFullYear(),now.getMonth(),0,23,59,59);
      const month=ms.toLocaleDateString("es-AR",{month:"long",year:"numeric"});
      const metrics=await getCampaignMetrics(campaignId,ms.toISOString(),me.toISOString());
      const html=await generateCampaignReport(c.rows[0],metrics,{name:c.rows[0].publication_name,slug:c.rows[0].publication_slug});
      const email=await sendReportEmail({contact_email:c.rows[0].contact_email},html,month,c.rows[0].publication_name);
      return NextResponse.json({ok:email.ok,campaignId,advertiser:c.rows[0].business_name,month,metrics,error:email.error});
    }
    if (action==="preview"&&campaignId) {
      const c=await db.query(`SELECT c.*,a.business_name,s.name as slot_name,s.position as slot_position,p.name as publication_name,p.slug as publication_slug FROM public.ad_campaigns c LEFT JOIN public.advertisers a ON c.advertiser_id=a.id LEFT JOIN public.ad_slots s ON c.slot_id=s.id LEFT JOIN public.publications p ON c.publication_id=p.id WHERE c.id=$1`,[campaignId]);
      if (!c.rows.length) return NextResponse.json({ok:false,error:"NOT_FOUND"},{status:404});
      const now=new Date(); const ms=new Date(now.getFullYear(),now.getMonth()-1,1); const me=new Date(now.getFullYear(),now.getMonth(),0,23,59,59);
      const metrics=await getCampaignMetrics(campaignId,ms.toISOString(),me.toISOString());
      const html=await generateCampaignReport(c.rows[0],metrics,{name:c.rows[0].publication_name,slug:c.rows[0].publication_slug});
      return new Response(html,{headers:{"Content-Type":"text/html"}});
    }
    return NextResponse.json({ok:false,error:"UNKNOWN_ACTION"},{status:400});
  } catch(error){return NextResponse.json({ok:false,error:error.message},{status:500});}
}

export async function GET(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken||request.headers.get("x-atlas-admin-token")!==adminToken) return NextResponse.json({ok:false,error:"UNAUTHORIZED"},{status:401});
    const db = getDb();
    const campaigns=await db.query(`SELECT c.id,c.status,c.monthly_price,c.started_at,a.business_name,a.contact_email,p.name as publication_name FROM public.ad_campaigns c LEFT JOIN public.advertisers a ON c.advertiser_id=a.id LEFT JOIN public.publications p ON c.publication_id=p.id WHERE c.status='active' AND a.contact_email IS NOT NULL ORDER BY c.started_at DESC`).catch(()=>({rows:[]}));
    return NextResponse.json({ok:true,campaigns:campaigns.rows,total:campaigns.rows.length});
  } catch(error){return NextResponse.json({ok:false,error:error.message},{status:500});}
}
