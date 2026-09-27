import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import {
  primaryNavigation,
  resolvePrimaryPath,
} from "../../navigation/primaryNavigation";

const TopNavigation = () => {
  const { pathname } = useLocation();
  const activePath = resolvePrimaryPath(pathname);
  const navRef = useRef(null);
  const itemRefs = useRef(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const activeItem = useMemo(
    () => primaryNavigation.find(({ path }) => path === activePath),
    [activePath],
  );

  useLayoutEffect(() => {
    const node = itemRefs.current.get(activePath);
    if (!node) {
      setIndicator((current) => ({ ...current, ready: false }));
      return undefined;
    }

    const measure = () => {
      setIndicator({
        left: node.offsetLeft,
        width: node.offsetWidth,
        ready: true,
      });
    };

    measure();
    window.addEventListener("resize", measure);

    const resizeObserver =
      typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    if (resizeObserver && navRef.current) {
      resizeObserver.observe(navRef.current);
    }

    return () => {
      window.removeEventListener("resize", measure);
      resizeObserver?.disconnect();
    };
  }, [activePath]);

  useEffect(() => {
    const node = itemRefs.current.get(activePath);
    if (!node) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    node.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activePath]);

  return (
    <div className="min-w-0 flex-1">
      <nav
        ref={navRef}
        aria-label="Primary navigation"
        className="notification-scroll relative flex min-w-0 items-center gap-1 overflow-x-auto px-1 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {primaryNavigation.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            ref={(node) => {
              if (node) itemRefs.current.set(path, node);
              else itemRefs.current.delete(path);
            }}
            className={({ isActive }) => {
              const active = isActive || activePath === path;
              return [
                "group relative z-10 flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold",
                "transition-[color,background-color,transform] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-copper-400/60",
                active
                  ? "text-copper-700 dark:text-copper-300"
                  : "text-slate-600 hover:bg-slate-200/55 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100",
              ].join(" ");
            }}
            aria-current={activePath === path ? "page" : undefined}
            title={label}
          >
            <Icon
              size={16}
              strokeWidth={2}
              className="shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5"
            />
            <span>{label}</span>
          </NavLink>
        ))}

        <span
          aria-hidden="true"
          className={`ft-nav-indicator ${indicator.ready ? "opacity-100" : "opacity-0"}`}
          style={{
            width: `${indicator.width}px`,
            transform: `translate3d(${indicator.left}px, 0, 0)`,
          }}
        />
      </nav>

      <span className="sr-only" aria-live="polite">
        {activeItem ? `${activeItem.label} selected` : "Secondary page selected"}
      </span>
    </div>
  );
};

export default TopNavigation;
