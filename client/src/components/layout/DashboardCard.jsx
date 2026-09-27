const DashboardCard = ({ children, className = "" }) => {
  return (
    <article
      className={`rounded-2xl border border-slate-200/85 bg-white/92 p-5 shadow-[0_8px_30px_rgba(14,16,17,0.04)] backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-300 dark:border-slate-800 dark:bg-slate-900/88 dark:shadow-black/10 ${className}`}
    >
      {children}
    </article>
  );
};

export default DashboardCard;
