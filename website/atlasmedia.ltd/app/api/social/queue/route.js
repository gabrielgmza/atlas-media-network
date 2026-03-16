import { NextResponse } from "next/server";
import { getPendingSocialPosts, getSocialStats, markPostPublished } from "../../../../lib/social";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication") || "argentina-post";
    const [posts, stats] = await Promise.all([getPendingSocialPosts(publicationId), getSocialStats(publicationId)]);
    const summary = {};
    for (const row of stats) {
      if (!summary[row.platform]) summary[row.platform] = { pending:0, published:0, failed:0 };
      summary[row.platform][row.status] = parseInt(row.total);
    }
    return NextResponse.json({ ok: true, posts, stats: summary });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const { postId } = await request.json();
    await markPostPublished(postId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
