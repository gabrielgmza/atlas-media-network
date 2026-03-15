import { getDb } from "./db";

export async function ensureEditorialBriefsTable() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.editorial_briefs (
      id TEXT PRIMARY KEY,
      publication TEXT NOT NULL,
      publication_name TEXT,
      title TEXT NOT NULL,
      category TEXT,
      journalist_id TEXT,
      journalist TEXT,
      journalist_reason TEXT,
      tone TEXT,
      brief TEXT,
      status TEXT DEFAULT 'suggested',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function saveEditorialBrief(input) {
  const db = getDb();
  await ensureEditorialBriefsTable();
  const result = await db.query(
    `INSERT INTO public.editorial_briefs (
      id, publication, publication_name, title, category,
      journalist_id, journalist, journalist_reason, tone, brief, status, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      input.id, input.publication, input.publicationName, input.title,
      input.category, input.journalistId, input.journalist,
      input.journalistReason, input.tone, input.brief,
      input.status || "suggested", input.createdAt
    ]
  );
  return result.rows[0];
}

export async function getEditorialBriefs(publication = null) {
  const db = getDb();
  await ensureEditorialBriefsTable();
  if (publication) {
    const result = await db.query(
      `SELECT * FROM public.editorial_briefs WHERE publication = $1 ORDER BY created_at DESC`,
      [publication]
    );
    return result.rows;
  }
  const result = await db.query(
    `SELECT * FROM public.editorial_briefs ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function updateEditorialBriefStatus(id, status) {
  const db = getDb();
  const result = await db.query(
    `UPDATE public.editorial_briefs SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
}
