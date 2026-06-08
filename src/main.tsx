import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "./components/HelmetProvider";
import { initializeTracking } from "@/services/analytics";
import { registerVitals } from "@/utils/vitals";

// Production resilience: Auto-reload on chunk load failures due to new deployments
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    const isChunkError = 
      e.message?.includes("Failed to fetch dynamically imported module") || 
      e.message?.includes("Importing a module script failed") ||
      e.target && (e.target as any).tagName === "SCRIPT" && (e.target as any).src?.includes("/assets/");
    if (isChunkError) {
      console.warn("Chunk load failure detected. Reloading page to fetch the latest version...");
      window.location.reload();
    }
  }, true);

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason?.message || "";
    if (reason.includes("Failed to fetch dynamically imported module") || reason.includes("Importing a module script failed")) {
      console.warn("Unhandled chunk rejection. Reloading...");
      window.location.reload();
    }
  });
}

// Initialize tracking + Web Vitals if user has already given consent
const consent = localStorage.getItem("rangao_cookie_consent");
if (consent === "accepted") {
  initializeTracking();
  registerVitals();
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
