import { NextResponse } from "next/server";
import { getAllArticles } from "../../../lib/articles";

export async function GET() {
  return NextResponse.json({
    ok: true,
    total: getAllArticles().length,
    articles: getAllArticles()
  });
}
