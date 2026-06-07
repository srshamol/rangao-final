import { useEffect } from "react";

export function useJsonLd(schema: Record<string, any> | Record<string, any>[] | null) {
  useEffect(() => {
    if (!schema) return;

    const script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("data-jsonld", "dynamic");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [JSON.stringify(schema)]);
}
