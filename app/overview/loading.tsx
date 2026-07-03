export default function OverviewLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-32 rounded bg-card border border-border" />
        <div className="h-4 w-24 rounded bg-card border border-border" />
      </div>

      {/* Group summary cards */}
      <section className="mb-8">
        <div className="h-3 w-16 rounded bg-card border border-border mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-card border border-border" />
          ))}
        </div>
      </section>

      {/* Table sections */}
      {Array.from({ length: 2 }).map((_, i) => (
        <section key={i} className="mb-8">
          <div className="h-3 w-40 rounded bg-card border border-border mb-3" />
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            {Array.from({ length: 4 }).map((_, r) => (
              <div key={r} className="h-11 border-b border-border last:border-b-0" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
