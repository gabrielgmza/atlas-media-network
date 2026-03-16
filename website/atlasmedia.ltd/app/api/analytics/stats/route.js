import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const days = parseInt(searchParams.get("days") || "30");
    const db = getDb();
    await db.query(`CREATE TABLE IF NOT EXISTS public.pageviews (id TEXT PRIMARY KEY, publication_id TEXT, article_slug TEXT, article_id TEXT, referrer TEXT, user_agent TEXT, country TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    const pubFilter = publicationId ? `AND publication_id = '${publicationId}'` : "";

    const [totalViews, dailyViews, topArticles, topPublications, viewsByHour] = await Promise.all([
      db.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN created_at>NOW()-INTERVAL '1 day' THEN 1 END) as today, COUNT(CASE WHEN created_at>NOW()-INTERVAL '7 days' THEN 1 END) as week FROM public.pageviews WHERE created_at>NOW()-INTERVAL '${days} days' ${pubFilter}`),
      db.query(`SELECT DATE(created_at) as date, COUNT(*) as views FROM public.pageviews WHERE created_at>NOW()-INTERVAL '${days} days' ${pubFilter} GROUP BY DATE(created_at) ORDER BY date ASC`),
      db.query(`SELECT pv.article_slug, COUNT(*) as views, a.title, a.publication_name, a.author, a.category FROM public.pageviews pv LEFT JOIN public.articles a ON pv.article_slug=a.slug WHERE pv.created_at>NOW()-INTERVAL '${days} days' AND pv.article_slug IS NOT NULL ${pubFilter} GROUP BY pv.article_slug,a.title,a.publication_name,a.author,a.category ORDER BY views DESC LIMIT 10`),
      db.query(`SELECT pv.publication_id, COUNT(*) as views, p.name as publication_name FROM public.pageviews pv LEFT JOIN public.publications p ON pv.publication_id=p.id WHERE pv.created_at>NOW()-INTERVAL '${days} days' AND pv.publication_id IS NOT NULL GROUP BY pv.publication_id,p.name ORDER BY views DESC`),
      db.query(`SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as views FROM public.pageviews WHERE created_at>NOW()-INTERVAL '${days} days' ${pubFilter} GROUP BY hour ORDER BY hour ASC`)
    ]);

    return NextResponse.json({ ok: true, period: days, totals: totalViews.rows[0], dailyViews: dailyViews.rows, topArticles: topArticles.rows, topPublications: topPublications.rows, viewsByHour: viewsByHour.rows });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
