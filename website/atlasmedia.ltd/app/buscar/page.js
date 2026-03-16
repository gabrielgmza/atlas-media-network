"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  return "hace " + Math.floor(diff/86400) + "d";
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [publication, setPublication] = useState(searchParams.get("publication") || "");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [publications, setPublications] = useState([]);

  useEffect(() => {
    fetch("/api/expansion/launch").then(r => r.json()).then(d => { if (d.ok) setPublications(d.publications); }).catch(() => {});
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setQuery(q); doSearch(q, publication, 1); }
  }, []);

  async function doSearch(q, pub, p) {
    if (!q?.trim() && !pub) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p || 1, limit: 10 });
      if (q?.trim()) params.append("q", q.trim());
      if (pub) params.append("publication", pub);
      const res = await fetch("/api/search?" + params);
      const data = await res.json();
      if (data.ok) { setResults(data.results); setTotal(data.total); setPages(data.pages); setPage(p || 1); }
    } catch {}
    setLoading(false);
    setSearched(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    doSearch(query, publication, 1);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (publication) params.set("publication", publication);
    router.push("/buscar?" + params.toString());
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#111", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: 13, fontFamily: "Arial, sans-serif" }}>Atlas Media Network</a>
      </div>

      <div style={{ background: "#f8f8f8", borderBottom: "3px solid #111", padding: "32px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 20px", letterSpacing: -1 }}>Buscar noticias</h1>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar en todos los medios..." style={{ flex: "1 1 300px", padding: "12px 18px", fontSize: 16, border: "2px solid #111", borderRadius: 8, outline: "none", fontFamily: "Arial, sans-serif" }} />
              <select value={publication} onChange={e => setPublication(e.target.value)} style={{ padding: "12px 16px", fontSize: 14, border: "2px solid #ddd", borderRadius: 8, fontFamily: "Arial, sans-serif", minWidth: 180 }}>
                <option value="">Todos los medios</option>
                {publications.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="submit" style={{ background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Buscar</button>
            </div>
          </form>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 80px" }}>
        {loading && <div style={{ textAlign: "center", padding: "48px 0", color: "#888" }}><p style={{ fontSize: 16, fontFamily: "Arial, sans-serif" }}>Buscando...</p></div>}

        {!loading && searched && (
          <div>
            <p style={{ fontSize: 14, color: "#888", marginBottom: 24, fontFamily: "Arial, sans-serif" }}>
              {total > 0 ? total.toLocaleString() + " resultado" + (total !== 1 ? "s" : "") + (query ? " para \"" + query + "\"" : "") : "Sin resultados" + (query ? " para \"" + query + "\"" : "")}
            </p>

            {results.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#888" }}>
                <p style={{ fontSize: 18, fontWeight: 700 }}>Sin resultados</p>
                <p style={{ fontSize: 14, fontFamily: "Arial, sans-serif" }}>Proba con otras palabras clave</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {results.map((article) => (
                <div key={article.id} style={{ paddingBottom: 24, marginBottom: 24, borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    {article.image_thumb && <img src={article.image_thumb} alt="" style={{ width: 100, height: 72, objectFit: "cover", flexShrink: 0, borderRadius: 4 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", marginBottom: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ color: "#cc0000", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{article.category}</span>
                        <span style={{ color: "#888" }}>{article.publication_name || article.publication}</span>
                        <span style={{ color: "#bbb" }}>{timeAgo(article.published_at)}</span>
                      </div>
                      <a href={"/noticias/" + article.slug} style={{ textDecoration: "none", color: "inherit" }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, margin: "0 0 8px" }}>{article.title}</h2>
                      </a>
                      <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 8px", fontFamily: "Arial, sans-serif" }}>{article.excerpt}</p>
                      <span style={{ fontSize: 13, color: "#888", fontFamily: "Arial, sans-serif" }}>{article.author}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 32 }}>
                {Array.from({ length: Math.min(pages, 8) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => doSearch(query, publication, p)} style={{ width: 38, height: 38, borderRadius: 8, border: "2px solid " + (p === page ? "#111" : "#ddd"), background: p === page ? "#111" : "#fff", color: p === page ? "#fff" : "#111", cursor: "pointer", fontWeight: p === page ? 700 : 400, fontSize: 14, fontFamily: "Arial, sans-serif" }}>{p}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {!searched && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#bbb" }}>
            <p style={{ fontSize: 18, fontFamily: "Arial, sans-serif" }}>Ingresa un termino para buscar en todos los medios de Atlas</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuscarPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: "center" }}>Cargando...</div>}>
      <SearchContent />
    </Suspense>
  );
}
