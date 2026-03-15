import { revalidatePath } from "next/cache";
import { atlasPublications, getJournalistsByPublication } from "../../lib/atlas-config";

export const dynamic = "force-dynamic";

async function publishArticle(formData) {
  "use server";

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const publication = String(formData.get("publication") || "").trim();
  const authorId = String(formData.get("authorId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const excerpt = String(formData.get("excerpt") || "").trim();
  const category = String(formData.get("category") || "").trim();

  const content = String(formData.get("content") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!publication || !authorId || !title || !excerpt || !category || content.length === 0) {
    throw new Error("MISSING_REQUIRED_FIELDS");
  }

  const response = await fetch(`${baseUrl}/api/articles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-atlas-admin-token": process.env.ATLAS_ADMIN_TOKEN || ""
    },
    body: JSON.stringify({
      publication,
      title,
      slug,
      excerpt,
      category,
      authorId,
      content
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`FAILED_TO_PUBLISH_ARTICLE: ${text}`);
  }

  revalidatePath("/");
  revalidatePath("/argentina-post");
  revalidatePath("/argentina-post-mendoza");
  revalidatePath("/admin");
}

export default function AdminPage({ searchParams }) {
  const selectedPublication =
    typeof searchParams?.publication === "string" ? searchParams.publication : "";

  const availableJournalists = selectedPublication
    ? getJournalistsByPublication(selectedPublication)
    : [];

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px", color: "#e5e7eb" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>

      <h1 style={{ fontSize: 48, marginBottom: 12 }}>Atlas Admin</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Publish a new article into the editorial pilot using AI newsroom authors.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        {atlasPublications.map((publication) => (
          <a
            key={publication.id}
            href={`/admin?publication=${publication.id}`}
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: 12,
              textDecoration: "none",
              color: "#fff",
              background:
                selectedPublication === publication.id
                  ? "rgba(147,197,253,0.18)"
                  : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)"
            }}
          >
            {publication.name}
          </a>
        ))}
      </div>

      <form action={publishArticle} style={{ display: "grid", gap: 16 }}>
        <input type="hidden" name="publication" value={selectedPublication} />

        <div>
          <label style={labelStyle}>Publication</label>
          <input
            value={
              atlasPublications.find((p) => p.id === selectedPublication)?.name || "Select a publication above"
            }
            readOnly
            style={{ ...fieldStyle, opacity: 0.8 }}
          />
        </div>

        <div>
          <label style={labelStyle}>Journalist</label>
          <select name="authorId" required style={fieldStyle} disabled={!selectedPublication}>
            <option value="">
              {selectedPublication ? "Select journalist" : "Choose a publication first"}
            </option>
            {availableJournalists.map((journalist) => (
              <option key={journalist.id} value={journalist.id}>
                {journalist.name} — {journalist.role}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Title</label>
          <input name="title" placeholder="Title" required style={fieldStyle} disabled={!selectedPublication} />
        </div>

        <div>
          <label style={labelStyle}>Slug</label>
          <input name="slug" placeholder="Slug (optional)" style={fieldStyle} disabled={!selectedPublication} />
        </div>

        <div>
          <label style={labelStyle}>Excerpt</label>
          <input name="excerpt" placeholder="Excerpt" required style={fieldStyle} disabled={!selectedPublication} />
        </div>

        <div>
          <label style={labelStyle}>Category</label>
          <input name="category" placeholder="Category" required style={fieldStyle} disabled={!selectedPublication} />
        </div>

        <div>
          <label style={labelStyle}>Content</label>
          <textarea
            name="content"
            placeholder="One paragraph per line"
            required
            rows={10}
            style={{ ...fieldStyle, resize: "vertical" }}
            disabled={!selectedPublication}
          />
        </div>

        <button
          type="submit"
          disabled={!selectedPublication}
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            opacity: selectedPublication ? 1 : 0.55,
            cursor: selectedPublication ? "pointer" : "not-allowed"
          }}
        >
          Publish article
        </button>
      </form>
    </main>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontSize: 14,
  opacity: 0.8
};

const fieldStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  font: "inherit"
};
