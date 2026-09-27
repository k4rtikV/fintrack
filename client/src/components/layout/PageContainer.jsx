const PageContainer = ({ title, description, action, children }) => {
  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {title}
          </h1>

          {description && (
            <p className="mx-auto mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-2">
            {action}
          </div>
        )}
      </div>

      {children}
    </div>
  );
};

export default PageContainer;
