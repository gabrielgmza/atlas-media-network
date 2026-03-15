import { NextResponse } from "next/server";
import { updateArticleWorkflow } from "../../../../lib/articles";

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;

    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();

    const article = await updateArticleWorkflow({
      id: body.id,
      status: body.status,
      reviewStatus: body.reviewStatus,
      assignedEditor: body.assignedEditor,
      publishAt: body.publishAt || null,
      updatedAt: new Date().toISOString()
    });

    if (!article) {
      return NextResponse.json({ ok: false, error: "ARTICLE_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, article });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "WORKFLOW_UPDATE_FAILED" },
      { status: 500 }
    );
  }
}
