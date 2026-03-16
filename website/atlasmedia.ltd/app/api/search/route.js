import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const publication = searchParams.get("publication") || null;
    const category = searchParams.get("category") || null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    if (!query && !publication && !category) return NextResponse.json({ ok: false, error: "MISSING_QUERY" }, { status: 400 });

    const db = getDb();
    const conditions = ["a.status = 'published'"];
    const params = []; let idx = 1;

    if (query) {
      conditions.push("(to_tsvector('spanish', coalesce(a.title,'') || ' ' || coalesce(a.excerpt,'') || ' ' || coalesce(a.category,'') || ' ' || coalesce(a.author,'')) @@ plainto_tsquery('spanish', $"+idx+") OR lower(a.title) LIKE lower($"+(idx+1)+") OR lower(a.author) LIKE lower($"+(idx+1)+"))");
      params.push(query, "%"+query+"%"); idx += 2;
    }
    if (publication) { conditions.push("a.publication = $"+idx); params.push(publication); idx++; }
    if (category) { conditions.push("lower(a.category) = lower($"+idx)"); params.push(category); idx++; }

    const where = "WHERE " + conditions.join(" AND ");
    const order = query
      ? "ORDER BY ts_rank(to_tsvector('spanish', coalesce(a.title,'') || ' ' || coalesce(a.excerpt,'') || ' ' || coalesce(a.author,'')), plainto_tsquery('spanish', $1)) DESC, a.published_at DESC NULLS LAST"
      : "ORDER BY a.published_at DESC NULLS LAST";

    const [countResult, articlesResult] = await Promise.all([
      db.query("SELECT COUNT(*) as total FROM public.articles a " + where, params),
      db.query("SELECT a.id,a.slug,a.title,a.excerpt,a.category,a.author,a.author_role,a.publication,a.publication_name,a.image_thumb,a.published_at FROM public.articles a " + where + " " + order + " LIMIT $"+idx+" OFFSET $"+(idx+1), [...params, limit, offset])
    ]);

    const total = parseInt(countResult.rows[0]?.total || 0);
    let suggestions = null;
    if (total === 0 && query) {
      const [popular, related] = await Promise.all([
        db.query("SELECT slug,title,category,publication_name FROM public.articles WHERE status='published' ORDER BY published_at DESC LIMIT 5"),
        db.query("SELECT DISTINCT category FROM public.articles WHERE status='published' AND category IS NOT NULL AND lower(category) LIKE lower($1) LIMIT 5", ["%"+query.split(" ")[0]+"%"])
      ]);
      suggestions = { popularArticles: popular.rows, relatedCategories: related.rows.map(r=>r.category) };
    }

    let journalists = [];
    if (query && total < 5) {
      const jResult = await db.query("SELECT j.id,j.name,j.role,j.beat,p.name as publication_name,p.slug as publication_slug FROM public.journalists j LEFT JOIN public.publications p ON j.publication_id=p.id WHERE j.active=true AND (lower(j.name) LIKE lower($1) OR lower(j.beat) LIKE lower($1)) LIMIT 3", ["%"+query+"%"]);
      journalists = jResult.rows;
    }

    return NextResponse.json({ ok: true, query, total, page, pages: Math.ceil(total/limit), results: articlesResult.rows, journalists, suggestions });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
