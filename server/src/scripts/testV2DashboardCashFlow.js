import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

const cashFlow = read("client/src/components/dashboard/CashFlowChart.jsx");

assert(
  cashFlow.includes("ComposedChart") && cashFlow.includes("ReferenceLine"),
  "Dashboard cash flow should use a horizon-style composed visualization",
);
assert(
  cashFlow.includes("expenseFlow: -expense"),
  "Expenses must render below the zero horizon",
);
assert(
  cashFlow.includes("netFlow") && cashFlow.includes("var(--ft-copper-bright)"),
  "Net cash flow must render as the copper financial ribbon",
);
assert(
  !cashFlow.includes("<Tooltip") && !cashFlow.includes("<Legend"),
  "Signature cash-flow visualization should avoid stock Recharts tooltip/legend UI",
);
assert(
  cashFlow.includes("prefers-reduced-motion: reduce") &&
    cashFlow.includes("isAnimationActive={!reducedMotion}"),
  "Cash-flow motion must respect reduced-motion preference",
);

assert(
  cashFlow.includes("const currentMonth = chartData[latestIndex]") &&
    cashFlow.includes("Current month"),
  "The persistent summary strip must always represent the latest/current month",
);
assert(
  !cashFlow.includes("pinnedIndex") && !cashFlow.includes("click to pin"),
  "Cash-flow inspection must not use pinning state",
);
assert(
  cashFlow.includes('r={24}') &&
    cashFlow.includes("renderHoverDot") &&
    cashFlow.includes("incomeFlow") &&
    cashFlow.includes("expenseFlow") &&
    cashFlow.includes("netFlow"),
  "Income, expense, and net dots must expose enlarged invisible hover targets",
);
assert(
  cashFlow.includes("hoverPoint.seriesKey") &&
    cashFlow.includes("SERIES_ORDER.filter") &&
    cashFlow.includes("hoverRows"),
  "Floating details must prioritize the hovered series while still showing all three values",
);
assert(
  cashFlow.includes("Hover any dot for details") &&
    cashFlow.includes("pointer-events-none absolute z-30") &&
    cashFlow.includes("hoverPoint.payload?.label"),
  "Hovering a graph dot must show a compact floating detail box next to that point",
);
assert(
  cashFlow.includes('tabIndex={0}') && cashFlow.includes("onFocus={showDetails}"),
  "Dot inspection must remain keyboard accessible without requiring click/pinning",
);

console.log("FinTrack v2 dashboard cash-flow visualization regression tests passed.");
