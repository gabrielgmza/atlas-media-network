import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { createCheckoutSession, createPaymentLink } from "../../../../lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const { slotId, advertiserId, businessName, contactEmail } = body;
    if (!slotId || !contactEmail) return NextResponse.json({ ok:false, error:"MISSING_FIELDS" }, { status:400 });
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ ok:false, error:"STRIPE_NOT_CONFIGURED" }, { status:503 });
    const db = getDb();
    const slotResult = await db.query(`SELECT s.*, p.name as publication_name FROM public.ad_slots s LEFT JOIN public.publications p ON s.publication_id=p.id WHERE s.id=$1`, [slotId]);
    if (!slotResult.rows.length) return NextResponse.json({ ok:false, error:"SLOT_NOT_FOUND" }, { status:404 });
    const slot = slotResult.rows[0];
    if (slot.status === "occupied") return NextResponse.json({ ok:false, error:"SLOT_ALREADY_OCCUPIED" }, { status:409 });
    let advertiser;
    if (advertiserId) { const r=await db.query(`SELECT * FROM public.advertisers WHERE id=$1`,[advertiserId]); advertiser=r.rows[0]; }
    if (!advertiser) {
      const id="adv-"+Date.now();
      await db.query(`INSERT INTO public.advertisers (id,publication_id,business_name,contact_email,status,discovered_by) VALUES ($1,$2,$3,$4,'prospect','checkout') ON CONFLICT DO NOTHING`,[id,slot.publication_id,businessName||contactEmail,contactEmail]);
      advertiser={id,business_name:businessName||contactEmail,contact_email:contactEmail,publication_id:slot.publication_id};
    }
    const session = await createCheckoutSession({ advertiser, slot });
    return NextResponse.json({ ok:true, checkoutUrl:session.url, sessionId:session.id, slot:{name:slot.name,price:slot.base_price,publication:slot.publication_name} });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get("slot");
    if (!slotId) return NextResponse.json({ ok:false, error:"MISSING_SLOT" }, { status:400 });
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ ok:false, error:"STRIPE_NOT_CONFIGURED" });
    const db = getDb();
    const slotResult = await db.query(`SELECT s.*, p.name as publication_name FROM public.ad_slots s LEFT JOIN public.publications p ON s.publication_id=p.id WHERE s.id=$1`, [slotId]);
    if (!slotResult.rows.length) return NextResponse.json({ ok:false, error:"SLOT_NOT_FOUND" }, { status:404 });
    const link = await createPaymentLink({ slot:slotResult.rows[0] });
    return NextResponse.json({ ok:true, paymentUrl:link.url, slot:{name:slotResult.rows[0].name,price:slotResult.rows[0].base_price} });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}
