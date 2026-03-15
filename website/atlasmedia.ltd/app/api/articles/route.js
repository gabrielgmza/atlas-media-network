import { NextResponse } from "next/server";
import { createArticle, getAllArticles } from "../../../lib/articles";
import { getJournalistById } from "../../../lib/atlas-config";

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

export async function GET() {
  const articles = await getAllArticles();

  return NextResponse.json({
    ok: true,
    total: articles.length,
    articles
  });
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

    const article = await createArticle({
      id: makeId(body.publication),
      slug: body.slug ? slugify(body.slug) : slugify(body.title),
      publication: body.publication,
      title: body.title,
      excerpt: body.excerpt,
      category: body.category,
      author: journalist ? journalist.signature : body.author,
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
