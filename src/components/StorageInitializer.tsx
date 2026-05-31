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
      });
      console.log("🧹 Legacy storage cache cleared and initialized successfully.");
    } catch (e) {
      console.error("Failed to clear obsolete storage cache:", e);
    }
  }, []);

  return null;
}
