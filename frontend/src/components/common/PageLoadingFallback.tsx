/**
 * Skeleton placeholder shown during lazy chunk loading.
 * Lightweight — no external dependencies.
 */
export function PageLoadingFallback() {
  return (
    <div
      className="space-y-6 animate-pulse"
      data-testid="page-loading-fallback"
    >
      {/* Title skeleton */}
      <div className="h-6 w-48 bg-nps-bg-card rounded" />

      {/* Card row skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="bg-nps-bg-card border border-nps-border rounded-lg p-4 min-h-[72px]"
          >
            <div className="h-3 w-16 bg-nps-bg-hover rounded mb-2" />
            <div className="h-6 w-12 bg-nps-bg-hover rounded" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-nps-bg-card border border-nps-border rounded-lg p-6 space-y-4">
        <div className="h-4 w-64 bg-nps-bg-hover rounded" />
        <div className="h-4 w-full bg-nps-bg-hover rounded" />
        <div className="h-4 w-3/4 bg-nps-bg-hover rounded" />
        <div className="h-4 w-5/6 bg-nps-bg-hover rounded" />
      </div>
    </div>
  );
}
