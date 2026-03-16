const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atlas-media-network.vercel.app";

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: "Atlas Media Network", template: "%s | Atlas Media Network" },
  description: "Red de medios digitales automatizados. Argentina Post y más publicaciones nacionales, provinciales y locales.",
  keywords: ["noticias", "argentina", "mendoza", "política", "economía", "sociedad"],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  openGraph: { type: "website", locale: "es_AR", url: BASE_URL, siteName: "Atlas Media Network" },
  twitter: { card: "summary_large_image", title: "Atlas Media Network" }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "Inter, Arial, sans-serif", background: "#0b1020", color: "#e5e7eb" }}>
        {children}
      </body>
    </html>
  );
}
