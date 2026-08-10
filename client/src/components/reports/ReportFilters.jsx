const inputClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";

const ReportFilters = ({ preset, startDate, endDate, onPresetChange, onDateChange }) => {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {[
          ["this-month", "This month"],
          ["last-month", "Last month"],
          ["last-3-months", "Last 3 months"],
          ["year-to-date", "Year to date"],
          ["custom", "Custom"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onPresetChange(value)}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              preset === value
                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          From
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => onDateChange("startDate", event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          To
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => onDateChange("endDate", event.target.value)}
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
};

export default ReportFilters;
