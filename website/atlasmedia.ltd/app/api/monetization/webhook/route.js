import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

async function ensureCampaignsTable() {
  const db = getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS public.ad_campaigns (id TEXT PRIMARY KEY, advertiser_id TEXT, slot_id TEXT, publication_id TEXT, status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','paused','cancelled','expired')), stripe_session_id TEXT, stripe_subscription_id TEXT, stripe_customer_id TEXT, ad_title TEXT, ad_url TEXT, ad_image_url TEXT, ad_html TEXT, monthly_price NUMERIC, started_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, last_billed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())`);
}

export async function POST(request) {
  try {
    const payload = await request.text();
    const db = getDb();
    await ensureCampaignsTable();
    let event;
    try { event = JSON.parse(payload); } catch { return NextResponse.json({ ok:false, error:"INVALID_PAYLOAD" }, { status:400 }); }
    const data = event.data?.object;

    switch (event.type) {
      case "checkout.session.completed": {
        const slotId=data.metadata?.slot_id;
        const advertiserId=data.metadata?.advertiser_id;
        if (!slotId) break;
        await db.query(`UPDATE public.ad_slots SET status='occupied' WHERE id=$1`,[slotId]).catch(()=>{});
        const existing=await db.query(`SELECT id FROM public.ad_campaigns WHERE stripe_session_id=$1`,[data.id]);
        if (existing.rows.length) {
          await db.query(`UPDATE public.ad_campaigns SET status='active',stripe_subscription_id=$1,stripe_customer_id=$2,started_at=NOW(),last_billed_at=NOW() WHERE stripe_session_id=$3`,[data.subscription,data.customer,data.id]);
        } else {
          await db.query(`INSERT INTO public.ad_campaigns (id,advertiser_id,slot_id,publication_id,status,stripe_session_id,stripe_subscription_id,stripe_customer_id,monthly_price,started_at,last_billed_at) VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8,NOW(),NOW())`,["camp-"+Date.now(),advertiserId,slotId,data.metadata?.publication_id,data.id,data.subscription,data.customer,data.amount_total?(data.amount_total/100):0]);
        }
        if (advertiserId) await db.query(`UPDATE public.advertisers SET status='active' WHERE id=$1`,[advertiserId]).catch(()=>{});
        if (process.env.RESEND_API_KEY&&process.env.FOUNDER_EMAIL) {
          await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.RESEND_API_KEY},body:JSON.stringify({from:"Atlas Billing <billing@atlasmedia.ltd>",to:[process.env.FOUNDER_EMAIL],subject:"Nuevo anunciante — USD "+(data.amount_total?data.amount_total/100:0)+"/mes",html:"<h2>Nuevo pago recibido</h2><p>Slot: "+slotId+"</p><p>Monto: USD "+(data.amount_total?data.amount_total/100:0)+"/mes</p>"})}).catch(()=>{});
        }
        break;
      }
      case "invoice.payment_succeeded": {
        if (data.subscription) await db.query(`UPDATE public.ad_campaigns SET last_billed_at=NOW(),status='active' WHERE stripe_subscription_id=$1`,[data.subscription]).catch(()=>{});
        break;
      }
      case "invoice.payment_failed": {
        if (data.subscription) {
          const c=await db.query(`SELECT slot_id FROM public.ad_campaigns WHERE stripe_subscription_id=$1`,[data.subscription]);
          await db.query(`UPDATE public.ad_campaigns SET status='paused' WHERE stripe_subscription_id=$1`,[data.subscription]).catch(()=>{});
          if (c.rows.length) await db.query(`UPDATE public.ad_slots SET status='available' WHERE id=$1`,[c.rows[0].slot_id]).catch(()=>{});
        }
        break;
      }
      case "customer.subscription.deleted": {
        const c=await db.query(`SELECT slot_id FROM public.ad_campaigns WHERE stripe_subscription_id=$1`,[data.id]);
        await db.query(`UPDATE public.ad_campaigns SET status='cancelled',ends_at=NOW() WHERE stripe_subscription_id=$1`,[data.id]).catch(()=>{});
        if (c.rows.length) await db.query(`UPDATE public.ad_slots SET status='available' WHERE id=$1`,[c.rows[0].slot_id]).catch(()=>{});
        break;
      }
    }
    return NextResponse.json({ ok:true, received:true });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}
