import { getDb } from "../../lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Red de Medios — Atlas Media Network",
  description: "Mapa completo de todas las publicaciones del holding Atlas Media Network."
};

async function getNetworkData() {
  const db = getDb();
  try {
    const pubs = await db.query(`
      SELECT p.*, t.name as territory_name, t.type as territory_type, pp.name as parent_name, pp.slug as parent_slug,
        (SELECT COUNT(*) FROM public.journalists j WHERE j.publication_id=p.id AND j.status='active') as journalist_count,
        (SELECT COUNT(*) FROM public.pub_categories c WHERE c.publication_id=p.id AND c.active=true) as category_count,
        (SELECT COUNT(*) FROM public.articles a WHERE a.publication=p.id AND a.status='published') as article_count,
        (SELECT COUNT(*) FROM public.newsletter_subscribers ns WHERE ns.publication_id=p.id AND ns.status='active') as subscriber_count,
        (SELECT started_at FROM public.pipeline_runs pr WHERE pr.publication_id=p.id ORDER BY started_at DESC LIMIT 1) as last_run,
        (SELECT articles_published FROM public.pipeline_runs pr WHERE pr.publication_id=p.id AND pr.status='completed' ORDER BY started_at DESC LIMIT 1) as last_run_articles
      FROM public.publications p
      LEFT JOIN public.territories t ON p.territory_id=t.id
      LEFT JOIN public.publications pp ON p.parent_id=pp.id
      ORDER BY p.created_at ASC
    `);
    const territories = await db.query(`SELECT t.*, COUNT(p.id) as pub_count FROM public.territories t LEFT JOIN public.publications p ON p.territory_id=t.id GROUP BY t.id ORDER BY t.created_at ASC`);
    const totals = await db.query(`SELECT COUNT(DISTINCT p.id) as total_publications, COUNT(DISTINCT j.id) as total_journalists, COUNT(DISTINCT a.id) as total_articles, COUNT(DISTINCT ns.id) as total_subscribers FROM public.publications p LEFT JOIN public.journalists j ON j.publication_id=p.id LEFT JOIN public.articles a ON a.publication=p.id AND a.status='published' LEFT JOIN public.newsletter_subscribers ns ON ns.publication_id=p.id AND ns.status='active' WHERE p.status='active'`);
    return { publications: pubs.rows, territories: territories.rows, totals: totals.rows[0] };
  } catch (err) {
    return { publications: [], territories: [], totals: {}, error: err.message };
  }
}

function timeAgo(date) {
  if (!date) return "nunca";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  return "hace " + Math.floor(diff/86400) + "d";
}

const scopeColors = {
  national:   { bg: "#7c3aed", border: "#7c3aed" },
  provincial: { bg: "#1a6b3c", border: "#1a6b3c" },
  city:       { bg: "#1a4a8a", border: "#1a4a8a" },
  municipal:  { bg: "#92400e", border: "#92400e" },
  niche:      { bg: "#5b21b6", border: "#5b21b6" }
};

const scopeLabels = { national: "Nacional", provincial: "Provincial", city: "Ciudad", municipal: "Municipal", niche: "Nicho" };

