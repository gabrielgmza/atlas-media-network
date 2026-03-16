import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";
const ADMIN_TOKEN = process.env.ATLAS_ADMIN_TOKEN || "";

async function getAtlasContext() {
  const db = getDb();
  try {
    const [pubs, runs, articles, memory, decisions, subscribers, adStats] = await Promise.all([
      db.query(`SELECT id, name, scope, status FROM public.publications WHERE status='active' ORDER BY created_at`),
      db.query(`SELECT pr.*, p.name as pub_name FROM public.pipeline_runs pr LEFT JOIN public.publications p ON pr.publication_id=p.id ORDER BY pr.started_at DESC LIMIT 5`),
      db.query(`SELECT COUNT(*) as total, publication, status FROM public.articles GROUP BY publication, status`),
      db.query(`SELECT title, detail, priority, created_at FROM public.president_memory ORDER BY created_at DESC LIMIT 10`),
      db.query(`SELECT title, decision, status, created_at FROM public.president_decisions ORDER BY created_at DESC LIMIT 5`),
      db.query(`SELECT publication_id, COUNT(*) as total FROM public.newsletter_subscribers WHERE status='active' GROUP BY publication_id`).catch(() => ({ rows: [] })),
      db.query(`SELECT COUNT(*) as prospects FROM public.advertisers WHERE status='prospect'`).catch(() => ({ rows: [{ prospects: 0 }] }))
    ]);
    return { publications: pubs.rows, recentRuns: runs.rows, articleStats: articles.rows, recentMemory: memory.rows, recentDecisions: decisions.rows, subscribers: subscribers.rows, adStats: adStats.rows[0] };
  } catch (err) {
    return { error: err.message };
  }
}

