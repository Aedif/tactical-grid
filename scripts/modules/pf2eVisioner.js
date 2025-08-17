/**
 * PF2E Visioner
 * https://foundryvtt.com/packages/pf2e-visioner
 */

export function register() {
  TacticalGrid.coverCalculators['pf2e-visioner'].calculateCover = calculateCover;
}

function calculateCover(attacker, target) {
  const cover = game.modules.get('pf2e-visioner')?.api.getAutoCoverState(attacker, target);

  if (cover === 'greater') return TacticalGrid.COVER.FULL_COVER;
  else if (cover === 'standard') return TacticalGrid.COVER.THREE_QUARTERS_COVER;
  else if (cover === 'lesser') return TacticalGrid.COVER.HALF_COVER;

  return TacticalGrid.COVER.NO_COVER;
}
