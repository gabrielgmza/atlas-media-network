import { NextResponse } from "next/server";
import { atlasPublications, getJournalistsByPublication } from "../../../../lib/atlas-config";
import { saveEditorialBrief } from "../../../../lib/editorial-director";

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const publicationId = body.publication;
    const context = body.context || "";

    const publication = atlasPublications.find((p) => p.id === publicationId);
    if (!publication) {
      return NextResponse.json({ ok: false, error: "PUBLICATION_NOT_FOUND" }, { status: 400 });
    }

    const journalists = getJournalistsByPublication(publicationId);
    const journalistsText = journalists
      .map((j) => `- ${j.name} (${j.role}) — estilo: ${j.style}, tono: ${j.tone}`)
      .join("\n");
    const categoriesText = publication.categories.join(", ");

    const prompt = `Eres el AI Editorial Director de Atlas Media Network, un holding de medios digitales.

Publicación: ${publication.name} (${publication.scope})
Categorías disponibles: ${categoriesText}
Periodistas disponibles:
${journalistsText}

${context ? `Contexto adicional del editor: ${context}` : ""}

Tu tarea: Genera 5 sugerencias de artículos periodísticos para publicar hoy. Para cada uno:
- Propone un título concreto y atractivo
- Indica la categoría
- Asigna el periodista más adecuado (usa exactamente el nombre como aparece arriba)
- Explica en 1 oración por qué ese periodista es el indicado
- Sugiere el tono del artículo
- Escribe un brief editorial de 2-3 oraciones describiendo el ángulo y enfoque

Responde SOLO en JSON válido, sin markdown, sin texto adicional, con este formato exacto:
{
  "suggestions": [
    {
      "title": "...",
      "category": "...",
      "journalist": "nombre exacto",
      "journalistId": "id del periodista",
      "journalistReason": "...",
      "tone": "...",
      "brief": "..."
    }
  ]
}

Los journalistId deben ser exactamente: ${journalists.map((j) => j.id).join(", ")}`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!anthropicResponse.ok) {
      const err = await anthropicResponse.text();
      return NextResponse.json({ ok: false, error: "CLAUDE_API_ERROR", detail: err }, { status: 500 });
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = anthropicData.content?.find((b) => b.type === "text")?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      return NextResponse.json({ ok: false, error: "PARSE_ERROR", raw: rawText }, { status: 500 });
    }

    const savedBriefs = [];
    for (const s of parsed.suggestions) {
      try {
        const saved = await saveEditorialBrief({
          id: `brief-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          publication: publicationId,
          publicationName: publication.name,
          title: s.title,
          category: s.category,
          journalistId: s.journalistId,
          journalist: s.journalist,
          journalistReason: s.journalistReason,
          tone: s.tone,
          brief: s.brief,
          status: "suggested",
          createdAt: new Date().toISOString()
        });
        savedBriefs.push(saved);
      } catch {
        savedBriefs.push(s);
      }
    }

    return NextResponse.json({ ok: true, publication: publication.name, suggestions: savedBriefs });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "SUGGEST_FAILED" }, { status: 500 });
  }
}
