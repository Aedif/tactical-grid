/**
 * Levels - Automatic Cover Calculator
 * https://foundryvtt.com/packages/levelsautocover
 */

export function register() {
  TacticalGrid.coverCalculators['levelsautocover'].calculateCover = calculateCover;
}

function calculateCover(attacker, target) {
  const coverData = AutoCover.calculateCover(attacker, target, { apiMode: true });

  const percentCover = 100 - coverData.rawCover;

  // We'll assume that the first defined cover is half-cover
  // 2nd is three-quarter cover
  // 3rd is full-cover
  let coverDetail = AutoCover.getCoverData();
  coverDetail = {
    half: coverDetail[0].percent,
    three: coverDetail[1].percent,
    full: coverDetail[2]?.percent ?? 100,
  };

  if (percentCover === 0 || percentCover < coverDetail.half) return TacticalGrid.COVER.NO_COVER;
  else if (percentCover < coverDetail.three) return TacticalGrid.COVER.HALF_COVER;
  else if (percentCover < coverDetail.full) return TacticalGrid.COVER.THREE_QUARTERS_COVER;
  return TacticalGrid.COVER.FULL_COVER;
}
