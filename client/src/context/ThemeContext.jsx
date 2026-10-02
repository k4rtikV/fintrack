import { createContext, useEffect } from "react";

const ThemeContext = createContext(null);
// FinTrack v2 uses one cohesive Blue Steel/Copper dark visual system.
// Keep a stable context for existing consumers without offering a light theme.
const DARK_THEME = Object.freeze({ theme: "dark", isDark: true });
const ThemeProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
    localStorage.removeItem("fintrack-theme");
  }, []);
  return <ThemeContext.Provider value={DARK_THEME}>{children}</ThemeContext.Provider>;
};
export { ThemeContext, ThemeProvider };
