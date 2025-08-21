import { RangeHighlightAPI } from '../rangeHighlighter.js';
import { GenericSystem } from './generic.js';

export default class PF2e extends GenericSystem {
  /** @override */
  static onInit() {
    super.onInit();
    this._registerActorSheetListeners();
  }

  /** @override */
  static getItemFromMacro(macro, actor) {
    if (!macro) return null;
    let match;
    if (macro.getFlag('pf2e', 'actionMacro')) {
      match = macro.command.match(/^game\.pf2e\.rollActionMacro\(.*itemId: *"(?<itemId>[A-Za-z0-9]+)"/);
    } else if (macro.getFlag('pf2e', 'itemMacro')) {
      match = macro.command.match(/^game\.pf2e\.rollItemMacro\(" *(?<itemId>[A-Za-z0-9]+)"/);
      if (!match) {
        match = macro.command.match(
          /^game\.pf2e\.rollItemMacro\("Actor\.([A-Za-z0-9]+)\.Item\.(?<itemId>[A-Za-z0-9]+)"/
        );
      }
    }

    if (match) {
      const itemId = match.groups?.itemId;
      const item = actor.items.get(itemId);
      return item;
    }

    return null;
  }

  /** @override */
  static getTokenRange(token) {
    const actor = token.actor;
    // Enforce swarm: swarms have 0 reach regardless of size or gear
    if (actor?.system?.traits?.value?.includes?.('swarm')) return [{ range: 0 }];

    const reachValue = actor?.getReach?.({ action: 'attack' }) || 0;
    const reach = { range: reachValue };
    // Use cost-based adjustment for PF2e's 10ft reach exception
    if (reach.range === 10) reach.cost = this._reachModifiedCost;
    return [reach];
  }

  /** @override */
  static getItemRange(item) {
    const ranges = [];

    if (item.range) {
      let increment = item.range.increment;
      let maxRange = item.range.max;

      if (increment && maxRange) {
        let range = 0;
        let maxIncrementCount = 6;
        while (range < maxRange && maxIncrementCount > 0) {
          range += increment;
          if (range > maxRange) range = maxRange;
          maxIncrementCount--;
          ranges.push(range);
        }
      } else if (increment) {
        ranges.push(increment);
      } else if (maxRange) {
        ranges.push(maxRange);
      }
    } else if (item.system.area?.type === 'emanation') {
      if (Number.isFinite(item.system.area.value)) ranges.push(item.system.area.value);
    }

    // For melee items, use PF2e's reach calculation and enforce swarm behavior.
    if (!ranges.length && item.isMelee) {
      const actor = item.actor;

      // Swarms always have 0 reach
      if (actor?.system?.traits?.value?.includes?.('swarm')) {
        ranges.push(0);
      } else {
        const reach = actor?.getReach?.({ action: 'attack', weapon: item }) || 0;
        if (reach === 10) ranges.push({ range: 10, cost: this._reachModifiedCost });
        else ranges.push(reach);
      }
    }

    return ranges;
  }

  // PF2e has an exception for distance measurements for the 10ft reach.
  // This is a cost function which will modify distance to account for this
  static _reachModifiedCost({ distance, diagonals }) {
    if (distance === 15 && diagonals === 2) {
      return distance - 5;
    }
    return distance;
  }

  static _registerActorSheetListeners() {
    Hooks.on('renderActorSheet', (actorSheet, html, options) => {
      // Strike Actions
      const strikeSelector = '.actions-list.strikes-list > .strike';
      html
        .on('mouseenter', strikeSelector, (event) => {
          const actor = actorSheet.document;
          const actionIndex = $(event.target).closest(`.strike`).data('actionIndex');
          const item = actor.system.actions[actionIndex]?.item;
          this.hoverItem({ actorSheet, item });
        })
        .on('mouseleave', strikeSelector, () => this.hoverLeaveItem({ actorSheet }));

      // Inventory/Spells
      const inventorySelector = '.item-name';
      html
        .on('mouseenter', inventorySelector, (event) => {
          const itemId = $(event.target).closest(`[data-item-id]`).data('itemId');
          this.hoverItem({ actorSheet, itemId });
        })
        .on('mouseleave', inventorySelector, () => this.hoverLeaveItem({ actorSheet }));
    });
  }
}
