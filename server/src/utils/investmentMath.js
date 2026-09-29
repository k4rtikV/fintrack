const QUANTITY_SCALE = 1e6;
const MONEY_SCALE = 100;

const roundQuantity = (value) =>
  Math.round((Number(value) + Number.EPSILON) * QUANTITY_SCALE) / QUANTITY_SCALE;

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * MONEY_SCALE) / MONEY_SCALE;

const planFifoSale = ({ lots, quantity }) => {
  const requested = roundQuantity(quantity);
  let remaining = requested;
  let costBasis = 0;
  const allocations = [];

  for (const lot of lots || []) {
    if (remaining <= 1e-6) break;
    const available = Math.max(Number(lot.quantityRemaining) || 0, 0);
    if (available <= 0) continue;

    const consumed = roundQuantity(Math.min(available, remaining));
    const nextRemaining = roundQuantity(available - consumed);
    costBasis += consumed * Number(lot.unitCost || 0);
    remaining = roundQuantity(remaining - consumed);

    allocations.push({
      lotId: lot._id?.toString?.() || String(lot._id || ""),
      consumed,
      quantityRemaining: nextRemaining,
    });
  }

  return {
    allocations,
    requested,
    unallocated: remaining,
    costBasis: roundMoney(costBasis),
  };
};

export { planFifoSale, roundMoney, roundQuantity };
