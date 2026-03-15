import { NextResponse } from "next/server";
import { createPresidentDecision, getPresidentDecisions } from "../../../../lib/atlas-president";

function makeId() {
  return `dec-${Date.now()}`;
}

export async function GET() {
  const decisions = await getPresidentDecisions();
  return NextResponse.json({
    ok: true,
    total: decisions.length,
    decisions
  });
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;

    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const item = await createPresidentDecision({
      id: makeId(),
      title: body.title,
      decision: body.decision,
      rationale: body.rationale || "",
      status: body.status || "approved",
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "CREATE_DECISION_FAILED" },
      { status: 500 }
    );
  }
}
