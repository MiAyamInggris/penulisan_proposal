export function ListPageSkeleton({
  filterCount = 0,
  rows = 6,
}: {
  filterCount?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-56 bg-gray-200 rounded" />
      {filterCount > 0 && (
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: filterCount }).map((_, i) => (
            <div key={i} className="h-9 w-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
