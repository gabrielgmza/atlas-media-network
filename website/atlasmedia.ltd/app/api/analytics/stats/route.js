import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const days = parseInt(searchParams.get("days") || "30");
    const extra = searchParams.get("extra") === "1";
    const db = getDb();

    await db.query(`CREATE TABLE IF NOT EXISTS public.pageviews (id TEXT PRIMARY KEY, publication_id TEXT, article_slug TEXT, article_id TEXT, referrer TEXT, user_agent TEXT, country TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);

    const pubFilter = publicationId ? "AND publication_id = '" + publicationId + "'" : "";

    const [totalViews, dailyViews, topArticles, topPublications, viewsByHour] = await Promise.all([
      db.query("SELECT COUNT(*) as total, COUNT(CASE WHEN created_at>NOW()-INTERVAL '1 day' THEN 1 END) as today, COUNT(CASE WHEN created_at>NOW()-INTERVAL '7 days' THEN 1 END) as week FROM public.pageviews WHERE created_at>NOW()-INTERVAL '" + days + " days' " + pubFilter),
      db.query("SELECT DATE(created_at) as date, COUNT(*) as views FROM public.pageviews WHERE created_at>NOW()-INTERVAL '" + days + " days' " + pubFilter + " GROUP BY DATE(created_at) ORDER BY date ASC"),
      db.query("SELECT pv.article_slug, a.title, a.publication_name, a.author, a.category, COUNT(*) as views FROM public.pageviews pv LEFT JOIN public.articles a ON pv.article_slug=a.slug WHERE pv.created_at>NOW()-INTERVAL '" + days + " days' " + pubFilter + " AND pv.article_slug IS NOT NULL GROUP BY pv.article_slug,a.title,a.publication_name,a.author,a.category ORDER BY views DESC LIMIT 20"),
      db.query("SELECT pv.publication_id, p.name as publication_name, COUNT(*) as views FROM public.pageviews pv LEFT JOIN public.publications p ON pv.publication_id=p.id WHERE pv.created_at>NOW()-INTERVAL '" + days + " days' " + pubFilter + " AND pv.publication_id IS NOT NULL GROUP BY pv.publication_id,p.name ORDER BY views DESC"),
      db.query("SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as views FROM public.pageviews WHERE created_at>NOW()-INTERVAL '" + days + " days' " + pubFilter + " GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY hour ASC")
    ]);

    const response = { ok: true, totals: totalViews.rows[0], dailyViews: dailyViews.rows, topArticles: topArticles.rows, topPublications: topPublications.rows, viewsByHour: viewsByHour.rows };

    if (extra) {
      const pubCond = publicationId ? "AND publication_id='"+publicationId+"'" : "";
      const [pipeline, subscribers, comments, subsByPub] = await Promise.all([
        db.query("SELECT COUNT(*) as runs, COUNT(CASE WHEN status='completed' THEN 1 END) as completed, SUM(articles_published) as articles, MAX(started_at) as last_run FROM public.pipeline_runs WHERE started_at>NOW()-INTERVAL '"+days+" days' "+pubCond),
        db.query("SELECT COUNT(*) as total, COUNT(CASE WHEN created_at>NOW()-INTERVAL '30 days' THEN 1 END) as new_this_month FROM public.newsletter_subscribers WHERE status='active' "+(publicationId?"AND publication_id='"+publicationId+"'":"")).catch(()=>({rows:[{total:0,new_this_month:0}]})),
        db.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='approved' THEN 1 END) as approved, COUNT(CASE WHEN status IN ('rejected','spam') THEN 1 END) as rejected FROM public.comments "+(publicationId?"WHERE publication_id='"+publicationId+"'":"")).catch(()=>({rows:[{total:0,approved:0,rejected:0}]})),
        db.query("SELECT publication_id, COUNT(*) as total FROM public.newsletter_subscribers WHERE status='active' GROUP BY publication_id ORDER BY total DESC").catch(()=>({rows:[]}))
      ]);
      response.pipeline = { runs:parseInt(pipeline.rows[0].runs||0), completed:parseInt(pipeline.rows[0].completed||0), articles:parseInt(pipeline.rows[0].articles||0), lastRun:pipeline.rows[0].last_run };
      response.subscribers = { total:parseInt(subscribers.rows[0].total||0), newThisMonth:parseInt(subscribers.rows[0].new_this_month||0), byPublication:subsByPub.rows };
      response.comments = { total:parseInt(comments.rows[0].total||0), approved:parseInt(comments.rows[0].approved||0), rejected:parseInt(comments.rows[0].rejected||0) };
    }

    return NextResponse.json(response);
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
