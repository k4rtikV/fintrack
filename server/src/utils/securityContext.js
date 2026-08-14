const truncate = (value, maxLength) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);

const normalizeIpAddress = (value) => {
  const ipAddress = truncate(value, 96);

  if (ipAddress.startsWith("::ffff:")) {
    return ipAddress.slice(7);
  }

  return ipAddress || "Unknown";
};

const detectBrowser = (userAgent) => {
  if (/Edg\//i.test(userAgent)) {
    return "Microsoft Edge";
  }

  if (/OPR\/|Opera/i.test(userAgent)) {
    return "Opera";
  }

  if (/SamsungBrowser\//i.test(userAgent)) {
    return "Samsung Internet";
  }

  if (/Firefox\//i.test(userAgent)) {
    return "Firefox";
  }

  if (/CriOS\/|Chrome\//i.test(userAgent)) {
    return "Chrome";
  }

  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    return "Safari";
  }

  return "Unknown browser";
};

const detectOperatingSystem = (userAgent) => {
  if (/Windows NT/i.test(userAgent)) {
    return "Windows";
  }

  if (/Android/i.test(userAgent)) {
    return "Android";
  }

  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return "iOS";
  }

  if (/Mac OS X|Macintosh/i.test(userAgent)) {
    return "macOS";
  }

  if (/Linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Unknown OS";
};

const detectDeviceType = (userAgent) => {
  if (/iPad|Tablet/i.test(userAgent)) {
    return "Tablet";
  }

  if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) {
    return "Mobile";
  }

  return "Desktop";
};

const getRequestSecurityContext = (req) => {
  const userAgent = truncate(req.get("user-agent"), 512) || "Unknown";

  return {
    ipAddress: normalizeIpAddress(req.ip || req.socket?.remoteAddress),
    userAgent,
    browser: detectBrowser(userAgent),
    os: detectOperatingSystem(userAgent),
    deviceType: detectDeviceType(userAgent),
  };
};

const getDeviceLabel = ({ browser, os, deviceType } = {}) => {
  const parts = [browser, os].filter(
    (value) => value && !String(value).startsWith("Unknown"),
  );

  if (parts.length) {
    return parts.join(" on ");
  }

  return deviceType || "Unknown device";
};

export {
  getDeviceLabel,
  getRequestSecurityContext,
};
