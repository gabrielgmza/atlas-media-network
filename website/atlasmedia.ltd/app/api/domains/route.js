import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

async function ensureDomainsTable() {
  const db = getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS public.publication_domains (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL REFERENCES public.publications(id), hostname TEXT NOT NULL UNIQUE, status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','failed','inactive')), verified_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())`);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hostname = searchParams.get("hostname");
    const publicationId = searchParams.get("publication");
    const db = getDb();
    await ensureDomainsTable();

    if (hostname) {
      const result = await db.query(`SELECT d.*, p.id as pub_id, p.name as pub_name, p.slug, p.scope FROM public.publication_domains d JOIN public.publications p ON d.publication_id=p.id WHERE d.hostname=$1 AND d.status='active' AND p.status='active'`, [hostname]);
      if (!result.rows.length) return NextResponse.json({ ok: false, error: "DOMAIN_NOT_FOUND" });
      const row = result.rows[0];
      return NextResponse.json({ ok: true, publication: { id: row.pub_id, name: row.pub_name, slug: row.slug, scope: row.scope } });
    }

    const query = publicationId
      ? `SELECT d.*, p.name as publication_name, p.slug FROM public.publication_domains d JOIN public.publications p ON d.publication_id=p.id WHERE d.publication_id=$1 ORDER BY d.created_at DESC`
      : `SELECT d.*, p.name as publication_name, p.slug FROM public.publication_domains d JOIN public.publications p ON d.publication_id=p.id ORDER BY d.created_at DESC`;
    const result = publicationId ? await db.query(query, [publicationId]) : await db.query(query);
    return NextResponse.json({ ok: true, domains: result.rows });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const { publicationId, hostname } = body;
    if (!publicationId || !hostname) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    const cleanHostname = hostname.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    const db = getDb();
    await ensureDomainsTable();
    const id = "domain-" + Date.now() + "-" + Math.random().toString(36).slice(2,5);
    const result = await db.query(`INSERT INTO public.publication_domains (id,publication_id,hostname,status) VALUES ($1,$2,$3,'pending') ON CONFLICT (hostname) DO UPDATE SET publication_id=$2,status='pending' RETURNING *`, [id, publicationId, cleanHostname]);
    await db.query(`UPDATE public.publications SET domain=$1 WHERE id=$2`, [cleanHostname, publicationId]);
    await db.query(`INSERT INTO public.president_memory (id,type,title,detail,priority,created_at,scope) VALUES ($1,'note',$2,$3,'medium',NOW(),'global')`, ["mem-dom-" + Date.now(), "Dominio registrado: " + cleanHostname, "Dominio " + cleanHostname + " registrado para " + publicationId + ". Configurar DNS en Vercel."]).catch(() => {});
    return NextResponse.json({ ok: true, domain: result.rows[0], instructions: { step1: "En Vercel Settings Domains agrega: " + cleanHostname, step2: "DNS: CNAME " + cleanHostname + " -> cname.vercel-dns.com", step3: "Una vez verificado, presiona Activar en esta pagina" } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const body = await request.json();
    const db = getDb();
    const result = await db.query(`UPDATE public.publication_domains SET status=$2, verified_at=CASE WHEN $2='active' THEN NOW() ELSE verified_at END WHERE id=$1 RETURNING *`, [body.id, body.status]);
    return NextResponse.json({ ok: true, domain: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const db = getDb();
    await db.query(`DELETE FROM public.publication_domains WHERE id=$1`, [searchParams.get("id")]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
