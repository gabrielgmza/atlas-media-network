import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminToken = request.headers.get("x-atlas-admin-token");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && adminToken !== process.env.ATLAS_ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const db = getDb();
    const pubs = await db.query(`SELECT p.*, t.name as territory_name, t.type as territory_type FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.status='active'`);
    const results = [];

    for (const pub of pubs.rows) {
      try {
        const prompt = `Sos el AI Advertiser Discovery de Atlas Media Network. Identificá 5 tipos de negocios locales que serían buenos anunciantes para:
Medio: ${pub.name}
Territorio: ${pub.territory_name} (${pub.territory_type})

Respondé SOLO en JSON válido sin markdown:
{"prospects":[{"businessName":"nombre","category":"categoría","rationale":"por qué en 1 oración","estimatedBudget":"rango USD/mes","contactStrategy":"cómo contactarlos"}]}`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, messages: [{ role: "user", content: prompt }] })
        });
        const data = await res.json();
        const text = data.content?.find(b => b.type === "text")?.text || "";
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

        let saved = 0;
        for (const prospect of (parsed.prospects || [])) {
          const id = `adv-ai-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
          await db.query(
            `INSERT INTO public.advertisers (id,publication_id,territory_id,business_name,notes,status,discovered_by) VALUES ($1,$2,$3,$4,$5,'prospect','ai') ON CONFLICT DO NOTHING`,
            [id, pub.id, pub.territory_id||null, prospect.businessName, `${prospect.rationale} | Budget: ${prospect.estimatedBudget} | Contacto: ${prospect.contactStrategy}`]
          );
          saved++;
        }

        await db.query(
          `INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'monetization',$2,$3,'medium',NOW(),'global')`,
          [`mem-adv-${Date.now()}`, `Prospectos detectados: ${pub.name}`, `${saved} prospectos para ${pub.territory_name}. Sectores: ${parsed.prospects?.map(p=>p.category).join(", ")}`]
        );

        results.push({ publication: pub.name, prospectsFound: saved });
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        results.push({ publication: pub.name, error: err.message });
      }
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
