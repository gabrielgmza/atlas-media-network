import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

async function getPublicationMetrics(publicationId) {
  const db = getDb();
  const [pub, articles, pipeline, slots, pageviews] = await Promise.all([
    db.query(`SELECT p.*, t.name as territory_name, t.type as territory_type FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.id=$1`, [publicationId]),
    db.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN published_at>NOW()-INTERVAL '30 days' THEN 1 END) as last30, COUNT(CASE WHEN published_at>NOW()-INTERVAL '7 days' THEN 1 END) as last7 FROM public.articles WHERE publication=$1 AND status='published'`, [publicationId]),
    db.query(`SELECT COUNT(*) as total_runs, AVG(articles_published) as avg_articles FROM public.pipeline_runs WHERE publication_id=$1 AND status='completed'`, [publicationId]),
    db.query(`SELECT * FROM public.ad_slots WHERE publication_id=$1 ORDER BY base_price DESC`, [publicationId]).catch(() => ({ rows: [] })),
    db.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN created_at>NOW()-INTERVAL '30 days' THEN 1 END) as last30 FROM public.pageviews WHERE publication_id=$1`, [publicationId]).catch(() => ({ rows: [{ total: 0, last30: 0 }] }))
  ]);
  return { publication: pub.rows[0], articles: articles.rows[0], pipeline: pipeline.rows[0], slots: slots.rows, pageviews: pageviews.rows[0] };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const db = getDb();
    if (publicationId) { const metrics = await getPublicationMetrics(publicationId); return NextResponse.json({ ok: true, ...metrics }); }
    const pubs = await db.query(`SELECT p.id, p.name, p.slug, p.scope, p.description, t.name as territory_name, (SELECT COUNT(*) FROM public.articles a WHERE a.publication=p.id AND a.status='published') as article_count FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.status='active' ORDER BY p.scope, p.name`);
    return NextResponse.json({ ok: true, publications: pubs.rows });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { businessName, contactName, contactEmail, contactPhone, publicationId, message, budget } = body;
    if (!businessName || !contactEmail || !publicationId) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    const db = getDb();
    const id = "adv-mk-" + Date.now() + "-" + Math.random().toString(36).slice(2,5);
    await db.query(`INSERT INTO public.advertisers (id,publication_id,business_name,contact_email,contact_phone,status,notes,discovered_by) VALUES ($1,$2,$3,$4,$5,'prospect',$6,'mediakit') ON CONFLICT DO NOTHING`, [id, publicationId, businessName, contactEmail, contactPhone||null, "Via media kit. " + (contactName?"Nombre: "+contactName+". ":"") + (budget?"Budget: "+budget+". ":"") + (message||"")]);
    if (process.env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.RESEND_API_KEY }, body: JSON.stringify({ from: "Atlas Media Kit <mediakit@atlasmedia.ltd>", to: [process.env.FOUNDER_EMAIL||"gabriel@atlasmedia.ltd"], subject: "Nuevo anunciante: " + businessName, html: "<h2>Nuevo contacto de media kit</h2><p><b>Empresa:</b> " + businessName + "</p><p><b>Email:</b> " + contactEmail + "</p><p><b>Publicacion:</b> " + publicationId + "</p><p><b>Budget:</b> " + (budget||"N/A") + "</p><p><b>Mensaje:</b> " + (message||"N/A") + "</p>" }) }).catch(()=>{});
    }
    await db.query(`INSERT INTO public.alerts (id,type,title,detail,publication_id,severity) VALUES ($1,'custom',$2,$3,$4,'low')`, ["alert-mk-"+Date.now(), "Nuevo anunciante: "+businessName, "Email: "+contactEmail+". Budget: "+(budget||"N/A"), publicationId]).catch(()=>{});
    return NextResponse.json({ ok: true, message: "Solicitud recibida." });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
