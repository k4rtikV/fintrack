import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const navigation = read("client/src/navigation/primaryNavigation.jsx");
const topbar = read("client/src/components/layout/Topbar.jsx");
const topNavigation = read("client/src/components/layout/TopNavigation.jsx");
const layout = read("client/src/layouts/DashboardLayout.jsx");
const animatedOutlet = read("client/src/components/layout/AnimatedOutlet.jsx");
const styles = read("client/src/index.css");
const app = read("client/src/App.jsx");
const button = read("client/src/components/ui/Button.jsx");
const pageContainer = read("client/src/components/layout/PageContainer.jsx");
const userMenu = read("client/src/components/layout/UserMenu.jsx");
const categoriesPage = read("client/src/pages/CategoriesPage.jsx");
const indexHtml = read("client/index.html");
const favicon = read("client/public/favicon.svg");

const orderedPaths = [
  "/dashboard",
  "/accounts",
  "/transactions",
  "/budgets",
  "/investments",
  "/goals",
  "/reports",
  "/assistant",
];

let lastIndex = -1;
for (const route of orderedPaths) {
  const nextIndex = navigation.indexOf(`path: \"${route}\"`);
  assert(nextIndex > lastIndex, `Primary navigation order is wrong around ${route}`);
  lastIndex = nextIndex;
}

assert(
  navigation.includes('["/categories", "/transactions"]') &&
    navigation.includes('["/recurring", "/transactions"]'),
  "Legacy Recurring/Categories routes must resolve to Transactions in primary navigation",
);
assert(
  navigation.includes('return toIndex > fromIndex ? "forward" : "backward"'),
  "Directional navigation comparison is missing",
);
assert(topbar.includes("<TopNavigation />"), "Topbar must render primary navigation");
assert(
  !layout.includes("Sidebar") && !exists("client/src/components/layout/Sidebar.jsx"),
  "Sidebar must be removed from the v2 shell",
);
assert(
  layout.includes("<AnimatedOutlet />"),
  "Dashboard layout must use the centralized AnimatedOutlet",
);
assert(
  animatedOutlet.match(/<Outlet\s*\/>/g)?.length === 1,
  "AnimatedOutlet must keep a single mounted route outlet",
);
assert(
  !animatedOutlet.includes("previousOutlet") && !animatedOutlet.includes("cloneElement"),
  "Route animation must not double-mount outgoing pages",
);
assert(
  styles.includes("--color-copper-500: #b56f46") &&
    styles.includes("--color-steel-500: #5e8993") &&
    styles.includes("--ft-blue-steel: #121b25") &&
    styles.includes("--ft-blue-steel-deep: #090f16"),
  "Blue Steel/Copper/Ivory/Steel palette tokens are missing",
);
assert(
  styles.includes("@keyframes ft-route-enter-forward") &&
    styles.includes("@keyframes ft-route-enter-backward"),
  "Directional route animations are missing",
);
assert(
  styles.includes("@media (prefers-reduced-motion: reduce)"),
  "Reduced-motion handling is required",
);
assert(
  topNavigation.includes("ft-nav-indicator"),
  "Animated active navigation indicator is missing",
);

assert(
  navigation.includes('label: "AI Assistant"'),
  "Primary navigation must label the assistant as AI Assistant",
);
assert(
  topNavigation.includes("navItemWidth") &&
    topNavigation.includes("longestLabelLength") &&
    topNavigation.includes("justify-center"),
  "Primary navigation items must share the longest-label width and center their content",
);
assert(
  pageContainer.includes("items-center text-center") &&
    pageContainer.includes("justify-center gap-2"),
  "PageContainer must center page headings and place actions on a centered row below",
);
assert(
  categoriesPage.includes("flex flex-col items-center text-center") &&
    categoriesPage.includes('className="mt-4 flex w-full justify-center"'),
  "Categories must follow the centered v2 page-header layout",
);
assert(
  (userMenu.match(/navigate\("\/settings"\)/g) || []).length === 1 &&
    !userMenu.includes("Profile"),
  "User menu must expose only one Settings destination",
);
assert(
  indexHtml.includes('href="/favicon.svg"') &&
    favicon.includes('#090F16') &&
    favicon.includes('#C68159'),
  "FinTrack must use the new Blue Steel/Copper favicon",
);
assert(
  app.includes('path="/investments"'),
  "Investments must have a primary v2 route placeholder",
);
assert(
  button.includes("bg-copper-500") && !button.includes("bg-emerald-500"),
  "Primary Button branding must use copper rather than semantic green",
);


assert(
  topbar.includes('src="/favicon.svg"'),
  "Topbar should reuse the shared FinTrack favicon SVG for the brand mark",
);
assert(
  !topbar.includes("WalletCards"),
  "Topbar should not keep a separate legacy WalletCards brand icon",
);

console.log("FinTrack v2 visual shell regression tests passed.");
