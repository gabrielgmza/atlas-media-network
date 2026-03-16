"use client";

const shimmer = `@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;

function SkeletonBox({ width="100%", height=16, borderRadius=4, style={} }) {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ width, height:typeof height==="number"?height+"px":height, borderRadius, background:"linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.5s infinite", flexShrink:0, ...style }} />
    </>
  );
}

export function ArticleCardSkeleton() {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
      <SkeletonBox height={180} borderRadius={8} />
      <SkeletonBox height={10} width="40%" />
      <SkeletonBox height={18} />
      <SkeletonBox height={18} width="85%" />
      <SkeletonBox height={13} width="60%" />
    </div>
  );
}

export function ArticleListSkeleton({ count=5 }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
      {Array.from({length:count}).map((_,i) => (
        <div key={i} style={{ display:"flex",gap:14,paddingBottom:20,borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <SkeletonBox width={80} height={60} borderRadius={6} />
          <div style={{ flex:1,display:"flex",flexDirection:"column",gap:8 }}>
            <SkeletonBox height={16} />
            <SkeletonBox height={16} width="80%" />
            <SkeletonBox height={12} width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonBox;
