import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { notifyGoogleIndexing, submitSitemap, automateGscSetup, batchNotifyIndexing } from "../../../lib/gsc";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });
    const body = await request.json();
    const { action, url, urls, domain, publicationId } = body;
    const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL||"https://atlas-media-network.vercel.app";
    if (action==="notify_url"&&url) return NextResponse.json(await notifyGoogleIndexing(url));
    if (action==="notify_batch"&&urls?.length) { const r=await batchNotifyIndexing(urls); return NextResponse.json({ok:true,results:r,notified:r.filter(x=>x.ok).length}); }
    if (action==="submit_sitemap") { const siteUrl=domain?"sc-domain:"+domain:BASE_URL; const sitemapUrl=(domain?"https://"+domain:BASE_URL)+"/sitemap.xml"; return NextResponse.json(await submitSitemap(siteUrl,sitemapUrl)); }
    if (action==="setup_domain"&&domain) return NextResponse.json(await automateGscSetup(domain));
    if (action==="notify_publication"&&publicationId) {
      const db=getDb();
      const articles=await db.query("SELECT slug FROM public.articles WHERE publication=$1 AND status='published' ORDER BY published_at DESC LIMIT 100",[publicationId]);
      const urlList=articles.rows.map(a=>BASE_URL+"/noticias/"+a.slug);
      const r=await batchNotifyIndexing(urlList);
      return NextResponse.json({ok:true,notified:r.filter(x=>x.ok).length,total:urlList.length});
    }
    return NextResponse.json({ ok:false, error:"UNKNOWN_ACTION" }, { status:400 });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}

export async function GET(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });
    const configured = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    return NextResponse.json({ ok:true, configured, message:configured?"Google Service Account configurado":"Configurar GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_KEY en Vercel", setupInstructions:["1. console.cloud.google.com","2. Activar Web Search Indexing API y Google Search Console API","3. IAM → Service Accounts → Crear service account","4. Descargar JSON key","5. Cargar en Vercel: GOOGLE_SERVICE_ACCOUNT_EMAIL (client_email) y GOOGLE_SERVICE_ACCOUNT_KEY (private_key)","6. En Search Console: agregar el email del service account como propietario"] });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}
