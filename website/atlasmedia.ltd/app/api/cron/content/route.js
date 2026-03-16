import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const db = getDb();
    const pubs = await db.query(`SELECT id FROM public.publications WHERE status='active'`);
    const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";
    const results = [];
    for (const pub of pubs.rows) {
      try {
        const res = await fetch(BASE_URL + "/api/content", { method: "POST", headers: { "Content-Type": "application/json", "x-atlas-admin-token": process.env.ATLAS_ADMIN_TOKEN }, body: JSON.stringify({ publicationId: pub.id, contentType: "both" }) });
        const data = await res.json();
        results.push({ publication: pub.id, ...data });
        await new Promise(r => setTimeout(r, 5000));
      } catch (err) { results.push({ publication: pub.id, error: err.message }); }
    }
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
