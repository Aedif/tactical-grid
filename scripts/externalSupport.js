import { GenericSystem } from './systems/generic.js';

export function getGameSystem() {
  switch (game.system.id) {
    case 'dnd5e':
      return import('./systems/dnd5e.js');
    case 'pf2e':
      return import('./systems/pf2e.js');
    case 'crucible':
      return import('./systems/crucible.js');
    case 'dc20rpg':
      return import('./systems/dc20.js');
    default:
      return GenericSystem;
  }
}

/**
 * Checks if 3rd party modules are active and dynamically imports and calls their respective register() functions
 */
export function registerModules() {
  if (game.modules.get('action-pack')?.active) import('./modules/actionPack.js').then((module) => module.register());
  if (game.modules.get('enhancedcombathud')?.active)
    import('./modules/argonHud.js').then((module) => module.register());
}
