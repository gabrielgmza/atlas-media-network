"use client";
import { useState, useEffect } from "react";

export default function AdSlot({ publicationId, position, style={} }) {
  const [ad, setAd] = useState(null);
  useEffect(() => {
    fetch("/api/monetization/ads?publication="+publicationId+"&position="+position).then(r=>r.json()).then(data=>{if(data.ok&&data.ad)setAd(data.ad);}).catch(()=>{});
  }, [publicationId, position]);
  if (!ad) return null;
  const sizes={header:{width:"100%",height:90,maxWidth:728},breaking:{width:"100%",height:60,maxWidth:400},inline:{width:"100%",height:120,maxWidth:600},sidebar:{width:300,height:250},footer:{width:"100%",height:90,maxWidth:728}};
  const size=sizes[position]||{width:"100%",height:90};
  function handleClick() {
    if (ad.ad_url) { fetch("/api/analytics/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"ad_click",campaignId:ad.id,publicationId,position})}).catch(()=>{}); window.open(ad.ad_url,"_blank","noopener noreferrer"); }
  }
  return (
    <div onClick={handleClick} style={{display:"flex",justifyContent:"center",margin:"12px 0",cursor:ad.ad_url?"pointer":"default",...style}}>
      <div style={{width:size.width,maxWidth:size.maxWidth,height:size.height,background:"#f5f5f5",border:"1px solid #e0e0e0",borderRadius:4,overflow:"hidden",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        {ad.ad_html?<div dangerouslySetInnerHTML={{__html:ad.ad_html}} style={{width:"100%",height:"100%"}}/>:ad.ad_image_url?<img src={ad.ad_image_url} alt={ad.ad_title||"Publicidad"} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{textAlign:"center",padding:12}}><div style={{fontWeight:700,fontSize:14,color:"#333"}}>{ad.ad_title||ad.business_name}</div>{ad.ad_url&&<div style={{fontSize:12,color:"#888",marginTop:4}}>{ad.ad_url}</div>}</div>}
        <div style={{position:"absolute",bottom:2,right:4,fontSize:9,color:"#bbb",fontFamily:"Arial"}}>Publicidad</div>
      </div>
    </div>
  );
}
