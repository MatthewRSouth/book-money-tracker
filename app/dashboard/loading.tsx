export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-screen-2xl mx-auto animate-pulse">
      {/* Header placeholder */}
      <div className="mb-6 sm:mb-4 flex items-center justify-between">
        <div className="h-6 w-48 rounded bg-card border border-border" />
        <div className="hidden sm:flex gap-4">
          <div className="h-8 w-48 rounded bg-card border border-border" />
          <div className="h-6 w-16 rounded bg-card border border-border" />
        </div>
      </div>

      {/* Tabs row */}
      <div className="mb-6 sm:mx-0 mx-8 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded bg-card border border-border" />
        ))}
      </div>

      {/* Summary bar */}
      <div className="mb-4 h-16 rounded-lg bg-card border border-border" />

      {/* Table rows */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-card border border-border" />
        ))}
      </div>
    </div>
  );
}
