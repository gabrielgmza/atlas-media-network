const { Pool } = require("pg");

const pool = new Pool({
  host: "34.176.108.109",
  port: 5432,
  database: "atlas_media",
  user: "atlas-media-db",
  password: "AtlasDB2026!",
  ssl: { rejectUnauthorized: false }
});

const sources = [
  { id: "src-infobae-nac",         publication_id: "argentina-post",         name: "Infobae",           url: "https://www.infobae.com/feeds/rss/",              category: "general"   },
  { id: "src-lanacion-nac",        publication_id: "argentina-post",         name: "La Nacion",         url: "https://www.lanacion.com.ar/arcio/rss/",          category: "general"   },
  { id: "src-clarin-nac",          publication_id: "argentina-post",         name: "Clarin",            url: "https://www.clarin.com/rss/lo-ultimo/",           category: "general"   },
  { id: "src-telam-nac",           publication_id: "argentina-post",         name: "Telam",             url: "https://www.telam.com.ar/rss/politica.xml",       category: "politica"  },
  { id: "src-perfil-nac",          publication_id: "argentina-post",         name: "Perfil",            url: "https://www.perfil.com/feed",                     category: "general"   },
  { id: "src-ambito-nac",          publication_id: "argentina-post",         name: "Ambito Financiero", url: "https://www.ambito.com/rss/pages/economia.xml",   category: "economia"  },
  { id: "src-cronista-nac",        publication_id: "argentina-post",         name: "El Cronista",       url: "https://www.cronista.com/files/rss/economia.xml", category: "economia"  },
  { id: "src-mdz-mendoza",         publication_id: "argentina-post-mendoza", name: "MDZ Online",        url: "https://www.mdzol.com/rss.html",                  category: "general"   },
  { id: "src-losandes-mendoza",    publication_id: "argentina-post-mendoza", name: "Los Andes",         url: "https://losandes.com.ar/feed/",                   category: "general"   },
  { id: "src-elsol-mendoza",       publication_id: "argentina-post-mendoza", name: "El Sol",            url: "https://www.elsol.com.ar/feed",                   category: "general"   },
  { id: "src-diariouno-mendoza",   publication_id: "argentina-post-mendoza", name: "Diario Uno",        url: "https://www.diariouno.com.ar/feed",               category: "general"   },
  { id: "src-unidiv-mendoza",      publication_id: "argentina-post-mendoza", name: "Unidiversidad",     url: "https://www.unidiversidad.com.ar/feed",           category: "educacion" },
  { id: "src-sitioandino-mendoza", publication_id: "argentina-post-mendoza", name: "Sitio Andino",      url: "https://www.sitioandino.com.ar/feed",             category: "regional"  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS public.news_sources (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, category TEXT, language TEXT DEFAULT 'es', active BOOLEAN DEFAULT true, last_fetched_at TIMESTAMPTZ, fetch_count INTEGER DEFAULT 0, error_count INTEGER DEFAULT 0, last_error TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    let inserted = 0, skipped = 0;
    for (const s of sources) {
      const ex = await client.query("SELECT id FROM public.news_sources WHERE id=$1", [s.id]);
      if (ex.rows.length) { console.log("SKIP:", s.name); skipped++; continue; }
      await client.query("INSERT INTO public.news_sources (id,publication_id,name,url,category,language,active) VALUES ($1,$2,$3,$4,$5,'es',true)", [s.id, s.publication_id, s.name, s.url, s.category]);
      console.log("OK:", s.name, "->", s.publication_id);
      inserted++;
    }
    console.log("\nInsertadas:", inserted, "| Omitidas:", skipped);
    const r = await client.query("SELECT publication_id, COUNT(*) as total FROM public.news_sources WHERE active=true GROUP BY publication_id ORDER BY publication_id");
    console.log("\nFuentes por publicacion:");
    r.rows.forEach(row => console.log(" ", row.publication_id + ":", row.total, "fuentes"));
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error("Error:", err.message); process.exit(1); });
