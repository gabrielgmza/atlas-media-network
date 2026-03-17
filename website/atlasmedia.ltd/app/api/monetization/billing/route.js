import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { getRevenueStats, cancelSubscription } from "../../../../lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken||request.headers.get("x-atlas-admin-token")!==adminToken) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const db = getDb();
    const [campaigns,slots,revenue] = await Promise.all([
      db.query(publicationId?`SELECT c.*,a.business_name,s.name as slot_name,s.position FROM public.ad_campaigns c LEFT JOIN public.advertisers a ON c.advertiser_id=a.id LEFT JOIN public.ad_slots s ON c.slot_id=s.id WHERE c.publication_id=$1 ORDER BY c.created_at DESC`:`SELECT c.*,a.business_name,s.name as slot_name,s.position,p.name as publication_name FROM public.ad_campaigns c LEFT JOIN public.advertisers a ON c.advertiser_id=a.id LEFT JOIN public.ad_slots s ON c.slot_id=s.id LEFT JOIN public.publications p ON c.publication_id=p.id ORDER BY c.created_at DESC`, publicationId?[publicationId]:[]).catch(()=>({rows:[]})),
      db.query(publicationId?`SELECT * FROM public.ad_slots WHERE publication_id=$1 ORDER BY base_price DESC`:`SELECT s.*,p.name as publication_name FROM public.ad_slots s LEFT JOIN public.publications p ON s.publication_id=p.id ORDER BY p.name,s.base_price DESC`, publicationId?[publicationId]:[]).catch(()=>({rows:[]})),
      db.query(publicationId?`SELECT SUM(monthly_price) as mrr,COUNT(*) as active_campaigns FROM public.ad_campaigns WHERE publication_id=$1 AND status='active'`:`SELECT SUM(monthly_price) as mrr,COUNT(*) as active_campaigns FROM public.ad_campaigns WHERE status='active'`, publicationId?[publicationId]:[]).catch(()=>({rows:[{mrr:0,active_campaigns:0}]}))
    ]);
    let stripeStats=null;
    if (process.env.STRIPE_SECRET_KEY) stripeStats=await getRevenueStats().catch(()=>null);
    return NextResponse.json({ ok:true, campaigns:campaigns.rows, slots:slots.rows, dbRevenue:{mrr:parseFloat(revenue.rows[0]?.mrr||0).toFixed(2),activeCampaigns:parseInt(revenue.rows[0]?.active_campaigns||0)}, stripeStats });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken||request.headers.get("x-atlas-admin-token")!==adminToken) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });
    const body = await request.json();
    const { action, campaignId } = body;
    const db = getDb();
    if (action==="cancel"&&campaignId) {
      const c=await db.query(`SELECT * FROM public.ad_campaigns WHERE id=$1`,[campaignId]);
      if (!c.rows.length) return NextResponse.json({ ok:false, error:"NOT_FOUND" }, { status:404 });
      if (c.rows[0].stripe_subscription_id&&process.env.STRIPE_SECRET_KEY) await cancelSubscription(c.rows[0].stripe_subscription_id).catch(()=>{});
      await db.query(`UPDATE public.ad_campaigns SET status='cancelled',ends_at=NOW() WHERE id=$1`,[campaignId]);
      await db.query(`UPDATE public.ad_slots SET status='available' WHERE id=$1`,[c.rows[0].slot_id]).catch(()=>{});
      return NextResponse.json({ ok:true });
    }
    if (action==="activate"&&campaignId) {
      await db.query(`UPDATE public.ad_campaigns SET status='active',started_at=NOW() WHERE id=$1`,[campaignId]);
      const c=await db.query(`SELECT slot_id FROM public.ad_campaigns WHERE id=$1`,[campaignId]);
      if (c.rows.length) await db.query(`UPDATE public.ad_slots SET status='occupied' WHERE id=$1`,[c.rows[0].slot_id]).catch(()=>{});
      return NextResponse.json({ ok:true });
    }
    if (action==="update_creative"&&campaignId) {
      const {adTitle,adUrl,adImageUrl,adHtml}=body;
      await db.query(`UPDATE public.ad_campaigns SET ad_title=$1,ad_url=$2,ad_image_url=$3,ad_html=$4 WHERE id=$5`,[adTitle,adUrl,adImageUrl,adHtml,campaignId]);
      return NextResponse.json({ ok:true });
    }
    if (action==="seed_slots"&&body.publicationId) {
      const slots=[{position:"header",name:"Header Banner",size:"728x90",base_price:300},{position:"breaking",name:"Breaking News Sponsor",size:"400x60",base_price:400},{position:"inline",name:"Inline Article",size:"600x120",base_price:200},{position:"sidebar",name:"Sidebar",size:"300x250",base_price:150},{position:"footer",name:"Footer Banner",size:"728x90",base_price:100}];
      for (const slot of slots) await db.query(`INSERT INTO public.ad_slots (id,publication_id,name,position,size,base_price,status) VALUES ($1,$2,$3,$4,$5,$6,'available') ON CONFLICT DO NOTHING`,["slot-"+body.publicationId+"-"+slot.position,body.publicationId,slot.name,slot.position,slot.size,slot.base_price]).catch(()=>{});
      return NextResponse.json({ ok:true, slots });
    }
    return NextResponse.json({ ok:false, error:"UNKNOWN_ACTION" }, { status:400 });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}
