import { NextResponse } from "next/server";
import { processPendingPosts } from "../../../../lib/social-director";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminToken = request.headers.get("x-atlas-admin-token");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET && adminToken !== process.env.ATLAS_ADMIN_TOKEN) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const results = await processPendingPosts();
    const published = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok && r.reason !== "account_not_active").length;
    const skipped = results.filter(r => r.reason === "account_not_active").length;
    return NextResponse.json({ ok: true, published, failed, skipped, results });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
