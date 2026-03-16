import { NextResponse } from "next/server";
import { createArticle, getAllArticles } from "../../../lib/articles";
import { atlasPublications, getJournalistById } from "../../../lib/atlas-config";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeId(publication) {
  const prefix = publication === "argentina-post-mendoza" ? "apm" : "ap";
  return `${prefix}-${Date.now()}`;
}

function getPublicationName(publicationId) {
  return atlasPublications.find((p) => p.id === publicationId)?.name || publicationId;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "recent";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "18");
    const offset = (page - 1) * limit;
    const { getDb } = await import("../../../lib/db");
    const db = getDb();
    const conditions = ["status='published'"];
    const params = [];
    if (publicationId) { params.push(publicationId); conditions.push("publication=$" + params.length); }
    if (category) { params.push(category); conditions.push("lower(category)=lower($" + params.length + ")"); }
    const where = "WHERE " + conditions.join(" AND ");
    const order = sort === "oldest" ? "ORDER BY published_at ASC" : "ORDER BY published_at DESC";
    const [articlesResult, countResult] = await Promise.all([
      db.query("SELECT id,slug,title,excerpt,category,author,author_role,publication,publication_name,published_at,image_url,image_thumb FROM public.articles " + where + " " + order + " LIMIT $" + (params.length+1) + " OFFSET $" + (params.length+2), [...params, limit, offset]),
      db.query("SELECT COUNT(*) as total FROM public.articles " + where, params)
    ]);
    const total = parseInt(countResult.rows[0].total);
    return NextResponse.json({ ok: true, articles: articlesResult.rows, total, page, pages: Math.ceil(total/limit) });
  } catch {
    const articles = await getAllArticles();
    return NextResponse.json({ ok: true, total: articles.length, articles, pages: 1 });
  }
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;

    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const journalist = body.authorId ? getJournalistById(body.authorId) : null;

    const publicationName = getPublicationName(body.publication);

    const article = await createArticle({
      id: makeId(body.publication),
      slug: body.slug ? slugify(body.slug) : slugify(body.title),
      publication: body.publication,
      publicationName,
      title: body.title,
      excerpt: body.excerpt,
      category: body.category,
      section: body.section || body.category,
      author: journalist ? journalist.signature : body.author,
      authorId: journalist ? journalist.id : null,
      authorRole: journalist ? journalist.role : null,
      tone: journalist ? journalist.tone : null,
      status: body.status || "published",
      seoTitle: body.seoTitle || body.title,
      seoDescription: body.seoDescription || body.excerpt,
      publishedAt: body.publishedAt || new Date().toISOString(),
      content: Array.isArray(body.content) ? body.content : []
    });

    return NextResponse.json({ ok: true, article }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "CREATE_ARTICLE_FAILED" },
      { status: 500 }
    );
  }
}
