import { GenericSystem } from './generic.js';

export default class DrawSteel extends GenericSystem {
  /** @override */
  static onInit() {
    super.onInit();
    this._registerActorSheetListeners();
  }

  /** @override */
  static getTokenRange(token) {
    if (!token || !token.actor) return [0];
    return [
      token.actor.system.movement.value ?? 0,
      2 * token.actor.system.movement.value ?? 0,
      token.actor.system.movement.disengage ?? 0,
    ];
  }

  /** @override */
  static getItemRange(item, token) {
    if (item.type != 'ability') return [0];

    let primary = item.system.distance.primary ?? 0;
    let secondary = item.system.distance.secondary ?? 0;

    if (item.system.keywords.has('area') && secondary) {
      primary = secondary;
      secondary = 0;
    }

    return [primary, secondary];
  }

  /** @override */
  static getItemFromMacro(macro, actor) {
    if (macro?.getFlag('draw-steel', 'itemMacro')) {
      const match = macro.command.match(/^ds\.helpers\.macros\.rollItemMacro\(\"(?<uuid>[A-Za-z0-9\.]+)\"\)/);
      if (!match) return;
      const itemId = foundry.utils.parseUuid(match.groups?.uuid).id;
      const item = actor.items.get(itemId);
      return item;
    }
    return null;
  }

  static _registerActorSheetListeners() {
    Hooks.on('renderDrawSteelActorSheet', (actorSheet, html, data, options) => {
      const selector = '.item.ability';
      $(html)
        .on('mouseenter', selector, (event) => {
          this.hoverItem({ itemUuid: event.currentTarget.dataset.documentUuid, actorSheet });
        })
        .on('mouseleave', selector, () => this.hoverLeaveItem({ actorSheet }));
    });
  }
}
