import { RangeHighlightAPI } from './rangeHighlighter.js';
import { GenericSystem } from './systems/generic.js';

export async function registerGameSystem() {
  let gameSystem;

  switch (game.system.id) {
    case 'dnd5e':
      gameSystem = (await import('./systems/dnd5e.js')).default;
      break;
    case 'pf2e':
      gameSystem = (await import('./systems/pf2e.js')).default;
      break;
    case 'crucible':
      gameSystem = (await import('./systems/crucible.js')).default;
      break;
    case 'dc20rpg':
      gameSystem = (await import('./systems/dc20.js')).default;
      break;
    default:
      gameSystem = GenericSystem;
  }

  gameSystem.onInit();
  RangeHighlightAPI._rangeCalculator = gameSystem;
}

/**
 * Checks if 3rd party modules are active and dynamically imports and calls their respective register() functions
 */
export function registerModules() {
  if (game.modules.get('action-pack')?.active) import('./modules/actionPack.js').then((module) => module.register());
  if (game.modules.get('enhancedcombathud')?.active)
    import('./modules/argonHud.js').then((module) => module.register());
  if (game.modules.get('token-action-hud-core')?.active)
    import('./modules/tokenActionHud.js').then((module) => module.register());
  if (game.modules.get('pf2e-hud')?.active) import('./modules/pf2eHud.js').then((module) => module.register());
}
