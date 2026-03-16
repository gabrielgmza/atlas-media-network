import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

async function gatherMetrics() {
  const db = getDb();
  const [holdingStats, pipelineToday, articlesPublished, topArticles, newAlerts, subscribers, newComments, pageviews] = await Promise.all([
    db.query(`SELECT (SELECT COUNT(*) FROM public.publications WHERE status='active') as publications, (SELECT COUNT(*) FROM public.articles WHERE status='published') as total_articles, (SELECT COUNT(*) FROM public.journalists WHERE active=true) as journalists, (SELECT COUNT(*) FROM public.advertisers WHERE status='prospect') as ad_prospects, (SELECT COUNT(*) FROM public.advertisers WHERE status='active') as active_advertisers`),
    db.query(`SELECT COUNT(*) as runs, SUM(articles_published) as articles, SUM(articles_failed) as failed FROM public.pipeline_runs WHERE started_at>NOW()-INTERVAL '24 hours' AND status='completed'`),
    db.query(`SELECT a.title, a.category, a.publication_name, a.author FROM public.articles a WHERE a.published_at>NOW()-INTERVAL '24 hours' AND a.status='published' ORDER BY a.published_at DESC LIMIT 10`),
    db.query(`SELECT pv.article_slug, a.title, a.publication_name, COUNT(*) as views FROM public.pageviews pv LEFT JOIN public.articles a ON pv.article_slug=a.slug WHERE pv.created_at>NOW()-INTERVAL '24 hours' AND pv.article_slug IS NOT NULL GROUP BY pv.article_slug,a.title,a.publication_name ORDER BY views DESC LIMIT 5`).catch(()=>({rows:[]})),
    db.query(`SELECT COUNT(*) as total, SUM(CASE WHEN severity='high' OR severity='critical' THEN 1 ELSE 0 END) as urgent FROM public.alerts WHERE status='new' AND created_at>NOW()-INTERVAL '24 hours'`).catch(()=>({rows:[{total:0,urgent:0}]})),
    db.query(`SELECT COUNT(*) as new_subs FROM public.newsletter_subscribers WHERE created_at>NOW()-INTERVAL '24 hours' AND status='active'`).catch(()=>({rows:[{new_subs:0}]})),
    db.query(`SELECT COUNT(*) as new_comments, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved FROM public.comments WHERE created_at>NOW()-INTERVAL '24 hours'`).catch(()=>({rows:[{new_comments:0,approved:0}]})),
    db.query(`SELECT (SELECT COUNT(*) FROM public.pageviews WHERE created_at>NOW()-INTERVAL '24 hours') as today, (SELECT COUNT(*) FROM public.pageviews WHERE created_at>NOW()-INTERVAL '7 days') as week`).catch(()=>({rows:[{today:0,week:0}]}))
  ]);
  return { holding: holdingStats.rows[0], pipeline: pipelineToday.rows[0], articlesPublished: articlesPublished.rows, topArticles: topArticles.rows, alerts: newAlerts.rows[0], subscribers: subscribers.rows[0], comments: newComments.rows[0], pageviews: pageviews.rows[0] };
}

async function generateExecutiveReport(metrics, date) {
  const articleList = metrics.articlesPublished.slice(0,5).map((a,i)=>(i+1)+". "+a.title+" ("+a.publication_name+", "+a.category+")").join("\n");
  const topList = metrics.topArticles.slice(0,3).map((a,i)=>(i+1)+". "+(a.title||a.article_slug)+" - "+a.views+" vistas").join("\n");
  const prompt = "Sos el AI President OS de Atlas Media Network. Genera el reporte ejecutivo diario para el Founder.\n\nFECHA: "+date+"\n\nHOLDING: "+metrics.holding.publications+" publicaciones, "+metrics.holding.total_articles+" articulos totales, "+metrics.holding.journalists+" periodistas IA, "+metrics.holding.ad_prospects+" prospectos publi.\n\nPIPELINE 24hs: "+( metrics.pipeline.runs||0)+" runs, "+(metrics.pipeline.articles||0)+" articulos publicados, "+(metrics.pipeline.failed||0)+" fallidos.\n\nARTICULOS HOY:\n"+( articleList||"Ninguno")+"\n\nTOP TRAFICO:\n"+(topList||"Sin datos")+"\n\nTRAFICO: "+metrics.pageviews.today+" vistas hoy, "+metrics.pageviews.week+" esta semana.\n\nENGAGEMENT: "+metrics.comments.new_comments+" nuevos comentarios, "+metrics.subscribers.new_subs+" nuevos suscriptores.\n\nALERTAS: "+metrics.alerts.total+" nuevas ("+metrics.alerts.urgent+" urgentes).\n\nEscribe un reporte ejecutivo conciso en HTML con: evaluacion del dia, highlights, puntos de atencion, 3 acciones recomendadas. Tono ejecutivo directo. Estilos inline.\n\nResponde SOLO en JSON valido sin markdown:\n{\"subject\":\"asunto del email\",\"htmlBody\":\"HTML completo\"}";
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }) });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function sendReport(subject, htmlBody) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";
  const fullHtml = "<div style='font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#fff;'><div style='background:#0b1020;padding:20px 28px;'><span style='color:#fff;font-weight:800;font-size:16px;'>Atlas Media Network</span><span style='color:#93c5fd;font-size:13px;float:right;'>Reporte Ejecutivo Diario</span></div>" + htmlBody + "<div style='background:#f8f8f8;padding:16px 28px;font-size:12px;color:#888;'><a href='" + BASE_URL + "/control' style='color:#4f46e5;text-decoration:none;margin-right:16px;'>Panel de control</a><a href='" + BASE_URL + "/analytics' style='color:#4f46e5;text-decoration:none;margin-right:16px;'>Analytics</a><a href='" + BASE_URL + "/alerts' style='color:#4f46e5;text-decoration:none;margin-right:16px;'>Alertas</a><a href='" + BASE_URL + "/president' style='color:#4f46e5;text-decoration:none;'>AI President</a></div></div>";
  const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey }, body: JSON.stringify({ from: "Atlas President <president@atlasmedia.ltd>", to: [process.env.FOUNDER_EMAIL||"gabriel@atlasmedia.ltd"], subject, html: fullHtml }) });
  return res.ok;
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminToken = request.headers.get("x-atlas-admin-token");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET && adminToken !== process.env.ATLAS_ADMIN_TOKEN) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const date = new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const metrics = await gatherMetrics();
    const report = await generateExecutiveReport(metrics, date);
    const sent = await sendReport(report.subject, report.htmlBody);
    const db = getDb();
    await db.query(`INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'note',$2,$3,'high',NOW(),'global')`, ["mem-report-"+Date.now(), "Reporte ejecutivo: "+date, "Articulos: "+(metrics.pipeline.articles||0)+". Vistas: "+(metrics.pageviews.today||0)+". Email: "+(sent?"si":"no")]).catch(()=>{});
    return NextResponse.json({ ok: true, date, subject: report.subject, emailSent: sent, metrics: { articlesPublished: metrics.pipeline.articles||0, pageviewsToday: metrics.pageviews.today||0, newAlerts: metrics.alerts.total||0 } });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
