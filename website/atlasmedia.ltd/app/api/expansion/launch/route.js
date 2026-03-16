import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`; }
function slugify(v) { return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    const body = await request.json();
    const { territoryName, territoryType, country, parentTerritoryId, parentPublicationId, analysis } = body;
    if (!territoryName || !territoryType || !analysis) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });

    const db = getDb();
    const results = { territory: null, publication: null, journalists: [], categories: [], sources: [] };

    const territoryId = makeId("territory");
    const territorySlug = slugify(territoryName);
    await db.query(`INSERT INTO public.territories (id,slug,name,type,country_code,parent_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name`, [territoryId, territorySlug, territoryName, territoryType, country||"AR", parentTerritoryId||null]);
    results.territory = { id: territoryId, name: territoryName };

    const publicationId = analysis.publicationSlug || slugify(analysis.publicationName);
    const scopeMap = { country:"national", province:"provincial", state:"provincial", city:"city", municipality:"municipal" };
    await db.query(`INSERT INTO public.publications (id,slug,name,territory_id,parent_id,scope,status,description,editorial_line) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,status='active'`, [publicationId, publicationId, analysis.publicationName, territoryId, parentPublicationId||null, scopeMap[territoryType]||"city", analysis.tagline||"", analysis.editorialLine||""]);
    results.publication = { id: publicationId, name: analysis.publicationName };

    for (let i=0; i<(analysis.categories||[]).length; i++) {
      const cat = analysis.categories[i];
      await db.query(`INSERT INTO public.pub_categories (id,publication_id,name,slug,display_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (publication_id,slug) DO NOTHING`, [`${publicationId}-${slugify(cat.name)}`, publicationId, cat.name, slugify(cat.name), i+1]);
      results.categories.push(cat.name);
    }

    for (const j of (analysis.journalists||[])) {
      await db.query(`INSERT INTO public.journalists (id,slug,name,publication_id,role,beat,style,tone,personality,signature,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active') ON CONFLICT (slug) DO NOTHING`, [makeId(slugify(j.name)), slugify(j.name)+`-${publicationId}`, j.name, publicationId, j.role, j.beat, j.style, j.tone, j.personality, j.signature]);
      results.journalists.push(j.name);
    }

    for (const s of (analysis.newsSources||[])) {
      await db.query(`INSERT INTO public.news_sources (id,publication_id,name,type,url,category_hint,priority,active) VALUES ($1,$2,$3,$4,$5,$6,$7,true) ON CONFLICT DO NOTHING`, [makeId("src"), publicationId, s.name, s.type||"rss", s.url, s.categoryHint||null, s.priority||5]);
      results.sources.push(s.name);
    }

    await db.query(`INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'expansion',$2,$3,'high',NOW(),'global')`, [makeId("mem"), `Nuevo medio lanzado: ${analysis.publicationName}`, `Territorio: ${territoryName}. ${results.journalists.length} periodistas, ${results.categories.length} categorías.`]);
    await db.query(`INSERT INTO public.president_decisions (id,title,decision,rationale,status,created_at) VALUES ($1,$2,$3,$4,'approved',NOW())`, [makeId("dec"), `Expansión: ${analysis.publicationName}`, `Lanzamiento de ${analysis.publicationName} para ${territoryName}`, analysis.marketAnalysis||""]);

    return NextResponse.json({ ok: true, message: `${analysis.publicationName} lanzado exitosamente`, results, nextStep: `POST /api/pipeline/run con publication: "${publicationId}"` });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const db = getDb();
  const result = await db.query(`SELECT p.*, t.name as territory_name, t.type as territory_type, pp.name as parent_name, (SELECT COUNT(*) FROM public.journalists j WHERE j.publication_id=p.id) as journalist_count, (SELECT COUNT(*) FROM public.pub_categories c WHERE c.publication_id=p.id) as category_count, (SELECT COUNT(*) FROM public.articles a WHERE a.publication=p.id) as article_count FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id LEFT JOIN public.publications pp ON p.parent_id=pp.id ORDER BY p.created_at`);
  return NextResponse.json({ ok: true, publications: result.rows });
}
