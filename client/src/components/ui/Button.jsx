const variants = {
  primary:
    "border border-copper-400/55 bg-copper-500 text-white hover:-translate-y-0.5 hover:bg-copper-400 shadow-sm shadow-copper-950/15 dark:text-slate-950",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-steel-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-steel-700 dark:hover:bg-slate-800",
  danger: "bg-red-500 text-white hover:-translate-y-0.5 hover:bg-red-400",
  ghost:
    "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
};

const Button = ({
  children,
  className = "",
  variant = "primary",
  type = "button",
  ...props
}) => {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-copper-400/70 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
