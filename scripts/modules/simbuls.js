/**
 * Simbul's Cover Calculator
 * https://foundryvtt.com/packages/simbuls-cover-calculator
 */

export function register() {
  TacticalGrid.coverCalculators['simbuls-cover-calculator'].calculateCover = calculateCover;
}

function calculateCover(attacker, target) {
  if (globalThis.CoverCalculator) {
    const coverData = globalThis.CoverCalculator.Cover(attacker.document ? attacker : attacker.object, target);
    if (attacker === target) return TacticalGrid.COVER.NO_COVER;

    if (coverData?.data?.results.cover === 3) return TacticalGrid.COVER.FULL_COVER;
    else return -coverData?.data?.results.value ?? TacticalGrid.COVER.NO_COVER;
  }
}
