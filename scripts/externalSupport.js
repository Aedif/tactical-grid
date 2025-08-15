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
    case 'demonlord':
      gameSystem = (await import('./systems/demonlord.js')).default;
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
  // UI
  if (game.modules.get('action-pack')?.active) import('./modules/actionPack.js').then((module) => module.register());
  if (game.modules.get('enhancedcombathud')?.active)
    import('./modules/argonHud.js').then((module) => module.register());
  if (game.modules.get('token-action-hud-core')?.active)
    import('./modules/tokenActionHud.js').then((module) => module.register());
  if (game.modules.get('pf2e-hud')?.active) import('./modules/pf2eHud.js').then((module) => module.register());

  // Cover

  // Supported cover calculators
  TacticalGrid.coverCalculators = {
    none: { name: 'None', calculateCover: true /* To make this setting always selectable */ },
    'simbuls-cover-calculator': { name: "Simbul's Cover Calculator" },
    levelsautocover: { name: 'Levels - Automatic Cover Calculator' },
  };

  // Import and assign 'calculateCover' functions for enabled modules
  // Expected return: TacticalGrid.COVER
  if (game.modules.get('simbuls-cover-calculator')?.active)
    import('./modules/simbuls.js').then((module) => module.register());
  if (game.modules.get('levelsautocover')?.active)
    import('./modules/levelsautocover.js').then((module) => module.register());
}
