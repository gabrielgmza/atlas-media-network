import { NextResponse } from "next/server";
import { generateSocialContent, saveSocialPosts } from "../../../../lib/social";

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const body = await request.json();
    const { articleId, publicationId, title, excerpt, content, author, category, publication, slug, journalist } = body;
    if (!title || !publicationId) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";
    const articleUrl = slug ? `${baseUrl}/noticias/${slug}` : baseUrl;

    const posts = await generateSocialContent({ title, excerpt, content, author, category, publication, articleUrl, journalist });
    const saved = await saveSocialPosts({ articleId, publicationId, posts });

    return NextResponse.json({ ok: true, articleId, postsGenerated: saved.length, posts: saved });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
