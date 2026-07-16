export function Bone({ className = "", style }) {
  return <div className={`animate-pulse bg-gray-150 rounded-md ${className}`} style={style} />;
}

export function SkeletonStatTile() {
  return (
    <div className="bg-white rounded-2xl border border-gray-150 shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <Bone className="h-3.5 w-20" />
        <Bone className="w-8 h-8 rounded-lg" />
      </div>
      <Bone className="h-6 w-24 mb-2" />
      <Bone className="h-3 w-16" />
    </div>
  );
}

export function SkeletonCard({ rows = 4, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-150 shadow-card p-6 ${className}`}>
      <Bone className="h-4 w-32 mb-5" />
      <div className="space-y-3.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="w-8 h-8 rounded-lg shrink-0" />
            <Bone className="h-3.5 flex-1" />
            <Bone className="h-3.5 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, title = true, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-150 shadow-card p-6 ${className}`}>
      {title && <Bone className="h-4 w-32 mb-5" />}
      <div className="space-y-3">
        <div className="flex gap-4 pb-3 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, i) => (
            <Bone key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 py-1">
            {Array.from({ length: cols }).map((_, c) => (
              <Bone key={c} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 260, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-150 shadow-card p-6 ${className}`}>
      <Bone className="h-4 w-40 mb-5" />
      <Bone className="w-full rounded-xl" style={{ height }} />
    </div>
  );
}
