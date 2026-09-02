import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { updateTrackingConfig, trackPageView } from "@/lib/tracking";
import { captureAttribution } from "@/lib/meta/attribution";

export default function TrackingProvider() {
  const { data: settings } = useStoreSettings();
  const location = useLocation();
  const lastPathname = useRef("");

  // Sync settings and initialize tracking deferred to idle time
  useEffect(() => {
    const run = () => {
      captureAttribution();

      if (settings?.storeInfo?.tracking) {
        const tracking = settings.storeInfo.tracking;
        updateTrackingConfig(tracking);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(run);
    } else {
      setTimeout(run, 100);
    }
  }, [settings]);

  // Track PageViews on SPA route changes
  useEffect(() => {
    if (location.pathname !== lastPathname.current) {
      lastPathname.current = location.pathname;
      const run = () => {
        captureAttribution();
        trackPageView(location.pathname);
      };

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(run);
      } else {
        setTimeout(run, 50);
      }
    }
  }, [location.pathname]);

  return null;
}
