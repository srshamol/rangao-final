import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "./components/HelmetProvider";
import { initializeTracking, isTrackingAllowed } from "@/services/analytics";
import { registerVitals } from "@/utils/vitals";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

// Production resilience: Auto-reload on chunk load failures due to new deployments
if (typeof window !== "undefined") {
  const triggerResilientReload = () => {
    try {
      const lastReload = sessionStorage.getItem("last_chunk_reload");
      const now = Date.now();
      // Only reload if we haven't attempted a reload in the last 15 seconds (prevents loops)
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem("last_chunk_reload", now.toString());
        const url = new URL(window.location.href);
        url.searchParams.set("t", now.toString()); // Force cache bust
        console.warn("Chunk load failure detected. Forcing cache-busted reload to fetch latest deployment:", url.toString());
        window.location.replace(url.toString());
      } else {
        console.error("Multiple chunk load failures detected within 15s. Halting auto-reload to prevent loop.");
      }
    } catch (err) {
      window.location.reload();
    }
  };

  window.addEventListener("error", (e) => {
    const isChunkError = 
      e.message?.includes("Failed to fetch dynamically imported module") || 
      e.message?.includes("Importing a module script failed") ||
      e.target && (e.target as any).tagName === "SCRIPT" && (e.target as any).src?.includes("/assets/");
    if (isChunkError) {
      triggerResilientReload();
    }
  }, true);

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason?.message || "";
    if (reason.includes("Failed to fetch dynamically imported module") || reason.includes("Importing a module script failed")) {
      triggerResilientReload();
    }
  });
}

// Initialize tracking + Web Vitals seamlessly (unless explicitly opted out via cookie settings)
if (isTrackingAllowed()) {
  initializeTracking();
}
registerVitals();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
    <SpeedInsights />
    <Analytics />
  </HelmetProvider>
);
