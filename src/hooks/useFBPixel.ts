import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { initFBPixel, trackPageView, trackTimeOnPage, trackPageScroll } from "@/lib/fbpixel";
import { supabase } from "@/integrations/supabase/client";

import clientParamBuilder from "meta-capi-param-builder-clientjs";

export function useFBPixelInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load pixel ID from store_settings
    supabase
      .from("store_settings")
      .select("value")
      .eq("key", "facebook_pixel")
      .maybeSingle()
      .then(({ data }) => {
        const config = data?.value as any;
        if (config?.enabled && config?.pixel_id) {
          initFBPixel(config.pixel_id);
        }
      });

    // Initialize CAPI Parameter Builder
    try {
      clientParamBuilder.processAndCollectAllParams(window.location.href)
        .then(() => {
          console.log("[CAPI Param Builder] Parameters successfully collected.");
        })
        .catch((err) => {
          console.error("[CAPI Param Builder] Processing error:", err);
        });
    } catch (e) {
      console.error("[CAPI Param Builder] Initialization error:", e);
    }
  }, []);
}

export function useFBPageView() {
  const location = useLocation();
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
}

export function useFBCustomEvents() {
  useEffect(() => {
    // TimeOnPage: fire after 30s
    const timer = setTimeout(() => {
      trackTimeOnPage(30);
    }, 30000);

    // PageScroll 50%
    let scrolled50 = false;
    const onScroll = () => {
      const percent =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (percent >= 50 && !scrolled50) {
        scrolled50 = true;
        trackPageScroll(50);
      }
    };
    window.addEventListener("scroll", onScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
}
