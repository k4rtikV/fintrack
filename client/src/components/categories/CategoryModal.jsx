import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import CategoryIcon from "../ui/CategoryIcon";

const ICON_OPTIONS = [
  ["circle", "General"],
  ["briefcase", "Work"],
  ["laptop", "Freelance"],
  ["trending-up", "Investment"],
  ["rotate-ccw", "Refund"],
  ["utensils", "Food"],
  ["car", "Transport"],
  ["shopping-bag", "Shopping"],
  ["receipt", "Bills"],
  ["home", "Home"],
  ["film", "Entertainment"],
  ["heart-pulse", "Health"],
  ["graduation-cap", "Education"],
];

const COLOR_OPTIONS = [
  "emerald",
  "blue",
  "cyan",
  "purple",
  "violet",
  "indigo",
  "orange",
  "yellow",
  "pink",
  "rose",
  "red",
  "gray",
];

const initialForm = {
  name: "",
  type: "EXPENSE",
  icon: "circle",
  color: "blue",
};

const CategoryModal = ({ open, category, onClose, onSubmit, saving }) => {
  const [form, setForm] = useState(initialForm);
  const editing = Boolean(category);

  useEffect(() => {
    if (!open) return;

    if (category) {
      setForm({
        name: category.name,
        type: category.type,
        icon: category.icon || "circle",
        color: category.color || "gray",
      });
    } else {
      setForm(initialForm);
    }
  }, [category, open]);

  const canSubmit = useMemo(
    () => form.name.trim().length >= 2 && !saving,
    [form.name, saving],
  );

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = {
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
    };

    if (!editing) payload.type = form.type;
    if (editing && category.isDefault) delete payload.name;

    onSubmit(payload);
  };

  const fieldClassName =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-3 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-500/10";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {editing ? "Edit category" : "New category"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {editing && category.isDefault
                ? "Built-in category names stay fixed, but you can personalize their appearance."
                : "Create a category that will be available throughout FinTrack."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <CategoryIcon icon={form.icon} color={form.color} size={21} />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {form.name.trim() || "Category preview"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {form.type === "EXPENSE" ? "Expense" : "Income"} category
              </p>
            </div>
          </div>

          {!editing && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Type
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
                {["EXPENSE", "INCOME"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateField("type", type)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      form.type === type
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {type === "EXPENSE" ? "Expense" : "Income"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Name
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              maxLength={40}
              disabled={editing && category.isDefault}
              className={`${fieldClassName} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-800`}
              placeholder="e.g. Travel"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Icon
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {ICON_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => updateField("icon", value)}
                  className={`flex justify-center rounded-2xl border p-2.5 transition ${
                    form.icon === value
                      ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/10"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  <CategoryIcon icon={value} color={form.color} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Color
            </p>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-label={`${color} color`}
                  onClick={() => updateField("color", color)}
                  className={`flex justify-center rounded-xl border p-1.5 transition ${
                    form.color === color
                      ? "border-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-500/10"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <CategoryIcon icon="circle" color={color} size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
            >
              {saving ? "Saving..." : editing ? "Save changes" : "Create category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
