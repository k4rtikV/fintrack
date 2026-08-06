const DashboardCard = ({ children, className = "" }) => {
  return (
    <article
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </article>
  );
};

export default DashboardCard;
