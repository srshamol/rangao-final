/**
 * PageSkeleton — branded Suspense fallback for lazy-loaded routes.
 * Uses the shimmer animation defined in tailwind.config.ts.
 */
const PageSkeleton = () => (
  <div className="min-h-screen bg-background flex flex-col">
    {/* ── Navbar skeleton ─────────────────────────────── */}
    <div className="h-16 border-b border-border bg-card flex items-center px-4 gap-4">
      {/* Logo placeholder */}
      <div className="h-8 w-24 rounded-md bg-muted animate-shimmer
                      bg-gradient-to-r from-muted via-muted/50 to-muted
                      bg-[length:200%_100%]" />
      <div className="flex-1" />
      {/* Nav links */}
      <div className="hidden md:flex gap-3">
        {[64, 80, 56].map((w, i) => (
          <div
            key={i}
            style={{ width: w }}
            className="h-4 rounded-sm bg-muted animate-shimmer
                       bg-gradient-to-r from-muted via-muted/50 to-muted
                       bg-[length:200%_100%]"
          />
        ))}
      </div>
      {/* Icons */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-8 w-8 rounded-full bg-muted animate-shimmer
                     bg-gradient-to-r from-muted via-muted/50 to-muted
                     bg-[length:200%_100%]"
        />
      ))}
    </div>

    {/* ── Hero / content area skeleton ────────────────── */}
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Hero banner placeholder */}
      <div className="w-full h-48 sm:h-64 md:h-80 rounded-2xl bg-muted animate-shimmer
                      bg-gradient-to-r from-muted via-muted/50 to-muted
                      bg-[length:200%_100%]" />

      {/* Section title */}
      <div className="h-6 w-48 rounded-md bg-muted animate-shimmer
                      bg-gradient-to-r from-muted via-muted/50 to-muted
                      bg-[length:200%_100%]" />

      {/* Product cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            {/* Card image */}
            <div className="aspect-square rounded-xl bg-muted animate-shimmer
                            bg-gradient-to-r from-muted via-muted/50 to-muted
                            bg-[length:200%_100%]" />
            {/* Card title */}
            <div className="h-4 rounded-sm bg-muted animate-shimmer
                            bg-gradient-to-r from-muted via-muted/50 to-muted
                            bg-[length:200%_100%]" />
            {/* Price */}
            <div className="h-4 w-16 rounded-sm bg-muted animate-shimmer
                            bg-gradient-to-r from-muted via-muted/50 to-muted
                            bg-[length:200%_100%]" />
          </div>
        ))}
      </div>
    </div>

    {/* ── Rangao wordmark at centre while loading ──────── */}
    <div className="flex justify-center pb-8">
      <p className="text-xs text-muted-foreground tracking-widest uppercase opacity-60">
        রাঙাও · Rangao
      </p>
    </div>
  </div>
);

export default PageSkeleton;
