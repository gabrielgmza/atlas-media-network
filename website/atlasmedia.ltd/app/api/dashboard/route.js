import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  try {
    const [publications, articleStats, recentArticles, pipelineRuns, recentMemory, journalists, sources] = await Promise.all([
      db.query(`SELECT p.*, t.name as territory_name, (SELECT COUNT(*) FROM public.journalists j WHERE j.publication_id=p.id) as journalist_count, (SELECT COUNT(*) FROM public.articles a WHERE a.publication=p.id AND a.status='published') as article_count, (SELECT COUNT(*) FROM public.pipeline_runs pr WHERE pr.publication_id=p.id) as run_count, (SELECT started_at FROM public.pipeline_runs pr WHERE pr.publication_id=p.id ORDER BY started_at DESC LIMIT 1) as last_run FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id ORDER BY p.created_at`),
      db.query(`SELECT publication, status, COUNT(*) as total FROM public.articles GROUP BY publication, status`),
      db.query(`SELECT a.id, a.title, a.publication, a.publication_name, a.author, a.category, a.published_at, a.ai_generated FROM public.articles a WHERE a.status='published' ORDER BY a.published_at DESC NULLS LAST LIMIT 10`),
      db.query(`SELECT pr.*, p.name as pub_name FROM public.pipeline_runs pr LEFT JOIN public.publications p ON pr.publication_id=p.id ORDER BY pr.started_at DESC LIMIT 10`),
      db.query(`SELECT type, title, detail, priority, created_at FROM public.president_memory ORDER BY created_at DESC LIMIT 8`),
      db.query(`SELECT COUNT(*) as total FROM public.journalists WHERE status='active'`),
      db.query(`SELECT COUNT(*) as total FROM public.news_sources WHERE active=true`)
    ]);

    const totalArticles = articleStats.rows.reduce((sum,r) => sum+parseInt(r.total), 0);
    const publishedArticles = articleStats.rows.filter(r=>r.status==='published').reduce((sum,r) => sum+parseInt(r.total), 0);
    const completedRuns = pipelineRuns.rows.filter(r=>r.status==='completed').length;
    const lastSuccessfulRun = pipelineRuns.rows.find(r=>r.status==='completed');

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      holding: { name: "Atlas Media Network", status: "operational", publications: publications.rows.length, journalists: parseInt(journalists.rows[0]?.total||0), sources: parseInt(sources.rows[0]?.total||0), totalArticles, publishedArticles, completedRuns, lastRun: lastSuccessfulRun?.started_at||null },
      publications: publications.rows,
      recentArticles: recentArticles.rows,
      pipelineRuns: pipelineRuns.rows,
      recentMemory: recentMemory.rows
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
