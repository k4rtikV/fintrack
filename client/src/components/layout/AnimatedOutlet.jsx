import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { getNavigationDirection } from "../../navigation/primaryNavigation";

const AnimatedOutlet = () => {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  const direction = getNavigationDirection(
    previousPathRef.current,
    location.pathname,
  );

  useEffect(() => {
    previousPathRef.current = location.pathname;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [location.pathname]);

  return (
    <div
      key={location.key || location.pathname}
      className={`ft-route-stage ft-route-${direction}`}
      data-route-direction={direction}
    >
      <Outlet />
    </div>
  );
};

export default AnimatedOutlet;
