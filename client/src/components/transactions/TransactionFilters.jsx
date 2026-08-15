import { CalendarDays, RotateCcw, Search } from "lucide-react";

import Button from "../ui/Button";
import NativeDateInput from "../ui/NativeDateInput";
import {
  addDaysToDateKey,
  getDateKeyInTimeZone,
  getMonthStartKey,
  getYearStartKey,
} from "../../utils/dateUtils";

const fieldClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const TransactionFilters = ({ accounts, categories, filters, onChange, onReset, timezone }) => {
  const updateFilter = (key, value) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  const applyPreset = (preset) => {
    const today = getDateKeyInTimeZone(new Date(), timezone);
    let startDate = "";
    let endDate = today;

    if (preset === "7_DAYS") {
      startDate = addDaysToDateKey(today, -6);
    } else if (preset === "MONTH") {
      startDate = getMonthStartKey(today);
    } else if (preset === "YEAR") {
      startDate = getYearStartKey(today);
    } else {
      endDate = "";
    }

    onChange({ ...filters, startDate, endDate, page: 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <CalendarDays size={16} /> Quick range
        </span>
        {[
          ["7_DAYS", "Last 7 days"],
          ["MONTH", "This month"],
          ["YEAR", "This year"],
          ["ALL", "All time"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => applyPreset(value)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <label className="relative lg:col-span-3">
          <span className="sr-only">Search transactions</span>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="transaction-search"
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search transactions..."
            maxLength={100}
            className={`${fieldClassName} pl-10`}
          />
        </label>

        <select aria-label="Transaction type" value={filters.type} onChange={(event) => updateFilter("type", event.target.value)} className={`${fieldClassName} lg:col-span-2`}>
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>

        <select aria-label="Account" value={filters.accountId} onChange={(event) => updateFilter("accountId", event.target.value)} className={`${fieldClassName} lg:col-span-2`}>
          <option value="">All accounts</option>
          {accounts.map((account) => <option key={account._id} value={account._id}>{account.name}</option>)}
        </select>

        <select aria-label="Category" value={filters.categoryId} onChange={(event) => updateFilter("categoryId", event.target.value)} className={`${fieldClassName} lg:col-span-2`}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
        </select>

        <select aria-label="Sort transactions" value={`${filters.sortBy}:${filters.sortOrder}`} onChange={(event) => {
          const [sortBy, sortOrder] = event.target.value.split(":");
          onChange({ ...filters, sortBy, sortOrder, page: 1 });
        }} className={`${fieldClassName} lg:col-span-2`}>
          <option value="transactionDate:desc">Newest first</option>
          <option value="transactionDate:asc">Oldest first</option>
          <option value="amount:desc">Highest amount</option>
          <option value="amount:asc">Lowest amount</option>
          <option value="title:asc">Title A–Z</option>
        </select>

        <Button variant="secondary" className="lg:col-span-1" onClick={onReset} title="Reset filters">
          <RotateCcw size={16} />
          <span className="lg:sr-only">Reset</span>
        </Button>

        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500 lg:col-span-2 dark:text-slate-400">
          Start date
          <NativeDateInput
            type="date"
            value={filters.startDate}
            max={filters.endDate || undefined}
            onChange={(event) => updateFilter("startDate", event.target.value)}
            pickerLabel="Choose transaction start date"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500 lg:col-span-2 dark:text-slate-400">
          End date
          <NativeDateInput
            type="date"
            value={filters.endDate}
            min={filters.startDate || undefined}
            onChange={(event) => updateFilter("endDate", event.target.value)}
            pickerLabel="Choose transaction end date"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500 lg:col-span-2 dark:text-slate-400">
          Rows
          <select aria-label="Rows per page" value={filters.limit} onChange={(event) => updateFilter("limit", Number(event.target.value))} className={fieldClassName}>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </label>
      </div>
    </div>
  );
};

export default TransactionFilters;
