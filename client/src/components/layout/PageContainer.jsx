const PageContainer = ({ title, description, action, children }) => {
  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {title}
          </h1>

          {description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>

        {action}
      </div>

      {children}
    </div>
  );
};

export default PageContainer;
