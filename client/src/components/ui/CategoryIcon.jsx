import {
  Briefcase,
  Car,
  Circle,
  Film,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Utensils,
} from "lucide-react";

const iconMap = {
  briefcase: Briefcase,
  car: Car,
  circle: Circle,
  film: Film,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  home: Home,
  laptop: Laptop,
  receipt: ReceiptText,
  "rotate-ccw": RotateCcw,
  "shopping-bag": ShoppingBag,
  "trending-up": TrendingUp,
  utensils: Utensils,
};

const colorMap = {
  blue: { background: "#dbeafe", foreground: "#2563eb" },
  cyan: { background: "#cffafe", foreground: "#0891b2" },
  emerald: { background: "#d1fae5", foreground: "#059669" },
  gray: { background: "#e2e8f0", foreground: "#64748b" },
  indigo: { background: "#e0e7ff", foreground: "#4f46e5" },
  orange: { background: "#ffedd5", foreground: "#ea580c" },
  pink: { background: "#fce7f3", foreground: "#db2777" },
  purple: { background: "#f3e8ff", foreground: "#9333ea" },
  red: { background: "#fee2e2", foreground: "#dc2626" },
  rose: { background: "#ffe4e6", foreground: "#e11d48" },
  violet: { background: "#ede9fe", foreground: "#7c3aed" },
  yellow: { background: "#fef9c3", foreground: "#ca8a04" },
};

const CategoryIcon = ({ icon = "circle", color = "gray", size = 18 }) => {
  const Icon = iconMap[icon] || Circle;
  const palette = colorMap[color] || colorMap.gray;

  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{
        backgroundColor: palette.background,
        color: palette.foreground,
      }}
      aria-hidden="true"
    >
      <Icon size={size} strokeWidth={2.2} />
    </span>
  );
};

export default CategoryIcon;
