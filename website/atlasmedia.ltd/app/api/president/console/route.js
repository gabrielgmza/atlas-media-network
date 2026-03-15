import { NextResponse } from "next/server";
import {
  createPresidentMemory,
  createPresidentDecision,
  getPresidentMemory,
  getPresidentDecisions
} from "../../../../lib/atlas-president";

function makeId(prefix) {
  return `${prefix}-${Date.now()}`;
}

export async function GET() {
  const memory = await getPresidentMemory();
  const decisions = await getPresidentDecisions();

  return NextResponse.json({
    ok: true,
    memory,
    decisions
  });
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;

    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();

    if (body.kind === "memory") {
      const item = await createPresidentMemory({
        id: makeId("mem"),
        type: body.type || "note",
        title: body.title,
        detail: body.detail,
        priority: body.priority || "medium",
        createdAt: new Date().toISOString()
      });

      return NextResponse.json({ ok: true, kind: "memory", item }, { status: 201 });
    }

    if (body.kind === "decision") {
      const item = await createPresidentDecision({
        id: makeId("dec"),
        title: body.title,
        decision: body.decision,
        rationale: body.rationale || "",
        status: body.status || "approved",
        createdAt: new Date().toISOString()
      });

      return NextResponse.json({ ok: true, kind: "decision", item }, { status: 201 });
    }

    return NextResponse.json({ ok: false, error: "INVALID_KIND" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "PRESIDENT_CONSOLE_FAILED" },
      { status: 500 }
    );
  }
}
