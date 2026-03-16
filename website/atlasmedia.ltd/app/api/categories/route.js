import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;
    const db = getDb();

    if (!category) {
      const query = publicationId
        ? `SELECT category, COUNT(*) as count FROM public.articles WHERE publication=$1 AND status='published' AND category IS NOT NULL GROUP BY category ORDER BY count DESC`
        : `SELECT category, COUNT(*) as count FROM public.articles WHERE status='published' AND category IS NOT NULL GROUP BY category ORDER BY count DESC`;
      const result = publicationId ? await db.query(query, [publicationId]) : await db.query(query);
      return NextResponse.json({ ok: true, categories: result.rows });
    }

    const whereClause = publicationId
      ? "WHERE a.publication=$1 AND a.status='published' AND lower(a.category)=lower($2)"
      : "WHERE a.status='published' AND lower(a.category)=lower($1)";
    const params = publicationId ? [publicationId, category] : [category];

    const [articles, total, pubInfo] = await Promise.all([
      db.query("SELECT a.id,a.slug,a.title,a.excerpt,a.category,a.author,a.author_role,a.publication,a.publication_name,a.published_at,a.image_url,a.image_thumb FROM public.articles a " + whereClause + " ORDER BY a.published_at DESC LIMIT $" + (params.length+1) + " OFFSET $" + (params.length+2), [...params, limit, offset]),
      db.query("SELECT COUNT(*) as total FROM public.articles a " + whereClause, params),
      publicationId ? db.query(`SELECT p.*, t.name as territory_name FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.id=$1`, [publicationId]) : Promise.resolve({ rows: [] })
    ]);

    return NextResponse.json({ ok: true, category, articles: articles.rows, total: parseInt(total.rows[0].total), page, pages: Math.ceil(parseInt(total.rows[0].total)/limit), publication: pubInfo.rows[0]||null });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
