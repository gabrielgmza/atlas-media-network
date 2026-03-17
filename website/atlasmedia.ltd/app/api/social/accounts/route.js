import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { ensureSocialTables, createSocialSetupPlan, analyzeSocialNeeds, PLATFORM_INFO } from "../../../../lib/social-director";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const publicationId = searchParams.get("publication");
    const db = getDb(); await ensureSocialTables();
    const query = publicationId
      ? `SELECT sa.*, p.name as publication_name FROM public.social_accounts sa LEFT JOIN public.publications p ON sa.publication_id=p.id WHERE sa.publication_id=$1 ORDER BY sa.platform`
      : `SELECT sa.*, p.name as publication_name FROM public.social_accounts sa LEFT JOIN public.publications p ON sa.publication_id=p.id ORDER BY p.name, sa.platform`;
    const result = publicationId ? await db.query(query, [publicationId]) : await db.query(query);
    const stats = await db.query(`SELECT platform, status, COUNT(*) as count FROM public.social_accounts GROUP BY platform, status`);
    return NextResponse.json({ ok: true, accounts: result.rows, stats: stats.rows, platforms: PLATFORM_INFO });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const { action, publicationId, platform, credentials, accountName, handle } = body;
    const db = getDb(); await ensureSocialTables();

    if (action === "analyze") {
      const pub = await db.query(`SELECT p.*, t.name as territory_name FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.id=$1`, [publicationId]);
      if (!pub.rows.length) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      const analysis = await analyzeSocialNeeds(pub.rows[0]);
      return NextResponse.json({ ok: true, ...analysis });
    }

    if (action === "setup_plan") {
      const pub = await db.query(`SELECT p.*, t.name as territory_name FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.id=$1`, [publicationId]);
      if (!pub.rows.length) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      const result = await createSocialSetupPlan(pub.rows[0], pub.rows[0].territory_name || "Argentina");
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "save_credentials") {
      if (!publicationId || !platform || !credentials) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
      const id = "soc-" + platform + "-" + publicationId;
      await db.query(`INSERT INTO public.social_accounts (id,publication_id,platform,account_name,handle,status,credentials) VALUES ($1,$2,$3,$4,$5,'active',$6) ON CONFLICT (publication_id,platform) DO UPDATE SET credentials=$6,status='active',account_name=COALESCE($4,account_name),handle=COALESCE($5,handle)`, [id, publicationId, platform, accountName||null, handle||null, JSON.stringify(credentials)]);
      return NextResponse.json({ ok: true, message: platform + " activado para " + publicationId });
    }

    if (action === "toggle") {
      const current = await db.query(`SELECT status FROM public.social_accounts WHERE publication_id=$1 AND platform=$2`, [publicationId, platform]);
      const newStatus = current.rows[0]?.status === "active" ? "paused" : "active";
      await db.query(`UPDATE public.social_accounts SET status=$1 WHERE publication_id=$2 AND platform=$3`, [newStatus, publicationId, platform]);
      return NextResponse.json({ ok: true, status: newStatus });
    }

    return NextResponse.json({ ok: false, error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}

export async function DELETE(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const db = getDb();
    await db.query(`DELETE FROM public.social_accounts WHERE publication_id=$1 AND platform=$2`, [searchParams.get("publication"), searchParams.get("platform")]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); }
}
