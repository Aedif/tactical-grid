import { GenericSystem } from './generic.js';

export default class DnD5e extends GenericSystem {
  /** @override */
  static getTokenRange(token) {
    const actor = token.actor;
    const allRanges = new Set([this._getUnitAdjustedRange(1)]);

    actor.items
      .filter((item) => item.system.equipped && this._isMelee(item))
      .forEach((item) => {
        if (item.system.properties.has('rch')) allRanges.add(this._getUnitAdjustedRange(2));
      });

    return Array.from(allRanges);
  }

  /** @override */
  static getItemRange(item, token) {
    const ranges = new Set();

    let itemRangeOverride;

    // Handle activities
    if (item.documentName === 'Activity') {
      if (item.range.override) itemRangeOverride = item.range;

      if (item.type === 'cast') {
        item = fromUuidSync(item.spell.uuid);
      } else if (item.type === 'attack') {
        item = item.item;
      } else {
        item = null;
      }
      if (!item) return [];
    }

    const itemRange = itemRangeOverride ?? item.system.range;

    if (itemRange) {
      let reach = itemRange.reach || 0;
      let range = itemRange.value || 0;
      let longRange = itemRange.long || 0;
      let special = Number(itemRange.special);

      // If item range is measured in 'ft' but canvas is set to 'm', convert the range value
      if (itemRange.units === 'ft' && canvas.scene.grid.units === 'm') {
        range *= 0.3;
        longRange *= 0.3;
        reach *= 0.3;
      }

      let thrMelee = 0;
      const actor = token.actor;

      if (foundry.utils.getProperty(actor, 'flags.midi-qol.sharpShooter') && range < longRange) range = longRange;
      if (item.system.actionType === 'rsak' && foundry.utils.getProperty(actor, 'flags.dnd5e.spellSniper')) {
        range = 2 * range;
        longRange = 2 * longRange;
      }

      if (itemRange.units === 'touch') {
        range = this._getUnitAdjustedRange(item.system.properties.has('rch') ? 2 : 1);
        longRange = 0;
      }

      if (['mwak', 'msak', 'mpak'].includes(item.system.actionType)) {
        if (item.system.properties.has('thr')) {
          thrMelee = this._getUnitAdjustedRange(item.system.properties.has('rch') ? 2 : 1);
        } else {
          longRange = 0;
        }
      }

      if (reach) ranges.add(reach);
      if (thrMelee) ranges.add(thrMelee);
      if (range) ranges.add(range);
      if (longRange) ranges.add(longRange);
      if (special) ranges.add(longRange);
    }

    return Array.from(ranges);
  }

  /**
   * Is the item classified as melee?
   * @param {Item} item
   * @returns
   */
  static _isMelee(item) {
    return (
      item.system.actionType === 'mwak' &&
      ['martialM', 'simpleM', 'natural', 'improv'].includes(item.system.weaponType ?? item.system.type?.value)
    );
  }

  /** @override */
  static onInit() {
    super.onInit();
    this._registerActorSheetListeners();
  }

  static _registerActorSheetListeners() {
    Hooks.on('renderActorSheetV2', (actorSheet, html, data, options) => {
      const selector = '.item-list > .item';
      $(html)
        .on('mouseenter', selector, (event) => {
          this.hoverItem({ itemId: $(event.target).closest(`[data-item-id]`).data('itemId'), actorSheet });
        })
        .on('mouseleave', selector, () => this.hoverLeaveItem({ actorSheet }));
    });
  }

  /** @override */
  static getItemFromMacro(macro, actor) {
    if (macro?.getFlag('dnd5e', 'itemMacro')) {
      const match = macro.command.match(/.*rollItem\("(?<itemName>.+)"/);
      if (!match) return;
      const itemName = match.groups?.itemName;

      const item = actor.items.filter((item) => item.name === itemName)?.[0];
      return item;
    }

    return null;
  }
}

// TODO: support for activities

// Hooks.on('renderActivityChoiceDialog', _dnd5eActivityChoiceDialogHook);

// function _dnd5eActivityChoiceDialogHook(app, html) {
//   if (!RangeHighlightAPI.itemHighlightEnabled) return;

//   $(html)
//     .find('[data-application-part="activities"] button[data-activity-id!=""]')
//     .on('mouseenter', (event) => {
//       const activityId = $(event.currentTarget).data('activityId');
//       const activity = app.item.system.activities.get(activityId);
//       if (!activity) return;
//       console.log(activity);

//       app.item.actor.getActiveTokens().forEach((token) => {
//         RangeHighlightAPI.rangeHighlight(token, { item: activity });
//       });
//     })
//     .on('mouseleave', () => {
//       app.item.actor.getActiveTokens().forEach((token) => {
//         RangeHighlightAPI.clearRangeHighlight(token);
//       });
//     });
// }