function PubCard({ pub, compact }) {
  const colors = scopeColors[pub.scope] || scopeColors.city;
  return (
    <a href={"/" + pub.slug} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div style={{ border: "1px solid " + colors.border + "44", borderRadius: 12, padding: compact ? "14px 16px" : "20px", background: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: colors.bg }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ background: colors.bg, color: "#fff", borderRadius: 4, padding: "1px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{scopeLabels[pub.scope] || pub.scope}</span>
          <span style={{ background: pub.status === "active" ? "#dcfce7" : "#fee2e2", color: pub.status === "active" ? "#15803d" : "#991b1b", borderRadius: 4, padding: "1px 8px", fontSize: 10, fontWeight: 600 }}>{pub.status}</span>
        </div>
        <h3 style={{ fontSize: compact ? 15 : 18, fontWeight: 800, margin: "0 0 4px", color: "#111", fontFamily: "Georgia, serif", lineHeight: 1.2 }}>{pub.name}</h3>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 10px" }}>{pub.territory_name}</p>
        {pub.description && !compact && <p style={{ fontSize: 13, color: "#555", margin: "0 0 12px", lineHeight: 1.5 }}>{pub.description}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {[["articulos", parseInt(pub.article_count||0)], ["periodistas", parseInt(pub.journalist_count||0)], ["categorias", parseInt(pub.category_count||0)], ["suscriptores", parseInt(pub.subscriber_count||0)]].map(([label, value], i) => (
            <div key={i} style={{ textAlign: "center", padding: "5px 4px", background: "#f9fafb", borderRadius: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.bg }}>{value}</div>
              <div style={{ fontSize: 10, color: "#888" }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "#aaa" }}>
          Ultimo pipeline: {timeAgo(pub.last_run)}{pub.last_run_articles ? " (" + pub.last_run_articles + " art.)" : ""}
          {pub.parent_name && <span style={{ marginLeft: 8 }}>parte de {pub.parent_name}</span>}
        </div>
      </div>
    </a>
  );
}

export default async function NetworkPage() {
  const { publications, territories, totals, error } = await getNetworkData();
  const nationals   = publications.filter(p => p.scope === "national");
  const provincials = publications.filter(p => p.scope === "provincial");
  const cities      = publications.filter(p => p.scope === "city");
  const municipals  = publications.filter(p => p.scope === "municipal");
  const niches      = publications.filter(p => p.scope === "niche");

  const sections = [
    { list: nationals,   color: "#7c3aed", label: "Medios Nacionales",   cols: "repeat(auto-fill,minmax(360px,1fr))", compact: false },
    { list: provincials, color: "#1a6b3c", label: "Medios Provinciales",  cols: "repeat(auto-fill,minmax(340px,1fr))", compact: false },
    { list: cities,      color: "#1a4a8a", label: "Medios de Ciudad",     cols: "repeat(auto-fill,minmax(300px,1fr))", compact: true },
    { list: municipals,  color: "#92400e", label: "Medios Municipales",   cols: "repeat(auto-fill,minmax(280px,1fr))", compact: true },
    { list: niches,      color: "#5b21b6", label: "Publicaciones de Nicho", cols: "repeat(auto-fill,minmax(280px,1fr))", compact: true }
  ];

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <div style={{ background: "#111", color: "#fff", padding: "20px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <a href="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13 }}>- Atlas Media Network</a>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: "12px 0 4px", fontFamily: "Georgia, serif" }}>Red de Medios</h1>
          <p style={{ opacity: 0.5, margin: 0, fontSize: 14 }}>Mapa completo del holding Atlas Media Network</p>
        </div>
      </div>

      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 24 }}>
          {[
            { label: "Publicaciones activas", value: parseInt(totals?.total_publications||0), color: "#7c3aed" },
            { label: "Periodistas IA", value: parseInt(totals?.total_journalists||0), color: "#1a6b3c" },
            { label: "Articulos publicados", value: parseInt(totals?.total_articles||0), color: "#1a4a8a" },
            { label: "Suscriptores newsletter", value: parseInt(totals?.total_subscribers||0), color: "#92400e" },
            { label: "Territorios cubiertos", value: territories.length, color: "#111" }
          ].map((kpi, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: kpi.color }}>{kpi.value.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 80px" }}>
        {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: 16, marginBottom: 24, color: "#991b1b" }}>Error: {error}</div>}

        {sections.map(({ list, color, label, cols, compact }) => list.length > 0 && (
          <section key={label} style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 4, height: 28, background: color, borderRadius: 2 }} />
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#111" }}>{label}</h2>
              <span style={{ fontSize: 13, color: "#888" }}>{list.length} publicacion{list.length !== 1 ? "es" : ""}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: cols, gap: 16 }}>
              {list.map(pub => <PubCard key={pub.id} pub={pub} compact={compact} />)}
            </div>
          </section>
        ))}

        {publications.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌎</div>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>Red en construccion</p>
            <p style={{ fontSize: 14 }}>El AI Expansion Director esta analizando mercados.</p>
          </div>
        )}

        <div style={{ marginTop: 40, padding: "20px 24px", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px", color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Referencias</h3>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {Object.entries(scopeLabels).map(([scope, label]) => (
              <div key={scope} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: scopeColors[scope]?.bg }} />
                <span style={{ fontSize: 13, color: "#555" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
