"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const atlasPublications = [
  {
    id: "argentina-post",
    name: "Argentina Post",
    categories: ["Politics", "Economy", "International", "Technology", "Society", "Sports", "Opinion", "Business"]
  },
  {
    id: "argentina-post-mendoza",
    name: "Argentina Post Mendoza",
    categories: ["Provincial Politics", "Regional Economy", "Crime", "Society", "Local Business", "Culture", "Sports", "Tourism"]
  }
];

const newsroomRoster = [
  { id: "sofia-morales", name: "Sofia Morales", role: "Political Correspondent", publication: "argentina-post" },
  { id: "lucas-ferrer", name: "Lucas Ferrer", role: "Business Reporter", publication: "argentina-post" },
  { id: "camila-rojas", name: "Camila Rojas", role: "Culture Journalist", publication: "argentina-post-mendoza" },
  { id: "marcos-rivas", name: "Marcos Rivas", role: "Crime Reporter", publication: "argentina-post-mendoza" },
  { id: "valentina-quiroga", name: "Valentina Quiroga", role: "Local News Reporter", publication: "argentina-post-mendoza" }
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function AdminForm() {
  const searchParams = useSearchParams();

  const paramPublication = searchParams.get("publication") || "";
  const paramTitle = searchParams.get("title") || "";
  const paramAuthor = searchParams.get("author") || "";
  const paramCategory = searchParams.get("category") || "";

  const [publication, setPublication] = useState(paramPublication || "argentina-post");
  const [authorId, setAuthorId] = useState(paramAuthor || "");
  const [title, setTitle] = useState(paramTitle || "");
  const [slug, setSlug] = useState(slugify(paramTitle));
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState(paramCategory || "");
  const [section, setSection] = useState(paramCategory || "");
  const [status, setStatus] = useState("published");
  const [seoTitle, setSeoTitle] = useState(paramTitle || "");
  const [seoDescription, setSeoDescription] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fromBrief = !!paramTitle;

  const availableJournalists = newsroomRoster.filter(j => j.publication === publication);
  const currentPublication = atlasPublications.find(p => p.id === publication);

  useEffect(() => {
    const valid = availableJournalists.find(j => j.id === authorId);
    if (!valid && !paramAuthor) setAuthorId("");
  }, [publication]);

  useEffect(() => {
    if (title) setSlug(slugify(title));
  }, [title]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const paragraphs = content.split("\n").map(l => l.trim()).filter(Boolean);

    if (!publication || !authorId || !title || !excerpt || !category || !section || paragraphs.length === 0) {
      setErrorMsg("Completá todos los campos requeridos.");
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("atlas-admin-token") || "";
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-atlas-admin-token": token },
        body: JSON.stringify({
          publication, authorId, title, slug, excerpt,
          category, section, status,
          seoTitle: seoTitle || title,
          seoDescription: seoDescription || excerpt,
          content: paragraphs
        })
      });

      const data = await res.json();

      if (data.ok) {
        setSuccessMsg("✓ Artículo publicado correctamente.");
        setTitle(""); setSlug(""); setExcerpt(""); setCategory("");
        setSection(""); setSeoTitle(""); setSeoDescription(""); setContent("");
      } else {
        setErrorMsg(data.error || "Error al publicar.");
      }
    } catch (err) {
      setErrorMsg(err.message);
    }

    setSubmitting(false);
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px", color: "#e5e7eb" }}>
      <a href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>← Atlas Media Network</a>

      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "18px 0 8px", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 42, margin: 0 }}>Atlas Admin</h1>
        {fromBrief && (
          <span style={{
            background: "#7c3aed22", color: "#a78bfa",
            border: "1px solid #7c3aed55", borderRadius: 8,
            padding: "4px 12px", fontSize: 13, fontWeight: 600
          }}>
            📋 Desde brief editorial
          </span>
        )}
      </div>
      <p style={{ opacity: 0.6, marginBottom: 24, fontSize: 14 }}>
        Publicá un artículo nuevo en el piloto editorial.
      </p>

      {successMsg && (
        <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.12)", color: "#dcfce7" }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)", color: "#fecaca" }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
        {atlasPublications.map((pub) => (
          <button key={pub.id} onClick={() => setPublication(pub.id)} style={{
            padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)",
            background: publication === pub.id ? "rgba(147,197,253,0.18)" : "rgba(255,255,255,0.06)",
            color: "#fff", cursor: "pointer", fontWeight: publication === pub.id ? 600 : 400
          }}>{pub.name}</button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>

        <div>
          <label style={labelStyle}>Periodista <span style={{ color: "#ef4444" }}>*</span></label>
          <select value={authorId} onChange={e => setAuthorId(e.target.value)} required style={fieldStyle}>
            <option value="">Seleccionar periodista</option>
            {availableJournalists.map(j => (
              <option key={j.id} value={j.id}>{j.name} — {j.role}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Título <span style={{ color: "#ef4444" }}>*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del artículo" required style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>Slug <span style={{ opacity: 0.5, fontSize: 12 }}>(auto-generado desde el título)</span></label>
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug-del-articulo" style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>Excerpt <span style={{ color: "#ef4444" }}>*</span></label>
          <input value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Resumen breve del artículo" required style={fieldStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Categoría <span style={{ color: "#ef4444" }}>*</span></label>
            <select value={category} onChange={e => { setCategory(e.target.value); setSection(e.target.value); }} required style={fieldStyle}>
              <option value="">Seleccionar categoría</option>
              {(currentPublication?.categories || []).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Sección <span style={{ color: "#ef4444" }}>*</span></label>
            <input value={section} onChange={e => setSection(e.target.value)} placeholder="Sección" required style={fieldStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={fieldStyle}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>SEO Title <span style={{ opacity: 0.5, fontSize: 12 }}>(opcional)</span></label>
          <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="SEO title" style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>SEO Description <span style={{ opacity: 0.5, fontSize: 12 }}>(opcional)</span></label>
          <input value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="SEO description" style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>Contenido <span style={{ color: "#ef4444" }}>*</span> <span style={{ opacity: 0.5, fontSize: 12 }}>(un párrafo por línea)</span></label>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Escribí el artículo aquí. Cada línea se convierte en un párrafo."
            required rows={12}
            style={{ ...fieldStyle, resize: "vertical" }} />
        </div>

        <button type="submit" disabled={submitting} style={{
          padding: "14px 18px", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.14)",
          background: submitting ? "rgba(255,255,255,0.04)" : "rgba(59,130,246,0.8)",
          color: "#fff", cursor: submitting ? "not-allowed" : "pointer",
          fontWeight: 600, fontSize: 15, opacity: submitting ? 0.6 : 1
        }}>
          {submitting ? "Publicando..." : "Publicar artículo"}
        </button>
      </form>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ color: "#e5e7eb", padding: 48 }}>Cargando...</div>}>
      <AdminForm />
    </Suspense>
  );
}

const labelStyle = { display: "block", marginBottom: 8, fontSize: 14, opacity: 0.8 };

const fieldStyle = {
  width: "100%", padding: "12px 16px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)", color: "#fff", font: "inherit",
  boxSizing: "border-box"
};
