export const metadata = {
  title: "Atlas Media Network",
  description: "Media infrastructure for digital publications."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, Arial, sans-serif", background: "#0b1020", color: "#e5e7eb" }}>
        {children}
      </body>
    </html>
  );
}
