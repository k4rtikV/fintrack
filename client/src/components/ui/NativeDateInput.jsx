import { CalendarDays } from "lucide-react";

const NativeDateInput = ({
  type = "date",
  className = "",
  inputClassName = "",
  pickerLabel,
  disabled,
  onClick,
  ...props
}) => {
  const handleClick = (event) => {
    onClick?.(event);

    if (event.defaultPrevented || disabled) {
      return;
    }

    const input = event.currentTarget;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // The native click/focus behavior remains as the fallback.
      }
    }
  };

  return (
    <div className={`relative min-w-0 ${className}`}>
      <input
        type={type}
        disabled={disabled}
        onClick={handleClick}
        {...props}
        className={`native-date-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-11 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${inputClassName}`}
        aria-label={props["aria-label"] || pickerLabel}
        title={props.title || pickerLabel}
      />

      <CalendarDays
        size={17}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
};

export default NativeDateInput;
