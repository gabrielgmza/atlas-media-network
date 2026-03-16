import { getDb } from "./db";

export async function ensureMonetizationTables() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.ad_slots (
      id TEXT PRIMARY KEY,
      publication_id TEXT NOT NULL,
      name TEXT NOT NULL,
      position TEXT NOT NULL CHECK (position IN ('header','sidebar','inline','footer','breaking')),
      format TEXT NOT NULL CHECK (format IN ('banner','native','sponsored','text')),
      width INTEGER,
      height INTEGER,
      base_price NUMERIC(10,2) DEFAULT 100,
      status TEXT DEFAULT 'available' CHECK (status IN ('available','occupied','reserved')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.ad_campaigns (
      id TEXT PRIMARY KEY,
      advertiser_id TEXT NOT NULL,
      publication_id TEXT NOT NULL,
      slot_id TEXT REFERENCES public.ad_slots(id),
      title TEXT NOT NULL,
      description TEXT,
      url TEXT,
      image_url TEXT,
      format TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','ended','pending')),
      monthly_budget NUMERIC(10,2),
      start_date DATE,
      end_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.ad_impressions (
      id TEXT PRIMARY KEY,
      campaign_id TEXT REFERENCES public.ad_campaigns(id),
      publication_id TEXT,
      article_slug TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export async function seedAdSlots(publicationId) {
  const db = getDb();
  await ensureMonetizationTables();
  const slots = [
    { id: `${publicationId}-header`,   name: "Header Banner",           position: "header",   format: "banner",   width: 728, height: 90,  base_price: 300 },
    { id: `${publicationId}-sidebar`,  name: "Sidebar",                 position: "sidebar",  format: "banner",   width: 300, height: 250, base_price: 150 },
    { id: `${publicationId}-inline`,   name: "Inline Article",          position: "inline",   format: "native",   width: 600, height: 120, base_price: 200 },
    { id: `${publicationId}-footer`,   name: "Footer Banner",           position: "footer",   format: "banner",   width: 728, height: 90,  base_price: 100 },
    { id: `${publicationId}-breaking`, name: "Breaking News Sponsor",   position: "breaking", format: "sponsored",width: 400, height: 60,  base_price: 400 }
  ];
  for (const slot of slots) {
    await db.query(
      `INSERT INTO public.ad_slots (id,publication_id,name,position,format,width,height,base_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [slot.id, publicationId, slot.name, slot.position, slot.format, slot.width, slot.height, slot.base_price]
    );
  }
  return slots;
}

export async function getActiveAds(publicationId, position = null) {
  const db = getDb();
  await ensureMonetizationTables();
  const base = `SELECT c.*, s.position, s.width, s.height, s.format as slot_format, a.business_name as advertiser_name
    FROM public.ad_campaigns c
    JOIN public.ad_slots s ON c.slot_id=s.id
    LEFT JOIN public.advertisers a ON c.advertiser_id=a.id
    WHERE c.publication_id=$1 AND c.status='active' AND (c.end_date IS NULL OR c.end_date>=CURRENT_DATE)`;
  const result = position
    ? await db.query(base + ` AND s.position=$2`, [publicationId, position])
    : await db.query(base, [publicationId]);
  return result.rows;
}

export async function getMonetizationStats(publicationId) {
  const db = getDb();
  await ensureMonetizationTables();
  const [slots, campaigns, advertisers, impressions] = await Promise.all([
    db.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) as occupied FROM public.ad_slots WHERE publication_id=$1`, [publicationId]),
    db.query(`SELECT COUNT(*) as total, SUM(monthly_budget) as monthly_revenue FROM public.ad_campaigns WHERE publication_id=$1 AND status='active'`, [publicationId]),
    db.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM public.advertisers WHERE publication_id=$1`, [publicationId]),
    db.query(`SELECT COUNT(*) as total FROM public.ad_impressions WHERE publication_id=$1 AND created_at>NOW()-INTERVAL '30 days'`, [publicationId])
  ]);
  return { slots: slots.rows[0], campaigns: campaigns.rows[0], advertisers: advertisers.rows[0], impressions30d: impressions.rows[0]?.total || 0 };
}

export async function recordImpression(campaignId, publicationId, articleSlug) {
  const db = getDb();
  const id = `imp-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
  await db.query(`INSERT INTO public.ad_impressions (id,campaign_id,publication_id,article_slug) VALUES ($1,$2,$3,$4)`, [id, campaignId, publicationId, articleSlug||null]).catch(() => {});
}
