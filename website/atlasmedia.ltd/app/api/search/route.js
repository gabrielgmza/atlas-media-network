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
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    if (!query && !publication && !category) {
      return NextResponse.json({ ok: false, error: "MISSING_QUERY" }, { status: 400 });
    }

    const db = getDb();
    const conditions = ["a.status = 'published'"];
    const params = [];
    let paramIdx = 1;

    if (query) {
      conditions.push("(to_tsvector('spanish', coalesce(a.title,'') || ' ' || coalesce(a.excerpt,'') || ' ' || coalesce(a.category,'')) @@ plainto_tsquery('spanish', $" + paramIdx + ") OR lower(a.title) LIKE lower($" + (paramIdx+1) + ") OR lower(a.excerpt) LIKE lower($" + (paramIdx+1) + "))");
      params.push(query, "%" + query + "%");
      paramIdx += 2;
    }
    if (publication) { conditions.push("a.publication = $" + paramIdx); params.push(publication); paramIdx++; }
    if (category) { conditions.push("lower(a.category) = lower($" + paramIdx + ")"); params.push(category); paramIdx++; }

    const whereClause = "WHERE " + conditions.join(" AND ");
    const orderClause = query ? "ORDER BY ts_rank(to_tsvector('spanish', coalesce(a.title,'') || ' ' || coalesce(a.excerpt,'')), plainto_tsquery('spanish', $1)) DESC, a.published_at DESC NULLS LAST" : "ORDER BY a.published_at DESC NULLS LAST";

    const countResult = await db.query("SELECT COUNT(*) as total FROM public.articles a " + whereClause, params);
    const articlesResult = await db.query("SELECT a.id, a.slug, a.title, a.excerpt, a.category, a.section, a.author, a.author_role, a.publication, a.publication_name, a.image_thumb, a.published_at, a.tone FROM public.articles a " + whereClause + " " + orderClause + " LIMIT $" + paramIdx + " OFFSET $" + (paramIdx+1), [...params, limit, offset]);

    const total = parseInt(countResult.rows[0]?.total || 0);
    return NextResponse.json({ ok: true, query, total, page, pages: Math.ceil(total / limit), results: articlesResult.rows });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
