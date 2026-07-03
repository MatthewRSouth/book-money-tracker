export default function ManageLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-screen-md mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-40 rounded bg-card border border-border" />
        <div className="h-4 w-24 rounded bg-card border border-border" />
      </div>

      {/* Groups table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-border last:border-b-0" />
        ))}
      </div>
    </div>
  );
}
