import { RotateCcw, Search } from "lucide-react";

import Button from "../ui/Button";

const fieldClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const TransactionFilters = ({
  accounts,
  categories,
  filters,
  onChange,
  onReset,
}) => {
  const updateFilter = (key, value) => {
    onChange({
      ...filters,
      [key]: value,
      page: 1,
    });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <label className="relative lg:col-span-3">
        <span className="sr-only">Search transactions</span>
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => updateFilter("search", event.target.value)}
          placeholder="Search title, note, or tag"
          className={`${fieldClassName} pl-10`}
        />
      </label>

      <select
        aria-label="Transaction type"
        value={filters.type}
        onChange={(event) => updateFilter("type", event.target.value)}
        className={`${fieldClassName} lg:col-span-2`}
      >
        <option value="">All types</option>
        <option value="INCOME">Income</option>
        <option value="EXPENSE">Expense</option>
      </select>

      <select
        aria-label="Account"
        value={filters.accountId}
        onChange={(event) => updateFilter("accountId", event.target.value)}
        className={`${fieldClassName} lg:col-span-2`}
      >
        <option value="">All accounts</option>
        {accounts.map((account) => (
          <option key={account._id} value={account._id}>
            {account.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Category"
        value={filters.categoryId}
        onChange={(event) => updateFilter("categoryId", event.target.value)}
        className={`${fieldClassName} lg:col-span-2`}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category._id} value={category._id}>
            {category.name}
          </option>
        ))}
      </select>

      <input
        aria-label="Start date"
        type="date"
        value={filters.startDate}
        onChange={(event) => updateFilter("startDate", event.target.value)}
        className={`${fieldClassName} lg:col-span-1`}
      />

      <input
        aria-label="End date"
        type="date"
        value={filters.endDate}
        onChange={(event) => updateFilter("endDate", event.target.value)}
        className={`${fieldClassName} lg:col-span-1`}
      />

      <Button
        variant="secondary"
        className="lg:col-span-1"
        onClick={onReset}
        title="Reset filters"
      >
        <RotateCcw size={16} />
        <span className="lg:sr-only">Reset</span>
      </Button>
    </div>
  );
};

export default TransactionFilters;
