import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { checkDomainAvailability, suggestDomains, automateNewDomain, checkVercelDomainStatus, configureDnsForVercel, addDomainToVercel } from "../../../lib/domains";

export const dynamic = "force-dynamic";

async function ensureDomainsTable() {
  const db = getDb();
  await db.query(`CREATE TABLE IF NOT EXISTS public.publication_domains (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL, domain TEXT NOT NULL UNIQUE, status TEXT DEFAULT 'pending' CHECK (status IN ('pending','purchasing','configuring','active','failed')), godaddy_order_id TEXT, vercel_verified BOOLEAN DEFAULT false, dns_configured BOOLEAN DEFAULT false, price_usd NUMERIC, error_log TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), activated_at TIMESTAMPTZ)`);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const domain = searchParams.get("domain");
    const publicationId = searchParams.get("publication");
    if (action === "check" && domain) { const result = await checkDomainAvailability(domain); return NextResponse.json({ ok:true, ...result }); }
    const adminToken = request.headers.get("x-atlas-admin-token");
    if (adminToken !== process.env.ATLAS_ADMIN_TOKEN) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });
    if (action === "suggest" && publicationId) {
      const db = getDb();
      const pub = await db.query(`SELECT p.*, t.name as territory_name FROM public.publications p LEFT JOIN public.territories t ON p.territory_id=t.id WHERE p.id=$1`, [publicationId]);
      if (!pub.rows.length) return NextResponse.json({ ok:false, error:"NOT_FOUND" }, { status:404 });
      const p = pub.rows[0];
      const suggestions = await suggestDomains(p.name, p.territory_name||"argentina", p.scope);
      return NextResponse.json({ ok:true, suggestions, publication:p.name });
    }
    const db = getDb(); await ensureDomainsTable();
    const result = publicationId
      ? await db.query(`SELECT d.*, p.name as publication_name FROM public.publication_domains d LEFT JOIN public.publications p ON d.publication_id=p.id WHERE d.publication_id=$1 ORDER BY d.created_at DESC`, [publicationId])
      : await db.query(`SELECT d.*, p.name as publication_name FROM public.publication_domains d LEFT JOIN public.publications p ON d.publication_id=p.id ORDER BY d.created_at DESC`);
    return NextResponse.json({ ok:true, domains:result.rows });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}

export async function POST(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });
    const body = await request.json();
    const { action, publicationId, domain, publicationName, territory, scope } = body;
    const db = getDb(); await ensureDomainsTable();

    if (action === "automate") {
      if (!publicationId || !publicationName) return NextResponse.json({ ok:false, error:"MISSING_FIELDS" }, { status:400 });
      const id = "dom-"+Date.now();
      await db.query(`INSERT INTO public.publication_domains (id,publication_id,domain,status) VALUES ($1,$2,$3,'pending') ON CONFLICT DO NOTHING`, [id, publicationId, "pending-"+id]);
      const result = await automateNewDomain(publicationName, territory||"argentina", scope||"national");
      if (result.ok) await db.query(`UPDATE public.publication_domains SET domain=$1,status='active',dns_configured=true,vercel_verified=true,price_usd=$2,activated_at=NOW() WHERE id=$3`, [result.domain, result.price, id]);
      else await db.query(`UPDATE public.publication_domains SET status='failed',error_log=$1 WHERE id=$2`, [result.error, id]);
      return NextResponse.json({ ok:result.ok, ...result });
    }

    if (action === "register" && domain && publicationId) {
      const log = [];
      try {
        log.push("Configurando DNS en GoDaddy...");
        await configureDnsForVercel(domain);
        log.push("Agregando a Vercel...");
        await addDomainToVercel(domain);
        const id = "dom-"+Date.now();
        await db.query(`INSERT INTO public.publication_domains (id,publication_id,domain,status,dns_configured) VALUES ($1,$2,$3,'active',true) ON CONFLICT (domain) DO UPDATE SET status='active',dns_configured=true`, [id, publicationId, domain]);
        log.push("OK");
        return NextResponse.json({ ok:true, domain, log });
      } catch (err) { log.push("Error: "+err.message); return NextResponse.json({ ok:false, error:err.message, log }, { status:500 }); }
    }

    if (action === "verify" && domain) {
      const status = await checkVercelDomainStatus(domain);
      if (status.verified) await db.query(`UPDATE public.publication_domains SET vercel_verified=true WHERE domain=$1`, [domain]);
      return NextResponse.json({ ok:true, ...status });
    }

    return NextResponse.json({ ok:false, error:"UNKNOWN_ACTION" }, { status:400 });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}

export async function DELETE(request) {
  try {
    const adminToken = process.env.ATLAS_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("x-atlas-admin-token") !== adminToken) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });
    const { searchParams } = new URL(request.url);
    const db = getDb();
    await db.query(`DELETE FROM public.publication_domains WHERE domain=$1`, [searchParams.get("domain")]);
    return NextResponse.json({ ok:true });
  } catch (error) { return NextResponse.json({ ok:false, error:error.message }, { status:500 }); }
}
