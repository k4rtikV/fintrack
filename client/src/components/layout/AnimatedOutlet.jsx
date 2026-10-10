import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { getNavigationDirection } from "../../navigation/primaryNavigation";

const AnimatedOutlet = () => {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  const direction = getNavigationDirection(
    previousPathRef.current,
    location.pathname,
  );

  useLayoutEffect(() => {
    previousPathRef.current = location.pathname;

    // Run before paint to prevent an old page's bottom scroll position from
    // becoming visible on the next route. Never move the nav rail vertically.
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
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
