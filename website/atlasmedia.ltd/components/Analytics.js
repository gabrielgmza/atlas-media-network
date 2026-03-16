"use client";
import { useEffect } from "react";

export default function Analytics({ publicationId, articleSlug, articleId }) {
  useEffect(() => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicationId, articleSlug: articleSlug||null, articleId: articleId||null, referrer: document.referrer||null })
    }).catch(() => {});
  }, [publicationId, articleSlug, articleId]);
  return null;
}
