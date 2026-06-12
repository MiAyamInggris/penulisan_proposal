export function DashboardSkeleton({
  cardCount = 4,
  withTable = false,
}: {
  cardCount?: number;
  withTable?: boolean;
}) {
  const gridColsClass =
    cardCount >= 6
      ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-7"
      : cardCount >= 4
      ? "grid-cols-2 md:grid-cols-4"
      : "grid-cols-1 md:grid-cols-3";

  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-64 bg-gray-200 rounded" />
        <div className="h-4 w-40 bg-gray-100 rounded" />
      </div>
      <div className={`grid ${gridColsClass} gap-4`}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>
      {withTable && (
        <div className="space-y-2">
          <div className="h-10 bg-gray-200 rounded-lg" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      )}
    </div>
  );
}
