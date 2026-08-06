const SkeletonBlock = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 ${className}`}
  />
);

const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-36" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <SkeletonBlock className="h-[410px]" />
        <SkeletonBlock className="h-[410px]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-80" />
      </div>
    </div>
  );
};

export default DashboardSkeleton;
