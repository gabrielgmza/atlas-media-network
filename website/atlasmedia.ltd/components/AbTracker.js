"use client";
import { useEffect } from "react";

export default function AbTracker({ articleSlug }) {
  useEffect(() => {
    if (!articleSlug) return;
    async function track() {
      try {
        const res = await fetch("/api/ab?article=" + articleSlug);
        const data = await res.json();
        if (!data.ok || !data.experiment) return;
        const exp = data.experiment;
        let variant = sessionStorage.getItem("ab-" + exp.id);
        if (!variant) { variant = Math.random() < 0.5 ? "a" : "b"; sessionStorage.setItem("ab-" + exp.id, variant); }
        await fetch("/api/ab", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view", experimentId: exp.id, variant }) });
        if (variant === "b" && exp.title_b) {
          const h1 = document.querySelector("h1[data-ab-title]");
          if (h1) h1.textContent = exp.title_b;
          document.title = exp.title_b + document.title.substring(document.title.indexOf(" |"));
        }
      } catch {}
    }
    track();
  }, [articleSlug]);
  return null;
}
