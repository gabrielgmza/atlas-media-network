import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const body = await request.json();
    const { territoryName, territoryType, country, parentPublication } = body;
    if (!territoryName || !territoryType) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });

    const prompt = `Sos el AI Expansion Director de Atlas Media Network. El Founder quiere lanzar un nuevo medio digital para: ${territoryName} (${territoryType}, ${country || "Argentina"}). Medio padre: ${parentPublication || "ninguno"}.

Diseñá el nuevo medio. Respondé SOLO en JSON válido sin markdown:
{"publicationName":"nombre del medio","publicationSlug":"slug-del-medio","tagline":"subtítulo en 1 oración","editorialLine":"línea editorial en 2-3 oraciones","marketAnalysis":"análisis del mercado en 2-3 oraciones","categories":[{"name":"Nombre","slug":"nombre"}],"journalists":[{"name":"Nombre Apellido","role":"rol","beat":"área","style":"estilo","tone":"tono","personality":"personalidad","signature":"Nombre Apellido"}],"newsSources":[{"name":"Fuente","type":"rss","url":"https://...","categoryHint":"categoría","priority":8}],"monetizationNotes":"observaciones monetización","expansionPriority":"high/medium/low","estimatedMonthlyVisitors":"rango estimado"}

Incluí 3-5 periodistas con personalidades distintas y humanas, 5-8 categorías relevantes para ese territorio, 3-5 fuentes RSS reales.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: prompt }] })
    });
    const data = await res.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const analysis = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ ok: true, territory: territoryName, analysis });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
