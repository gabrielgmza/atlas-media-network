import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

async function getAtlasContext() {
  const db = getDb();
  try {
    const [pubs, runs, articles, memory, decisions] = await Promise.all([
      db.query(`SELECT id, name, scope, status FROM public.publications WHERE status = 'active' ORDER BY created_at`),
      db.query(`SELECT pr.*, p.name as pub_name FROM public.pipeline_runs pr LEFT JOIN public.publications p ON pr.publication_id = p.id ORDER BY pr.started_at DESC LIMIT 5`),
      db.query(`SELECT COUNT(*) as total, publication, status FROM public.articles GROUP BY publication, status`),
      db.query(`SELECT title, detail, priority, created_at FROM public.president_memory ORDER BY created_at DESC LIMIT 10`),
      db.query(`SELECT title, decision, status, created_at FROM public.president_decisions ORDER BY created_at DESC LIMIT 5`)
    ]);
    return { publications: pubs.rows, recentRuns: runs.rows, articleStats: articles.rows, recentMemory: memory.rows, recentDecisions: decisions.rows };
  } catch (err) {
    return { error: err.message };
  }
}

async function saveToMemory(db, title, detail) {
  const id = `mem-chat-${Date.now()}`;
  await db.query(
    `INSERT INTO public.president_memory (id, type, title, detail, priority, created_at, scope) VALUES ($1,'chat',$2,$3,'medium',NOW(),'global') ON CONFLICT (id) DO NOTHING`,
    [id, title, detail]
  );
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const founderMessage = body.message || "";
    const conversationHistory = body.history || [];
    if (!founderMessage.trim()) return NextResponse.json({ ok: false, error: "EMPTY_MESSAGE" }, { status: 400 });

    const ctx = await getAtlasContext();
    const pubList = ctx.publications?.map(p => `- ${p.name} (${p.scope}, ${p.status})`).join("\n") || "Sin datos";
    const runList = ctx.recentRuns?.map(r => `- ${r.pub_name}: ${r.status}, ${r.articles_published || 0} artículos (${new Date(r.started_at).toLocaleString("es-AR")})`).join("\n") || "Sin runs recientes";
    const articleList = ctx.articleStats?.map(a => `- ${a.publication}: ${a.total} artículos (${a.status})`).join("\n") || "Sin artículos";
    const memoryList = ctx.recentMemory?.map(m => `- [${m.priority}] ${m.title}: ${m.detail}`).join("\n") || "Sin memoria";
    const decisionList = ctx.recentDecisions?.map(d => `- ${d.title}: ${d.decision} (${d.status})`).join("\n") || "Sin decisiones";

    const systemPrompt = `Sos el AI President OS de Atlas Media Network, el sistema ejecutivo central del holding.

Tu rol es ser el interlocutor directo del Founder. Sos un CEO digital: estratégico, ejecutivo, directo. No sos un asistente ni un chatbot.

ESTADO ACTUAL DEL HOLDING:
Publicaciones activas:
${pubList}

Pipeline (últimos runs):
${runList}

Artículos en base de datos:
${articleList}

Memoria reciente:
${memoryList}

Decisiones recientes:
${decisionList}

REGLAS:
- Respondé siempre en español
- Sé conciso y ejecutivo
- Si el Founder da una instrucción operativa, indicá qué acción vas a ejecutar
- Si algo no está implementado, decilo directamente
- Nunca digas "Como AI..." — sos el President
- Usá párrafos cortos y listas cuando ayuden`;

    const messages = [...conversationHistory.slice(-10), { role: "user", content: founderMessage }];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages })
    });

    const data = await res.json();
    const reply = data.content?.find(b => b.type === "text")?.text || "Sin respuesta.";

    const db = getDb();
    if (founderMessage.length > 20) {
      await saveToMemory(db, `Founder: ${founderMessage.slice(0, 80)}`, reply.slice(0, 200)).catch(() => {});
    }

    return NextResponse.json({ ok: true, reply, context: { publications: ctx.publications?.length, recentRuns: ctx.recentRuns?.length } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
