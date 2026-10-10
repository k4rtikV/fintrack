const QUANTITY_SCALE = 1e6;
const MONEY_SCALE = 100;

const roundQuantity = (value) =>
  Math.round((Number(value) + Number.EPSILON) * QUANTITY_SCALE) / QUANTITY_SCALE;

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * MONEY_SCALE) / MONEY_SCALE;

const toPaise = (value) => Math.round((Number(value) + Number.EPSILON) * MONEY_SCALE);

// New lots conserve their entire purchase cash outlay (including fees) in paise.
// Legacy lots have no exact paise fields; use the historical unitCost until a
// closing sale, when the holding's remaining basis is authoritative.
const planFifoSale = ({ lots, quantity, holdingCostBasis = null }) => {
  const requested = roundQuantity(quantity);
  const totalAvailable = roundQuantity((lots || []).reduce(
    (sum, lot) => sum + Math.max(Number(lot.quantityRemaining) || 0, 0), 0,
  ));
  let remaining = requested;
  let costBasisPaise = 0;
  const allocations = [];
  let hadLegacyLot = false;

  for (const lot of lots || []) {
    if (remaining <= 1e-6) break;
    const available = roundQuantity(Math.max(Number(lot.quantityRemaining) || 0, 0));
    if (available <= 0) continue;

    const consumed = roundQuantity(Math.min(available, remaining));
    const nextRemaining = roundQuantity(available - consumed);
    const exactPaise = lot.costBasisRemainingPaise;
    const tracked = exactPaise !== null && exactPaise !== undefined &&
      Number.isSafeInteger(Number(exactPaise)) && Number(exactPaise) >= 0;
    hadLegacyLot ||= !tracked;
    // A full-lot sale takes the ENTIRE remaining basis, including every penny
    // of allocation remainder. Partial sales prorate the basis deterministically.
    const allocatedPaise = tracked
      ? (nextRemaining === 0 ? Number(exactPaise) : Math.round(Number(exactPaise) * consumed / available))
      : toPaise(consumed * Number(lot.unitCost || 0));
    costBasisPaise += allocatedPaise;
    remaining = roundQuantity(remaining - consumed);

    allocations.push({
      lotId: lot._id?.toString?.() || String(lot._id || ""),
      consumed,
      quantityRemaining: nextRemaining,
      costBasisPaise: allocatedPaise,
      // Null means a legacy lot and must not be accidentally marked migrated.
      costBasisRemainingPaise: tracked ? Number(exactPaise) - allocatedPaise : null,
    });
  }

  if (holdingCostBasis !== null && holdingCostBasis !== undefined &&
    remaining <= 1e-6 && allocations.length &&
    Math.abs(requested - totalAvailable) <= 1e-6) {
    const authoritativeRemainingPaise = toPaise(holdingCostBasis);
    if (hadLegacyLot) {
      // Reconcile the final historic remainder once, rather than dropping
      // legacy fees due to their rounded per-unit cost.
      const difference = authoritativeRemainingPaise - costBasisPaise;
      if (difference !== 0) {
        const lastLegacy = [...allocations].reverse().find((item) => item.costBasisRemainingPaise === null);
        if (lastLegacy.costBasisPaise + difference < 0) {
          throw new Error("Legacy investment cost basis requires reconciliation before this sale");
        }
        lastLegacy.costBasisPaise += difference;
        costBasisPaise = authoritativeRemainingPaise;
      }
    }
  }

  return {
    allocations,
    requested,
    unallocated: remaining,
    costBasis: costBasisPaise / MONEY_SCALE,
  };
};

export { planFifoSale, roundMoney, roundQuantity };
