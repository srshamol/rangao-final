import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "./components/HelmetProvider";
import { initializeTracking } from "@/services/analytics";
import { registerVitals } from "@/utils/vitals";

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
