// Moneycontrol uses its own company IDs; NSE/BSE ticker symbols are not
// interchangeable with Moneycontrol's last URL segment (KRN -> KHERL).
// Keep verified deep links in one place. The same company page includes both
// NSE and BSE prices, so use the ISIN/company identity, not exchange guessing.
const COMPANY_PAGES = Object.freeze({
  KRN: { names: ["KRN"], isin: "INE0Q3J01015", path: "engineering/krnheatexchangerrefrigeration/KHERL" },
  RELIANCE: { names: ["RELIANCE INDUSTRIES"], path: "refineries/relianceindustries/RI" },
  RPOWER: { names: ["RELIANCE POWER"], path: "power-generationdistribution/reliancepower/RP" },
  HYUNDAI: { names: ["HYUNDAI MOTOR"], path: "automobile-passenger-cars/hyundaimotorindia/HMI01" },
  TCS: { names: ["TATA CONSULTANCY"], path: "computers-software/tataconsultancyservices/TCS" },
  INFY: { names: ["INFOSYS"], path: "computers-software/infosys/IT" },
});

const moneycontrolLinkForInstrument = (instrument = {}) => {
  const symbol = String(instrument.tradingSymbol || "").trim().toUpperCase();
  const name = String(instrument.name || instrument.shortName || "").trim();
  const normalizedName = name.toUpperCase();
  const isin = String(instrument.isin || "").trim().toUpperCase();
  const known = COMPANY_PAGES[symbol];
  if (known && (isin === known.isin || known.names.some((part) => normalizedName.includes(part)))) {
    return {
      url: `https://www.moneycontrol.com/india/stockpricequote/${known.path}`,
      direct: true,
    };
  }

  // Never manufacture a Moneycontrol company ID from an Upstox/NSE symbol:
  // a wrong deep link is worse than a clearly labelled, stock-specific lookup.
  // Limit Google results to Moneycontrol's stock-quote pages and include all
  // available identifying fields to disambiguate similarly named securities.
  const query = [
    "site:moneycontrol.com/india/stockpricequote/",
    name, symbol, isin,
  ].filter(Boolean).join(" ");
  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    direct: false,
  };
};

const researchLinksForInstrument = (instrument = {}) => {
  const symbol = String(instrument.tradingSymbol || "").trim();
  const exchange = instrument.exchange === "BSE" ? "BSE" : "NSE";
  const moneycontrol = moneycontrolLinkForInstrument(instrument);
  return {
    tradingView: `https://www.tradingview.com/symbols/${exchange}-${encodeURIComponent(symbol)}/`,
    moneycontrol: moneycontrol.url,
    moneycontrolDirect: moneycontrol.direct,
  };
};

export { moneycontrolLinkForInstrument, researchLinksForInstrument };
