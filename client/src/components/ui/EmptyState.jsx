const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex min-h-72 items-center justify-center text-center">
      <div className="max-w-sm">
        {Icon && (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Icon size={25} />
          </div>
        )}

        <h3 className="mt-4 font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </h3>

        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}

        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
};

export default EmptyState;
