import { Crucible } from './systems/crucible.js';
import { DC20 } from './systems/dc20.js';
import { DnD5e } from './systems/dnd5e.js';
import { GenericSystem } from './systems/generic.js';
import { PF2e } from './systems/pf2e.js';

export function getGameSystem() {
  switch (game.system.id) {
    case 'dnd5e':
      return DnD5e;
    case 'pf2e':
      return PF2e;
    case 'crucible':
      return Crucible;
    case 'dc20rpg':
      return DC20;
    default:
      return GenericSystem;
  }
}