async function executeAction(toolName, toolInput) {
  const headers = { "Content-Type": "application/json", "x-atlas-admin-token": ADMIN_TOKEN, "authorization": "Bearer " + process.env.CRON_SECRET };
  try {
    switch (toolName) {
      case "run_pipeline": {
        const res = await fetch(BASE_URL + "/api/pipeline/run", { method: "POST", headers, body: JSON.stringify({ publication: toolInput.publication, triggeredBy: "president" }) });
        const data = await res.json();
        return data.ok ? "Pipeline ejecutado para " + toolInput.publication + ". " + (data.stats?.published || 0) + " articulos publicados, " + (data.stats?.failed || 0) + " fallidos." : "Error en pipeline: " + data.error;
      }
      case "launch_expansion": {
        const analyzeRes = await fetch(BASE_URL + "/api/expansion/analyze", { method: "POST", headers, body: JSON.stringify({ territoryName: toolInput.territory, territoryType: toolInput.type || "city", country: toolInput.country || "Argentina", parentPublication: toolInput.parentPublication || null }) });
        const analyzeData = await analyzeRes.json();
        if (!analyzeData.ok) return "Error en analisis: " + analyzeData.error;
        const launchRes = await fetch(BASE_URL + "/api/expansion/launch", { method: "POST", headers, body: JSON.stringify({ territoryName: toolInput.territory, territoryType: toolInput.type || "city", country: toolInput.country || "Argentina", parentPublicationId: toolInput.parentPublication || null, analysis: analyzeData.analysis }) });
        const launchData = await launchRes.json();
        return launchData.ok ? "Medio lanzado: " + analyzeData.analysis.publicationName + ". " + (launchData.results?.journalists?.length || 0) + " periodistas, " + (launchData.results?.categories?.length || 0) + " categorias creadas." : "Error al lanzar: " + launchData.error;
      }
      case "send_newsletter": {
        const res = await fetch(BASE_URL + "/api/newsletter/send", { method: "POST", headers, body: JSON.stringify({ publication: toolInput.publication }) });
        const data = await res.json();
        return data.ok ? "Newsletter enviado para " + toolInput.publication + ". " + data.sent + " emails. Asunto: " + data.subject : "Error: " + data.error;
      }
      case "get_analytics": {
        const params = new URLSearchParams({ days: toolInput.days || 30 });
        if (toolInput.publication) params.append("publication", toolInput.publication);
        const res = await fetch(BASE_URL + "/api/analytics/stats?" + params, { headers });
        const data = await res.json();
        if (!data.ok) return "Error analytics: " + data.error;
        const top = data.topArticles?.slice(0, 3).map(a => a.title + " (" + a.views + " vistas)").join(", ");
        return "Analytics (" + (toolInput.days || 30) + "d): " + data.totals?.total + " vistas totales, " + data.totals?.today + " hoy. Top: " + (top || "sin datos");
      }
      case "register_decision": {
        const db = getDb();
        const id = "dec-pres-" + Date.now();
        await db.query(`INSERT INTO public.president_decisions (id,title,decision,rationale,status,created_at) VALUES ($1,$2,$3,$4,'approved',NOW())`, [id, toolInput.title, toolInput.decision, toolInput.rationale || ""]);
        return "Decision registrada: " + toolInput.title;
      }
      case "save_memory": {
        const db = getDb();
        const id = "mem-pres-" + Date.now();
        await db.query(`INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'note',$2,$3,$4,NOW(),'global')`, [id, toolInput.title, toolInput.detail, toolInput.priority || "medium"]);
        return "Memoria guardada: " + toolInput.title;
      }
      case "seed_ad_slots": {
        const res = await fetch(BASE_URL + "/api/monetization/slots", { method: "POST", headers, body: JSON.stringify({ action: "seed", publicationId: toolInput.publication }) });
        const data = await res.json();
        return data.ok ? "Slots creados para " + toolInput.publication + ": " + (data.slots?.length || 0) + " slots." : "Error: " + data.error;
      }
      case "get_pipeline_status": {
        const res = await fetch(BASE_URL + "/api/pipeline/run", { headers: { "x-atlas-admin-token": ADMIN_TOKEN } });
        const data = await res.json();
        const runs = data.runs?.slice(0, 3).map(r => (r.publication_name || r.publication_id) + ": " + r.status + " (" + (r.articles_published || 0) + " art.)").join(" | ");
        return "Ultimos runs: " + (runs || "sin datos");
      }
      default:
        return "Accion desconocida: " + toolName;
    }
  } catch (err) {
    return "Error ejecutando " + toolName + ": " + err.message;
  }
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
    const pubList = ctx.publications?.map(p => "- " + p.name + " (id: " + p.id + ", scope: " + p.scope + ")").join("\n") || "Sin publicaciones";
    const runList = ctx.recentRuns?.map(r => "- " + r.pub_name + ": " + r.status + ", " + (r.articles_published || 0) + " art.").join("\n") || "Sin runs";
    const articleList = ctx.articleStats?.map(a => "- " + a.publication + ": " + a.total + " (" + a.status + ")").join("\n") || "Sin articulos";
    const memoryList = ctx.recentMemory?.map(m => "- [" + m.priority + "] " + m.title).join("\n") || "Sin memoria";
    const subsList = ctx.subscribers?.map(s => "- " + s.publication_id + ": " + s.total + " suscriptores").join("\n") || "Sin suscriptores";

    const systemPrompt = "Sos el AI President OS de Atlas Media Network. Sos el CEO digital del holding: ejecutivo, directo, sin rodeos.\n\nESTADO ACTUAL:\nPublicaciones: " + pubList + "\nPipeline reciente: " + runList + "\nArticulos: " + articleList + "\nMemoria reciente: " + memoryList + "\nSuscriptores: " + subsList + "\nProspectos publicitarios: " + (ctx.adStats?.prospects || 0) + "\n\nCAPACIDADES: Tenes herramientas reales. Usalas cuando el Founder lo pida.\n\nREGLAS:\n- Responde en espanol\n- Se conciso y ejecutivo\n- Cuando ejecutes una accion, reporta el resultado\n- Si algo falla, reporta el error\n- No pidas permiso si el Founder ya te lo pidio\n- Nunca dices Como AI — sos el President";

    const tools = [
      { name: "run_pipeline", description: "Ejecuta el pipeline editorial para una publicacion.", input_schema: { type: "object", properties: { publication: { type: "string", description: "ID de la publicacion (ej: argentina-post)" } }, required: ["publication"] } },
      { name: "launch_expansion", description: "Analiza un territorio y lanza un nuevo medio digital.", input_schema: { type: "object", properties: { territory: { type: "string" }, type: { type: "string", enum: ["country","province","city","municipality"] }, country: { type: "string" }, parentPublication: { type: "string" } }, required: ["territory"] } },
      { name: "send_newsletter", description: "Genera y envia el newsletter de una publicacion.", input_schema: { type: "object", properties: { publication: { type: "string" } }, required: ["publication"] } },
      { name: "get_analytics", description: "Obtiene metricas de trafico.", input_schema: { type: "object", properties: { publication: { type: "string" }, days: { type: "number" } } } },
      { name: "register_decision", description: "Registra una decision estrategica.", input_schema: { type: "object", properties: { title: { type: "string" }, decision: { type: "string" }, rationale: { type: "string" } }, required: ["title","decision"] } },
      { name: "save_memory", description: "Guarda informacion en la memoria persistente.", input_schema: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" }, priority: { type: "string", enum: ["high","medium","low"] } }, required: ["title","detail"] } },
      { name: "seed_ad_slots", description: "Inicializa los slots publicitarios de una publicacion.", input_schema: { type: "object", properties: { publication: { type: "string" } }, required: ["publication"] } },
      { name: "get_pipeline_status", description: "Consulta el estado de los ultimos pipeline runs.", input_schema: { type: "object", properties: {} } }
    ];

    const messages = [...conversationHistory.slice(-10), { role: "user", content: founderMessage }];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, system: systemPrompt, tools, messages })
    });
    const data = await res.json();

    const toolUseBlocks = data.content?.filter(b => b.type === "tool_use") || [];

    if (toolUseBlocks.length > 0) {
      const toolResults = [];
      const executionLog = [];
      for (const toolUse of toolUseBlocks) {
        const result = await executeAction(toolUse.name, toolUse.input);
        toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
        executionLog.push({ tool: toolUse.name, result });
      }

      const messagesWithTools = [...messages, { role: "assistant", content: data.content }, { role: "user", content: toolResults }];
      const res2 = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, tools, messages: messagesWithTools })
      });
      const data2 = await res2.json();
      const finalReply = data2.content?.find(b => b.type === "text")?.text || "Accion ejecutada.";

      const db = getDb();
      await db.query(`INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'chat',$2,$3,'medium',NOW(),'global')`, ["mem-" + Date.now(), "Founder: " + founderMessage.slice(0, 60), "Acciones: " + executionLog.map(e => e.tool).join(", ")]).catch(() => {});

      return NextResponse.json({ ok: true, reply: finalReply, actionsExecuted: executionLog });
    }

    const reply = data.content?.find(b => b.type === "text")?.text || "Sin respuesta.";
    const db = getDb();
    await db.query(`INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'chat',$2,$3,'medium',NOW(),'global')`, ["mem-" + Date.now(), "Founder: " + founderMessage.slice(0, 60), reply.slice(0, 200)]).catch(() => {});

    return NextResponse.json({ ok: true, reply, actionsExecuted: [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
