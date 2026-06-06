import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  url?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  // Generate BreadcrumbList Structured Schema.org data
  const baseDomain = typeof window !== "undefined" ? window.location.origin : "https://rangao.com.bd";
  
  const schemaList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "হোম",
        "item": baseDomain
      },
      ...items.map((item, idx) => ({
        "@type": "ListItem",
        "position": idx + 2,
        "name": item.label,
        "item": item.url ? (item.url.startsWith("http") ? item.url : `${baseDomain}${item.url}`) : undefined
      }))
    ]
  };

  return (
    <>
      {/* Schema Injection */}
      <script type="application/ld+json">
        {JSON.stringify(schemaList)}
      </script>

      {/* Visual Navigation */}
      <div className="border-b bg-gradient-to-r from-secondary/50 to-secondary/30">
        <div className="container py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/" className="flex items-center gap-1 transition-colors hover:text-accent font-medium">
              <Home className="h-3 w-3" />
              <span>হোম</span>
            </Link>
            
            {items.map((item, idx) => {
              const isLast = idx === items.length - 1;
              return (
                <div key={idx} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3.5 w-3.5 text-border" />
                  {isLast || !item.url ? (
                    <span className="font-bold text-foreground font-bengali truncate max-w-[150px] sm:max-w-xs" aria-current="page">
                      {item.label}
                    </span>
                  ) : (
                    <Link to={item.url} className="transition-colors hover:text-accent font-bengali font-medium">
                      {item.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
