import { GenericSystem } from './generic.js';

export default class DC20 extends GenericSystem {
  /** @override */
  static getTokenRange(token) {
    const actor = token.actor;
    const allRanges = new Set([1]);

    actor.items
      .filter((item) => item.system.statuses?.equipped && item.system.weaponType === 'melee')
      .forEach((item) => {
        if (item.system.properties.reach.active) allRanges.add(2);
      });

    return Array.from(allRanges);
  }

  /** @override */
  static getItemRange(item, token) {
    const ranges = [];

    let normalRange = 0;
    let maxRange = 0;

    if (item.system.weaponType === 'melee') {
      if (item.system.properties.reach.active) normalRange = 2;
      else normalRange = 1;
    } else {
      normalRange = item.system.range.normal;
      maxRange = item.system.range.max;
    }

    if (normalRange) ranges.push(normalRange);
    if (maxRange) ranges.push(maxRange);

    return ranges;
  }

  /** @override */
  static getItemFromMacro(macro, actor) {
    if (macro?.getFlag('dc20rpg', 'itemMacro')) {
      const match = macro.command.match(/^game\.dc20rpg\.rollItemMacro\(\"(?<itemName>[A-Za-z0-9]+)\"\)/);
      if (!match) return;
      const itemName = match.groups?.itemName;

      const item = actor.items.filter((item) => item.name === itemName)?.[0];
      return item;
    }

    return null;
  }
}
