import { GenericSystem } from './generic.js';

export default class Crucible extends GenericSystem {
  /** @override */
  static onInit() {
    super.onInit();
    this._registerActorSheetListeners();
  }

  /** @override */
  static getTokenRange(token) {
    const allRanges = new Set([1]);

    token.actor.items.forEach((item) => {
      if (item.system.equipped && item.system.range && !item.system.config.category.ranged) {
        allRanges.add(item.system.range);
      }
    });

    return Array.from(allRanges);
  }

  /** @override */
  static getItemRange(item, token) {
    const ranges = [];

    let range = item.system.range || 0;
    if (range) ranges.push(range);

    return ranges;
  }

  static _registerActorSheetListeners() {
    Hooks.on('renderActorSheet', (actorSheet, html, options) => {
      html
        .find('.line-item')
        .on('mouseenter', (event) =>
          this.hoverItem({ actorSheet, itemId: $(event.target).closest(`[data-item-id]`).attr('data-item-id') })
        )
        .on('mouseleave', () => this.hoverLeaveItem({ actorSheet }));

      html
        .find('.action[data-action-id="strike"]')
        .on('mouseenter', () => {
          const actor = actorSheet.document;
          const weapon = actor.actions.strike.usage.weapon;
          if (weapon) this.hoverItem({ actorSheet, itemId: weapon.id });
        })
        .on('mouseleave', () => this.hoverLeaveItem({ actorSheet }));
    });
  }
}
