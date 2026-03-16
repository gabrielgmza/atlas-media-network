"use client";
import { useState, useRef, useEffect } from "react";

export default function LazyImage({ src, alt="", width, height, style={}, priority=false, fallbackColor="#f0f0f0" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(priority);
  const ref = useRef(null);

  useEffect(() => {
    if (priority) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } }, { rootMargin: "200px" });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [priority]);

  const h = typeof height === "number" ? height+"px" : (height || "auto");

  return (
    <div ref={ref} style={{ position:"relative",overflow:"hidden",background:fallbackColor,width:width||"100%",height:h,...style }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {!loaded && !error && <div style={{ position:"absolute",inset:0,background:"linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite" }} />}
      {inView && src && !error && (
        <img src={src} alt={alt} loading={priority?"eager":"lazy"} decoding="async" onLoad={()=>setLoaded(true)} onError={()=>setError(true)} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block",opacity:loaded?1:0,transition:"opacity 0.3s" }} />
      )}
      {error && <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:fallbackColor,color:"#ccc",fontSize:12,fontFamily:"Arial" }}>{alt||"Imagen"}</div>}
    </div>
  );
}
