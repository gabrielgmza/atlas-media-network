import { NextResponse } from "next/server";
import { getArticleById } from "../../../../lib/articles";

export async function GET(_request, { params }) {
  const article = getArticleById(params.id);

  if (!article) {
    return NextResponse.json(
      { ok: false, error: "ARTICLE_NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, article });
}
