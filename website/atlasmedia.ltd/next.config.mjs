/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "**.unsplash.com" }
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256]
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/:path*.(ico|png|jpg|jpeg|gif|svg|webp|avif|woff|woff2)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/api/categories/:path*", headers: [{ key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" }] },
      { source: "/api/articles/:path*", headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" }] },
      { source: "/noticias/:slug", headers: [{ key: "Cache-Control", value: "public, s-maxage=600, stale-while-revalidate=1200" }] }
    ];
  }
};

export default nextConfig;
