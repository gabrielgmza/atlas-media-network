import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

function toCSV(rows, columns) {
  if (!rows.length) return columns.join(",") + "\n";
  const escape = v => { if (v===null||v===undefined) return ""; const s=String(v).replace(/"/g,'""'); return s.includes(",")||s.includes("\n")||s.includes('"')?`"${s}"`:s; };
  return columns.join(",") + "\n" + rows.map(row => columns.map(col => escape(row[col])).join(",")).join("\n");
}

const EXPORTS = {
  articles: {
    query: async (db, pub) => pub
      ? db.query(`SELECT id,title,excerpt,category,section,author,author_role,publication,publication_name,status,published_at,seo_title,source_url,ai_generated FROM public.articles WHERE status='published' AND publication=$1 ORDER BY published_at DESC`, [pub])
      : db.query(`SELECT id,title,excerpt,category,section,author,author_role,publication,publication_name,status,published_at,seo_title,source_url,ai_generated FROM public.articles WHERE status='published' ORDER BY published_at DESC`),
    columns: ["id","title","excerpt","category","section","author","author_role","publication","publication_name","status","published_at","seo_title","source_url","ai_generated"]
  },
  analytics: {
    query: async (db, pub) => pub
      ? db.query(`SELECT pv.article_slug,a.title,a.publication_name,a.category,a.author,COUNT(*) as views,MIN(pv.created_at) as first_view,MAX(pv.created_at) as last_view FROM public.pageviews pv LEFT JOIN public.articles a ON pv.article_slug=a.slug WHERE pv.publication_id=$1 AND pv.article_slug IS NOT NULL GROUP BY pv.article_slug,a.title,a.publication_name,a.category,a.author ORDER BY views DESC`, [pub])
      : db.query(`SELECT pv.article_slug,a.title,a.publication_name,a.category,a.author,COUNT(*) as views,MIN(pv.created_at) as first_view,MAX(pv.created_at) as last_view FROM public.pageviews pv LEFT JOIN public.articles a ON pv.article_slug=a.slug WHERE pv.article_slug IS NOT NULL GROUP BY pv.article_slug,a.title,a.publication_name,a.category,a.author ORDER BY views DESC`),
    columns: ["article_slug","title","publication_name","category","author","views","first_view","last_view"]
  },
  subscribers: {
    query: async (db, pub) => pub
      ? db.query(`SELECT ns.email,ns.publication_id,p.name as publication_name,ns.status,ns.created_at FROM public.newsletter_subscribers ns LEFT JOIN public.publications p ON ns.publication_id=p.id WHERE ns.publication_id=$1 AND ns.status='active' ORDER BY ns.created_at DESC`, [pub])
      : db.query(`SELECT ns.email,ns.publication_id,p.name as publication_name,ns.status,ns.created_at FROM public.newsletter_subscribers ns LEFT JOIN public.publications p ON ns.publication_id=p.id WHERE ns.status='active' ORDER BY ns.publication_id,ns.created_at DESC`),
    columns: ["email","publication_id","publication_name","status","created_at"]
  },
  advertisers: {
    query: async (db, pub) => pub
      ? db.query(`SELECT a.id,a.business_name,a.contact_email,a.contact_phone,a.status,a.notes,a.discovered_by,p.name as publication_name,a.created_at FROM public.advertisers a LEFT JOIN public.publications p ON a.publication_id=p.id WHERE a.publication_id=$1 ORDER BY a.created_at DESC`, [pub])
      : db.query(`SELECT a.id,a.business_name,a.contact_email,a.contact_phone,a.status,a.notes,a.discovered_by,p.name as publication_name,a.created_at FROM public.advertisers a LEFT JOIN public.publications p ON a.publication_id=p.id ORDER BY a.created_at DESC`),
    columns: ["id","business_name","contact_email","contact_phone","status","notes","discovered_by","publication_name","created_at"]
  },
  pipeline: {
    query: async (db, pub) => pub
      ? db.query(`SELECT pr.id,p.name as publication,pr.status,pr.triggered_by,pr.articles_attempted,pr.articles_published,pr.articles_failed,pr.started_at,pr.finished_at,pr.error_log FROM public.pipeline_runs pr LEFT JOIN public.publications p ON pr.publication_id=p.id WHERE pr.publication_id=$1 ORDER BY pr.started_at DESC`, [pub])
      : db.query(`SELECT pr.id,p.name as publication,pr.status,pr.triggered_by,pr.articles_attempted,pr.articles_published,pr.articles_failed,pr.started_at,pr.finished_at,pr.error_log FROM public.pipeline_runs pr LEFT JOIN public.publications p ON pr.publication_id=p.id ORDER BY pr.started_at DESC`),
    columns: ["id","publication","status","triggered_by","articles_attempted","articles_published","articles_failed","started_at","finished_at","error_log"]
  },
  comments: {
    query: async (db, pub) => pub
      ? db.query(`SELECT c.id,c.author_name,c.author_email,c.content,c.status,c.moderation_score,c.article_slug,a.title as article_title,c.created_at FROM public.comments c LEFT JOIN public.articles a ON c.article_slug=a.slug WHERE c.publication_id=$1 ORDER BY c.created_at DESC`, [pub])
      : db.query(`SELECT c.id,c.author_name,c.author_email,c.content,c.status,c.moderation_score,c.article_slug,a.title as article_title,c.created_at FROM public.comments c LEFT JOIN public.articles a ON c.article_slug=a.slug ORDER BY c.created_at DESC`),
    columns: ["id","author_name","author_email","content","status","moderation_score","article_slug","article_title","created_at"]
  }
};

export async function GET(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const publicationId = searchParams.get("publication") || null;
    if (!type) return NextResponse.json({ ok: true, exports: Object.entries(EXPORTS).map(([key]) => ({ key })) });
    const exportDef = EXPORTS[type];
    if (!exportDef) return NextResponse.json({ ok: false, error: "INVALID_TYPE" }, { status: 400 });
    const db = getDb();
    const result = await exportDef.query(db, publicationId);
    const csv = toCSV(result.rows, exportDef.columns);
    const filename = "atlas-" + type + (publicationId?"-"+publicationId:"") + "-" + new Date().toISOString().slice(0,10) + ".csv";
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"" + filename + "\"", "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
