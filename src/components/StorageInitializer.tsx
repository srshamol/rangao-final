import { useEffect } from "react";

export default function StorageInitializer() {
  useEffect(() => {
    // Clear any obsolete, legacy cache states in localStorage to force a fresh data sync
    try {
      const keysToClear = [
        "store-settings-all",
        "homepage-categories",
        "homepage-products",
        "product-count-by-category"
      ];
      keysToClear.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      console.log("🧹 Legacy storage cache cleared and initialized successfully.");
    } catch (e) {
      console.error("Failed to clear obsolete storage cache:", e);
    }

    // Proactively unregister any legacy service workers and clear cache storage to bypass stale caching
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) console.log("🗑️ Legacy Service Worker unregistered.");
          });
        }
      });
    }

    if (typeof window !== "undefined" && "caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          caches.delete(key).then(() => {
            console.log(`🗑️ Cache Storage cleared: ${key}`);
          });
        });
      });
    }
  }, []);

  return null;
}
