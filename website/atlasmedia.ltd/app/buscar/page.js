"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function timeAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600) return "hace " + Math.floor(diff/60) + "m";
  if (diff < 86400) return "hace " + Math.floor(diff/3600) + "h";
  return "hace " + Math.floor(diff/86400) + "d";
}

function highlight(text, query) {
  if (!query || !text) return text;
  const words = query.split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return text;
  const regex = new RegExp("(" + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} style={{ background:"#fef08a",color:"#111",borderRadius:2,padding:"0 2px" }}>{part}</mark>
      : part
  );
}

function slugify(name) {
  return (name||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inputRef = useRef(null);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [publication, setPublication] = useState(searchParams.get("publication") || "");
  const [results, setResults] = useState([]);
  const [journalists, setJournalists] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [publications, setPublications] = useState([]);

  useEffect(() => {
    fetch("/api/expansion/launch").then(r=>r.json()).then(d=>{if(d.ok)setPublications(d.publications||[]);}).catch(()=>{});
  }, []);

  const doSearch = useCallback(async (q, pub, p = 1) => {
    if (!q.trim() && !pub) return;
    setLoading(true); setSearched(true);
    try {
      const params = new URLSearchParams({ limit: 12, page: p });
      if (q.trim()) params.set("q", q.trim());
      if (pub) params.set("publication", pub);
      const res = await fetch("/api/search?" + params);
      const data = await res.json();
      if (data.ok) {
        setResults(data.results || []);
        setJournalists(data.journalists || []);
        setSuggestions(data.suggestions || null);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setPage(p);
        const url = new URLSearchParams();
        if (q.trim()) url.set("q", q.trim());
        if (pub) url.set("publication", pub);
        router.replace("/buscar?" + url.toString(), { scroll: false });
      }
    } catch {}
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    const pub = searchParams.get("publication") || "";
    if (q || pub) { setQuery(q); setPublication(pub); doSearch(q, pub); }
  }, []);

  function handleSubmit(e) { e.preventDefault(); doSearch(query, publication); }

  const sel = { background:"#1e2a3a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"10px 14px",color:"#e5e7eb",fontSize:14,outline:"none" };

  return (
    <div style={{ minHeight:"100vh",background:"#0b1020",color:"#e5e7eb",fontFamily:"Arial, sans-serif",paddingBottom:80 }}>

      <div style={{ background:"#060c18",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"20px 24px 0" }}>
        <div style={{ maxWidth:800,margin:"0 auto" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
            <a href="/" style={{ color:"#93c5fd",textDecoration:"none",fontSize:13 }}>Atlas Media Network</a>
            <span style={{ opacity:0.3 }}>›</span>
            <span style={{ fontSize:14,opacity:0.6 }}>Buscar</span>
          </div>
          <h1 style={{ fontSize:28,fontWeight:800,margin:"0 0 20px" }}>Buscar en Atlas Media Network</h1>

          <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:10,paddingBottom:20 }}>
            <div style={{ display:"flex",gap:10 }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e=>setQuery(e.target.value)}
                placeholder="Buscar articulos, periodistas, temas..."
                autoFocus
                style={{ ...sel,flex:1,fontSize:16,padding:"12px 18px" }}
              />
              <button type="submit" disabled={loading} style={{ background:"#cc0000",border:"none",borderRadius:8,padding:"12px 24px",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",opacity:loading?0.7:1,whiteSpace:"nowrap" }}>
                {loading?"...":"Buscar"}
              </button>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <select value={publication} onChange={e=>setPublication(e.target.value)} style={{ ...sel,flex:1 }}>
                <option value="">Todas las publicaciones</option>
                {publications.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {(query||publication) && (
                <button type="button" onClick={()=>{setQuery("");setPublication("");setResults([]);setSearched(false);router.replace("/buscar");}} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"10px 16px",color:"#9ca3af",cursor:"pointer",fontSize:13 }}>Limpiar</button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div style={{ maxWidth:800,margin:"0 auto",padding:"28px 24px" }}>

        {loading && (
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {Array.from({length:4}).map((_,i) => (
              <div key={i} style={{ border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:16,display:"flex",gap:14 }}>
                <div style={{ width:80,height:60,borderRadius:6,background:"rgba(255,255,255,0.06)",flexShrink:0 }} />
                <div style={{ flex:1,display:"flex",flexDirection:"column",gap:8 }}>
                  <div style={{ height:16,background:"rgba(255,255,255,0.06)",borderRadius:4,width:"80%" }} />
                  <div style={{ height:13,background:"rgba(255,255,255,0.06)",borderRadius:4,width:"60%" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && searched && (
          <div style={{ marginBottom:20,fontSize:14,opacity:0.6 }}>
            {total > 0
              ? total.toLocaleString() + " resultados" + (query ? ' para "'+query+'"' : "") + (publication ? " en "+(publications.find(p=>p.id===publication)?.name||publication) : "")
              : 'Sin resultados' + (query ? ' para "'+query+'"' : "")
            }
          </div>
        )}

        {!loading && journalists.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,opacity:0.5,margin:"0 0 12px" }}>Periodistas</h3>
            <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
              {journalists.map(j => (
                <a key={j.id} href={"/periodistas/"+slugify(j.name)} style={{ textDecoration:"none",color:"inherit" }}>
                  <div style={{ border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.03)" }}>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:"#4f46e5",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0 }}>{j.name?.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight:600,fontSize:14 }}>{highlight(j.name,query)}</div>
                      <div style={{ fontSize:12,opacity:0.5 }}>{j.role} · {j.publication_name}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            {journalists.length > 0 && <h3 style={{ fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,opacity:0.5,margin:"0 0 12px" }}>Articulos</h3>}
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {results.map(article => (
                <a key={article.id} href={"/noticias/"+article.slug} style={{ textDecoration:"none",color:"inherit" }}>
                  <div style={{ border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:16,display:"flex",gap:14,background:"rgba(255,255,255,0.02)" }}>
                    {article.image_thumb && <img src={article.image_thumb} alt="" style={{ width:90,height:68,objectFit:"cover",borderRadius:6,flexShrink:0 }} loading="lazy" />}
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:"flex",gap:8,marginBottom:6,flexWrap:"wrap" }}>
                        <span style={{ fontSize:10,color:"#93c5fd",fontWeight:700,textTransform:"uppercase",letterSpacing:1 }}>{article.category}</span>
                        <span style={{ fontSize:10,opacity:0.4 }}>{article.publication_name}</span>
                      </div>
                      <h3 style={{ fontSize:16,fontWeight:700,lineHeight:1.3,margin:"0 0 6px",fontFamily:"Georgia, serif" }}>{highlight(article.title,query)}</h3>
                      <p style={{ fontSize:13,opacity:0.6,lineHeight:1.5,margin:"0 0 8px" }}>{highlight((article.excerpt||"").slice(0,140),query)}...</p>
                      <div style={{ fontSize:12,opacity:0.4 }}>{article.author} · {timeAgo(article.published_at)}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {pages > 1 && (
              <div style={{ display:"flex",gap:6,justifyContent:"center",marginTop:24,flexWrap:"wrap" }}>
                {page>1 && <button onClick={()=>doSearch(query,publication,page-1)} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"8px 16px",color:"#e5e7eb",cursor:"pointer",fontSize:13 }}>Anterior</button>}
                {Array.from({length:Math.min(pages,8)},(_,i)=>i+1).map(p=>(
                  <button key={p} onClick={()=>doSearch(query,publication,p)} style={{ width:38,height:38,borderRadius:8,border:"2px solid "+(p===page?"#93c5fd":"rgba(255,255,255,0.15)"),background:p===page?"rgba(147,197,253,0.15)":"transparent",color:p===page?"#93c5fd":"#e5e7eb",cursor:"pointer",fontWeight:p===page?700:400,fontSize:14 }}>{p}</button>
                ))}
                {page<pages && <button onClick={()=>doSearch(query,publication,page+1)} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"8px 16px",color:"#e5e7eb",cursor:"pointer",fontSize:13 }}>Siguiente</button>}
              </div>
            )}
          </>
        )}

        {!loading && searched && total === 0 && !journalists.length && (
          <div style={{ textAlign:"center",padding:"40px 0" }}>
            <p style={{ fontSize:20,fontFamily:"Georgia, serif",marginBottom:8 }}>Sin resultados</p>
            <p style={{ fontSize:14,opacity:0.5,marginBottom:32 }}>Proba con otras palabras o explora las categorias populares</p>
            {suggestions?.relatedCategories?.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <p style={{ fontSize:12,opacity:0.5,textTransform:"uppercase",letterSpacing:1,marginBottom:12 }}>Categorias relacionadas</p>
                <div style={{ display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap" }}>
                  {suggestions.relatedCategories.map(cat=>(
                    <button key={cat} onClick={()=>{setQuery(cat);doSearch(cat,publication);}} style={{ background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:20,padding:"6px 16px",color:"#e5e7eb",cursor:"pointer",fontSize:13 }}>{cat}</button>
                  ))}
                </div>
              </div>
            )}
            {suggestions?.popularArticles?.length > 0 && (
              <div>
                <p style={{ fontSize:12,opacity:0.5,textTransform:"uppercase",letterSpacing:1,marginBottom:12 }}>Articulos recientes</p>
                <div style={{ display:"flex",flexDirection:"column",gap:8,textAlign:"left" }}>
                  {suggestions.popularArticles.map(a=>(
                    <a key={a.slug} href={"/noticias/"+a.slug} style={{ textDecoration:"none",color:"inherit",padding:"10px 14px",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,fontSize:14,display:"flex",justifyContent:"space-between",gap:10 }}>
                      <span>{a.title}</span>
                      <span style={{ fontSize:11,opacity:0.4,flexShrink:0 }}>{a.category}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!searched && !loading && (
          <div style={{ textAlign:"center",padding:"48px 0",opacity:0.5 }}>
            <p style={{ fontSize:18,fontFamily:"Georgia, serif" }}>Busca en todos los medios de Atlas</p>
            <p style={{ fontSize:14,marginTop:8 }}>Articulos, periodistas, categorias y mas</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuscarPage() {
  return (
    <Suspense fallback={<div style={{ padding:48,textAlign:"center",color:"#e5e7eb",fontFamily:"Arial" }}>Cargando buscador...</div>}>
      <SearchContent />
    </Suspense>
  );
}
