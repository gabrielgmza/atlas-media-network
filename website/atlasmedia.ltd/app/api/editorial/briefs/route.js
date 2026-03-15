import { NextResponse } from "next/server";
import { getEditorialBriefs, updateEditorialBriefStatus } from "../../../../lib/editorial-director";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publication = searchParams.get("publication") || null;
    const briefs = await getEditorialBriefs(publication);
    return NextResponse.json({ ok: true, total: briefs.length, briefs });
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
    const body = await request.json();
    const updated = await updateEditorialBriefStatus(body.id, body.status);
    return NextResponse.json({ ok: true, brief: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
