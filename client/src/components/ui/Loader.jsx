const Loader = ({ label = "Loading…" }) => {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
};

export default Loader;
