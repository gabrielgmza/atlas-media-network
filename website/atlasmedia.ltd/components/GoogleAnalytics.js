"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-KZRFZEJSZV";

export function trackEvent(action, category, label, value) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, { event_category: category, event_label: label, value });
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (typeof window === "undefined" || !window.gtag) return;
    const url = pathname + (searchParams.toString() ? "?" + searchParams.toString() : "");
    window.gtag("config", GA_ID, { page_path: url });
  }, [pathname, searchParams]);
  return null;
}
