import { NextResponse } from "next/server";
import { createPresidentMemory, getPresidentMemory } from "../../../../lib/atlas-president";

function makeId() {
  return `mem-${Date.now()}`;
}

export async function GET() {
  const memory = await getPresidentMemory();
  return NextResponse.json({
    ok: true,
    total: memory.length,
    memory
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

    const item = await createPresidentMemory({
      id: makeId(),
      type: body.type || "note",
      title: body.title,
      detail: body.detail,
      priority: body.priority || "medium",
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "CREATE_MEMORY_FAILED" },
      { status: 500 }
    );
  }
}
