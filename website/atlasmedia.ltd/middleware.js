import { NextResponse } from "next/server";

const INTERNAL_DOMAINS = ["atlas-media-network.vercel.app", "atlasmedia.ltd", "localhost"];

export async function middleware(request) {
  const hostname = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;
  const isInternal = INTERNAL_DOMAINS.some(d => hostname.includes(d));
  if (isInternal) return NextResponse.next();
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.startsWith("/favicon")) return NextResponse.next();

  try {
    const baseUrl = "https://atlas-media-network.vercel.app";
    const res = await fetch(baseUrl + "/api/domains?hostname=" + encodeURIComponent(hostname), { headers: { "x-internal-request": process.env.ATLAS_ADMIN_TOKEN || "" } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.publication) {
        const slug = data.publication.slug;
        if (pathname === "/" || pathname === "") return NextResponse.rewrite(new URL("/" + slug, request.url));
        if (pathname.startsWith("/noticias/")) return NextResponse.next();
        return NextResponse.rewrite(new URL("/" + slug + pathname, request.url));
      }
    }
  } catch {}
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
