import NativeDateInput from "../ui/NativeDateInput";

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

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          From
          <NativeDateInput
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => onDateChange("startDate", event.target.value)}
            inputClassName="font-medium text-slate-700 dark:text-slate-200"
            pickerLabel="Choose report start date"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          To
          <NativeDateInput
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => onDateChange("endDate", event.target.value)}
            inputClassName="font-medium text-slate-700 dark:text-slate-200"
            pickerLabel="Choose report end date"
          />
        </label>
      </div>
    </div>
  );
};

export default ReportFilters;
