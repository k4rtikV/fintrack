import { useLayoutEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { getNavigationDirection } from "../../navigation/primaryNavigation";

const AnimatedOutlet = () => {
  const location = useLocation();
  // Update the path pair during render only when the router pathname changes.
  // React retries this component before committing the new route, preserving
  // directional animation without reading a mutable ref in render.
  const [routePair, setRoutePair] = useState(() => ({
    previous: location.pathname,
    current: location.pathname,
  }));
  if (routePair.current !== location.pathname) {
    setRoutePair({ previous: routePair.current, current: location.pathname });
  }
  const direction = getNavigationDirection(
    routePair.current === location.pathname ? routePair.previous : routePair.current,
    location.pathname,
  );

  useLayoutEffect(() => {
    // Run before paint to prevent an old page's bottom scroll position from
    // becoming visible on the next route. Never move the nav rail vertically.
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  }, [location.pathname]);

  // Query/hash navigation within the same route must not remount local state.
  // Only a different pathname triggers a new route stage / animation.
  return (
    <div
      key={location.pathname}
      className={`ft-route-stage ft-route-${direction}`}
      data-route-direction={direction}
    >
      <Outlet />
    </div>
  );
};

export default AnimatedOutlet;
