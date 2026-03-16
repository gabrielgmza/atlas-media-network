import { NextResponse } from "next/server";
import { getActiveAds, recordImpression } from "../../../../lib/monetization";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication") || "argentina-post";
    const position = searchParams.get("position") || null;
    const articleSlug = searchParams.get("slug") || null;
    const ads = await getActiveAds(publicationId, position);
    for (const ad of ads) {
      await recordImpression(ad.id, publicationId, articleSlug);
    }
    return NextResponse.json({ ok: true, ads });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
