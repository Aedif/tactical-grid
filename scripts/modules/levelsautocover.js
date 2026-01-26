/**
 * Levels - Automatic Cover Calculator
 * https://foundryvtt.com/packages/levelsautocover
 */

export function register() {
  TacticalGrid.coverCalculators['levelsautocover'].calculateCover = calculateCover;
}

function calculateCover(attacker, target) {
  const coverData = AutoCover.calculateCover(attacker, target, { apiMode: true });
  const coverDetail = AutoCover.getCoverData();

  if (coverData.rawCover === 0) return TacticalGrid.COVER.FULL_COVER;
  else if (coverData.rawCover > coverDetail[1].percent) return TacticalGrid.COVER.NO_COVER;
  else if (coverData.rawCover < coverDetail[0].percent) return TacticalGrid.COVER.THREE_QUARTERS_COVER;
  else if (coverData.rawCover < coverDetail[1].percent) return TacticalGrid.COVER.HALF_COVER;

  // Shouldn't reach here
  return TacticalGrid.COVER.NO_COVER;
}
