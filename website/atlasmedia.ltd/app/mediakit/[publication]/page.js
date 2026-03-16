"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const scopeColors = { national:"#cc0000",provincial:"#1a6b3c",city:"#1a4a8a",municipal:"#7c3a8a" };
const scopeLabels = { national:"Medio Nacional",provincial:"Medio Provincial",city:"Medio Local",municipal:"Medio Municipal" };
const AD_SLOTS = [
  { position:"breaking",name:"Breaking News Sponsor",size:"400x60",price:400,desc:"Maxima visibilidad en alertas de ultima hora" },
  { position:"header",name:"Header Banner",size:"728x90",price:300,desc:"Primera posicion al cargar la pagina" },
  { position:"inline",name:"Inline Article",size:"600x120",price:200,desc:"Dentro del contenido editorial" },
  { position:"sidebar",name:"Sidebar",size:"300x250",price:150,desc:"Acompanamiento durante toda la lectura" },
  { position:"footer",name:"Footer Banner",size:"728x90",price:100,desc:"Presencia al pie de cada pagina" }
];

export default function PublicationMediaKitPage() {
  const { publication } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ businessName:"",contactName:"",contactEmail:"",contactPhone:"",budget:"",message:"",slot:"" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetch("/api/mediakit?publication=" + publication).then(r=>r.json()).then(d=>{if(d.ok)setData(d);}).catch(()=>{}).finally(()=>setLoading(false));
  }, [publication]);

  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true); setFormError(null);
    try {
      const res = await fetch("/api/mediakit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,publicationId:publication})});
      const d = await res.json();
      if(d.ok) setSubmitted(true); else setFormError(d.error);
    } catch(err){setFormError(err.message);}
    setSubmitting(false);
  }

  if(loading) return <div style={{minHeight:"100vh",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",color:"#888",fontFamily:"Arial"}}>Cargando...</div>;
  if(!data?.publication) return <div style={{minHeight:"100vh",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",color:"#888",fontFamily:"Arial"}}>No encontrado</div>;

  const pub = data.publication;
  const accentColor = scopeColors[pub.scope] || "#1a4a8a";
  const field = {width:"100%",border:"1px solid #ddd",borderRadius:8,padding:"10px 14px",fontSize:14,fontFamily:"Arial",boxSizing:"border-box",outline:"none"};

  return (
    <div style={{background:"#fff",color:"#111",fontFamily:"Arial, sans-serif",minHeight:"100vh"}}>
      <div style={{background:"#0b1020",color:"#fff",padding:"56px 24px 64px",borderBottom:"4px solid "+accentColor}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <a href="/mediakit" style={{color:"#93c5fd",textDecoration:"none",fontSize:13,opacity:0.7}}>- Todos los medios</a>
          <div style={{display:"flex",alignItems:"center",gap:20,marginTop:24,flexWrap:"wrap"}}>
            <div style={{width:64,height:64,borderRadius:14,background:accentColor,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:24,color:"#fff"}}>{pub.name?.charAt(0)}</div>
            <div>
              <div style={{fontSize:12,opacity:0.5,letterSpacing:2,textTransform:"uppercase"}}>{scopeLabels[pub.scope]||"Medio Digital"} - {pub.territory_name}</div>
              <h1 style={{fontSize:40,fontWeight:900,margin:"4px 0 0",lineHeight:1.1}}>{pub.name}</h1>
            </div>
          </div>
          {pub.description && <p style={{fontSize:17,opacity:0.7,marginTop:20,maxWidth:600,lineHeight:1.6}}>{pub.description}</p>}
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"48px 24px 80px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16,marginBottom:48}}>
          {[{label:"Articulos publicados",value:parseInt(data.articles?.total||0).toLocaleString(),sub:"en total",color:accentColor},{label:"Ultimos 30 dias",value:parseInt(data.articles?.last30||0).toLocaleString(),sub:"articulos nuevos",color:"#3b82f6"},{label:"Esta semana",value:parseInt(data.articles?.last7||0).toLocaleString(),sub:"articulos publicados",color:"#22c55e"},{label:"Frecuencia",value:"4x",sub:"publicaciones por dia",color:"#f59e0b"}].map((m,i) => (
            <div key={i} style={{border:"1px solid #e5e7eb",borderTop:"3px solid "+m.color,borderRadius:10,padding:"18px 16px",textAlign:"center"}}>
              <div style={{fontSize:30,fontWeight:800,color:m.color}}>{m.value}</div>
              <div style={{fontSize:13,fontWeight:600,color:"#111",marginTop:4}}>{m.label}</div>
              <div style={{fontSize:12,color:"#888",marginTop:2}}>{m.sub}</div>
            </div>
          ))}
        </div>

        <h2 style={{fontSize:26,fontWeight:800,margin:"0 0 8px"}}>Formatos publicitarios</h2>
        <p style={{color:"#666",marginBottom:24,fontSize:15}}>Precios mensuales por formato. IVA no incluido.</p>
        <div style={{display:"grid",gap:14,marginBottom:48}}>
          {AD_SLOTS.map((slot,i) => (
            <div key={i} style={{border:"1px solid #e5e7eb",borderRadius:10,padding:"16px 20px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
              <div style={{width:80,height:44,background:accentColor+"15",border:"2px dashed "+accentColor+"44",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:accentColor,fontWeight:600,flexShrink:0}}>{slot.size}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:16}}>{slot.name}</div><div style={{fontSize:13,color:"#888",marginTop:2}}>{slot.desc}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:800,color:"#1a6b3c"}}>USD {slot.price}</div><div style={{fontSize:12,color:"#888"}}>por mes</div></div>
            </div>
          ))}
        </div>

        <div style={{border:"2px solid "+accentColor+"33",borderRadius:14,padding:"36px 32px",background:accentColor+"05"}}>
          <h2 style={{fontSize:26,fontWeight:800,margin:"0 0 6px"}}>Contactar al equipo comercial</h2>
          <p style={{color:"#666",margin:"0 0 28px"}}>Completa el formulario y te respondemos en menos de 24 horas.</p>
          {submitted ? (
            <div style={{background:"#22c55e18",border:"1px solid #22c55e44",borderRadius:10,padding:24,textAlign:"center"}}>
              <p style={{fontWeight:700,fontSize:18,margin:"0 0 8px",color:"#1a6b3c"}}>Solicitud recibida!</p>
              <p style={{color:"#555",margin:0}}>El equipo de {pub.name} se pondra en contacto pronto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>EMPRESA *</label><input value={form.businessName} onChange={e=>setForm(f=>({...f,businessName:e.target.value}))} placeholder="Nombre de tu empresa" required style={field}/></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>NOMBRE</label><input value={form.contactName} onChange={e=>setForm(f=>({...f,contactName:e.target.value}))} placeholder="Tu nombre" style={field}/></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>EMAIL *</label><input type="email" value={form.contactEmail} onChange={e=>setForm(f=>({...f,contactEmail:e.target.value}))} placeholder="tu@empresa.com" required style={field}/></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>TELEFONO</label><input value={form.contactPhone} onChange={e=>setForm(f=>({...f,contactPhone:e.target.value}))} placeholder="+54 9 11..." style={field}/></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>FORMATO</label><select value={form.slot} onChange={e=>setForm(f=>({...f,slot:e.target.value}))} style={field}><option value="">Seleccionar...</option>{AD_SLOTS.map(s=><option key={s.position} value={s.position}>{s.name} - USD {s.price}/mes</option>)}<option value="package">Paquete personalizado</option></select></div>
              <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>PRESUPUESTO</label><select value={form.budget} onChange={e=>setForm(f=>({...f,budget:e.target.value}))} style={field}><option value="">Seleccionar...</option><option value="hasta-200">Hasta USD 200/mes</option><option value="200-500">USD 200-500/mes</option><option value="500-1000">USD 500-1000/mes</option><option value="mas-1000">Mas de USD 1000/mes</option></select></div>
              <div style={{gridColumn:"1 / -1"}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>MENSAJE</label><textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Contanos sobre tu empresa y objetivos..." rows={3} style={{...field,resize:"vertical"}}/></div>
              {formError && <div style={{gridColumn:"1 / -1",background:"#ef444418",border:"1px solid #ef444444",borderRadius:8,padding:"10px 14px",color:"#dc2626",fontSize:14}}>{formError}</div>}
              <div style={{gridColumn:"1 / -1"}}><button type="submit" disabled={submitting} style={{background:submitting?"#ccc":accentColor,color:"#fff",border:"none",borderRadius:8,padding:"14px 32px",fontSize:16,fontWeight:700,cursor:submitting?"not-allowed":"pointer",width:"100%"}}>{submitting?"Enviando...":"Solicitar informacion"}</button></div>
            </form>
          )}
        </div>
      </div>

      <footer style={{background:"#0b1020",color:"#fff",padding:"20px 24px",textAlign:"center",fontSize:13,opacity:0.6}}>
        {pub.name} · Atlas Media Network · <a href="/mediakit" style={{color:"#93c5fd",textDecoration:"none"}}>Ver todos los medios</a>
      </footer>
    </div>
  );
}
