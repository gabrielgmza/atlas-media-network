"use client";
import { useState, useEffect } from "react";

const TONES = ["neutral informativo","analitico","critico","humano cercano","formal institucional","urgente","opinionado","investigativo","local costumbrista"];
const BEATS = ["politica","economia","sociedad","policiales","internacionales","tecnologia","cultura","deportes","turismo","medio ambiente","salud","educacion","general"];

function getInitials(name) { return (name||"?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase(); }

export default function RedaccionPage() {
  const [journalists, setJournalists] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPub, setFilterPub] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  async function loadData() {
    try {
      const [jRes, pRes] = await Promise.all([fetch("/api/journalists"), fetch("/api/expansion/launch")]);
      const [jData, pData] = await Promise.all([jRes.json(), pRes.json()]);
      if (jData.ok) setJournalists(jData.journalists);
      if (pData.ok) setPublications(pData.publications);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function startEdit(journalist) {
    setEditing(journalist.id);
    setForm({ name: journalist.name||"", role: journalist.role||"", bio: journalist.bio||"", tone: journalist.tone||"", style: journalist.style||"", beat: journalist.beat||"", personality: journalist.personality||"", active: journalist.active !== false });
    setMsg(null);
  }

  async function handleSave() {
    setSaving(true); setMsg(null);
    try {
      const token = localStorage.getItem("atlas-admin-token") || "";
      const res = await fetch("/api/journalists", { method: "PATCH", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ id: editing, ...form }) });
      const data = await res.json();
      if (data.ok) { setMsg({ type: "success", text: "Guardado." }); setJournalists(prev => prev.map(j => j.id === editing ? { ...j, ...data.journalist } : j)); setTimeout(() => { setEditing(null); setMsg(null); }, 1500); }
      else setMsg({ type: "error", text: data.error });
    } catch (err) { setMsg({ type: "error", text: err.message }); }
    setSaving(false);
  }

  async function toggleActive(journalist) {
    const token = localStorage.getItem("atlas-admin-token") || "";
    const res = await fetch("/api/journalists", { method: "PATCH", headers: { "Content-Type": "application/json", "x-atlas-admin-token": token }, body: JSON.stringify({ id: journalist.id, active: !journalist.active }) });
    const data = await res.json();
    if (data.ok) setJournalists(prev => prev.map(j => j.id === journalist.id ? { ...j, active: !journalist.active } : j));
  }

  const filtered = filterPub ? journalists.filter(j => j.publication_id === filterPub) : journalists;
  const byPub = {};
  filtered.forEach(j => { const key = j.publication_name||"Sin publicacion"; if(!byPub[key]) byPub[key]=[]; byPub[key].push(j); });
  const field = { width:"100%",background:"#1e2a3a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"9px 14px",color:"#e5e7eb",fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"Arial" };

  return (
    <div style={{ minHeight:"100vh",background:"#0b1020",color:"#e5e7eb",paddingBottom:80 }}>
      <div style={{ padding:"20px 32px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:16 }}>
          <a href="/control" style={{ color:"#93c5fd",textDecoration:"none",fontSize:13 }}>- Panel de control</a>
          <div style={{ width:1,height:20,background:"rgba(255,255,255,0.15)" }} />
          <span style={{ fontWeight:700,fontSize:16 }}>Gestion de periodistas</span>
          <span style={{ background:"rgba(255,255,255,0.08)",borderRadius:20,padding:"2px 10px",fontSize:12 }}>{journalists.length} periodistas</span>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <a href="/periodistas" target="_blank" rel="noopener noreferrer" style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 14px",color:"#93c5fd",textDecoration:"none",fontSize:13 }}>Ver redaccion publica</a>
          <button onClick={loadData} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 14px",color:"#93c5fd",cursor:"pointer",fontSize:13 }}>Refrescar</button>
        </div>
      </div>

      <div style={{ maxWidth:1100,margin:"0 auto",padding:"24px 32px" }}>
        <div style={{ display:"flex",gap:8,marginBottom:24,flexWrap:"wrap" }}>
          <button onClick={()=>setFilterPub("")} style={{ background:!filterPub?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 16px",color:!filterPub?"#fff":"#9ca3af",cursor:"pointer",fontSize:13 }}>Todos</button>
          {publications.map(p=><button key={p.id} onClick={()=>setFilterPub(p.id)} style={{ background:filterPub===p.id?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 16px",color:filterPub===p.id?"#fff":"#9ca3af",cursor:"pointer",fontSize:13 }}>{p.name}</button>)}
        </div>

        {loading && <p style={{ opacity:0.5,textAlign:"center",padding:60 }}>Cargando...</p>}

        {!loading && Object.entries(byPub).map(([pubName,pj]) => (
          <div key={pubName} style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:14,fontWeight:700,opacity:0.5,margin:"0 0 16px",textTransform:"uppercase",letterSpacing:2,borderBottom:"1px solid rgba(255,255,255,0.08)",paddingBottom:10 }}>{pubName}</h2>
            <div style={{ display:"grid",gap:12 }}>
              {pj.map(journalist => (
                <div key={journalist.id} style={{ border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,background:"rgba(255,255,255,0.02)",overflow:"hidden" }}>
                  <div style={{ padding:"16px 20px",display:"flex",alignItems:"center",gap:14,cursor:"pointer" }} onClick={()=>editing===journalist.id?setEditing(null):startEdit(journalist)}>
                    <div style={{ width:44,height:44,borderRadius:"50%",background:journalist.active?"#4f46e5":"#374151",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,flexShrink:0 }}>{getInitials(journalist.name)}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700,fontSize:15 }}>{journalist.name}</div>
                      <div style={{ fontSize:12,opacity:0.5,marginTop:2 }}>{journalist.role}{journalist.beat&&" · "+journalist.beat}{journalist.tone&&" · "+journalist.tone}</div>
                    </div>
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      <span style={{ fontSize:12,opacity:0.4 }}>{journalist.article_count||0} art.</span>
                      <span style={{ background:journalist.active?"#22c55e22":"#6b728022",color:journalist.active?"#22c55e":"#6b7280",border:"1px solid "+(journalist.active?"#22c55e44":"#6b728044"),borderRadius:6,padding:"2px 8px",fontSize:11 }}>{journalist.active?"activo":"inactivo"}</span>
                      <span style={{ fontSize:12,opacity:0.4 }}>{editing===journalist.id?"▲":"▼"}</span>
                    </div>
                  </div>

                  {editing === journalist.id && (
                    <div style={{ padding:"0 20px 20px",borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                      {msg && <div style={{ background:msg.type==="success"?"#22c55e22":"#ef444422",border:"1px solid "+(msg.type==="success"?"#22c55e":"#ef4444"),borderRadius:8,padding:"8px 14px",margin:"14px 0",fontSize:13,color:msg.type==="success"?"#86efac":"#fca5a5" }}>{msg.text}</div>}
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:16 }}>
                        <div><label style={{ display:"block",fontSize:11,opacity:0.5,marginBottom:5 }}>NOMBRE</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={field}/></div>
                        <div><label style={{ display:"block",fontSize:11,opacity:0.5,marginBottom:5 }}>ROL</label><input value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} placeholder="Ej: Redactora senior" style={field}/></div>
                        <div><label style={{ display:"block",fontSize:11,opacity:0.5,marginBottom:5 }}>ESPECIALIDAD</label><select value={form.beat} onChange={e=>setForm(f=>({...f,beat:e.target.value}))} style={field}><option value="">Seleccionar...</option>{BEATS.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
                        <div><label style={{ display:"block",fontSize:11,opacity:0.5,marginBottom:5 }}>TONO</label><select value={form.tone} onChange={e=>setForm(f=>({...f,tone:e.target.value}))} style={field}><option value="">Seleccionar...</option>{TONES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                        <div style={{ gridColumn:"1 / -1" }}><label style={{ display:"block",fontSize:11,opacity:0.5,marginBottom:5 }}>ESTILO DE ESCRITURA</label><input value={form.style} onChange={e=>setForm(f=>({...f,style:e.target.value}))} placeholder="Oraciones cortas, piramide invertida, datos precisos..." style={field}/></div>
                        <div style={{ gridColumn:"1 / -1" }}><label style={{ display:"block",fontSize:11,opacity:0.5,marginBottom:5 }}>PERSONALIDAD</label><input value={form.personality} onChange={e=>setForm(f=>({...f,personality:e.target.value}))} placeholder="Curiosa, directa, empatica con el lector..." style={field}/></div>
                        <div style={{ gridColumn:"1 / -1" }}><label style={{ display:"block",fontSize:11,opacity:0.5,marginBottom:5 }}>BIO (perfil publico)</label><textarea value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} rows={3} placeholder="Descripcion breve del periodista..." style={{...field,resize:"vertical"}}/></div>
                        <div><label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13 }}><input type="checkbox" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))}/>Periodista activo</label></div>
                      </div>
                      <div style={{ display:"flex",gap:10,marginTop:16 }}>
                        <button onClick={handleSave} disabled={saving} style={{ background:saving?"rgba(255,255,255,0.05)":"#4f46e5",border:"none",borderRadius:8,padding:"9px 20px",color:"#fff",cursor:saving?"not-allowed":"pointer",fontWeight:600,fontSize:14,opacity:saving?0.6:1 }}>{saving?"Guardando...":"Guardar cambios"}</button>
                        <button onClick={()=>setEditing(null)} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 16px",color:"#9ca3af",cursor:"pointer",fontSize:14 }}>Cancelar</button>
                        <button onClick={()=>toggleActive(journalist)} style={{ background:journalist.active?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)",border:"1px solid "+(journalist.active?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"),borderRadius:8,padding:"9px 16px",color:journalist.active?"#fca5a5":"#86efac",cursor:"pointer",fontSize:14,marginLeft:"auto" }}>{journalist.active?"Desactivar":"Activar"}</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {!loading && journalists.length === 0 && (
          <div style={{ textAlign:"center",padding:"60px 0",opacity:0.4 }}>
            <p style={{ fontSize:18 }}>No hay periodistas todavia</p>
            <p style={{ fontSize:14 }}>Se crean automaticamente cuando se ejecuta el pipeline</p>
          </div>
        )}
      </div>
    </div>
  );
}
