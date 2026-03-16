import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";
    const publications = ["argentina-post", "argentina-post-mendoza"];
    const results = [];

    for (const publicationId of publications) {
      try {
        const res = await fetch(`${baseUrl}/api/pipeline/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-atlas-admin-token": process.env.ATLAS_ADMIN_TOKEN
          },
          body: JSON.stringify({ publication: publicationId, triggeredBy: "cron" })
        });
        const data = await res.json();
        results.push({ publication: publicationId, ...data.stats, runId: data.runId });
        await new Promise(r => setTimeout(r, 5000));
      } catch (err) {
        results.push({ publication: publicationId, error: err.message });
      }
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
