import { GenericSystem } from './generic.js';

export default class DnD4e extends GenericSystem {
  /** @override */
  static getTokenRange(token) {
    const actor = token.actor;
    if (actor.statuses.has('dead')) return [];
    const allRanges = new Set([this._getUnitAdjustedRange(1)]);

    if (actor.items.some(i => i.name === 'Threatening Reach')) {
        actor.items
        .filter((item) => (item.system.equipped || item.type === 'power') && this._isMelee(item))
        .forEach((item) => {
            if (item.properties?.rch) allRanges.add(this._getUnitAdjustedRange(2));
            else if (['reach', 'melee'].includes(item.system.rangeType)) allRanges.add(this._getUnitAdjustedRange(item.system.rangePower))
        });
    }

    return Array.from(allRanges);
  }

  /** @override */
  static getItemRange(item, token) {
    if (item.type != 'power') return;
    const rangeData = item.rangeData();
    const ranges = new Set();


    if (item.system.range) {
      let range = 0;
      if (item.system.range.value) {
        range = Number(item.system.range.value);
      } else if (rangeData.rangePower) {
        range = Number(rangeData.rangePower);
      } else if (item.system.area) {
        range = Number(item.system.area) || Number(rangeData.rangeTextBlock);
      }
      let longRange = Number(item.system.range.long) || 0;

      if (item.system.rangeType === 'touch') {
        range = 1;
        longRange = 0;
      }

      if (item.system.rangeType === 'weapon') {
        if (['ranged', 'meleeRanged'].includes(item.system.weaponType)) {
          const rangeParts = rangeData.rangeTextBlock.split('/');
          range = Number(rangeParts[0]) || 0;
          longRange = Number(rangeParts[1]) || 0;
        } else if (item.system.weaponType === 'melee') {
          range = Number(rangeData.rangeTextBlock) || 1;
        }
      }

      //if (reach) ranges.add(reach);
      if (range) ranges.add(range);
      if (longRange) ranges.add(longRange);
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
      ['melee', 'reach', 'touch'].includes(item.system.rangeType) ||
      (item.system.rangeType === 'weapon' && item.system.weaponType === 'melee') ||
      (item.system.rangeType === 'weapon' && item.system.weaponType === 'meleeRanged' && (item.system.properties?.thv || item.system.properties?.tlg)) ||
      item.system.weaponType?.slice(-1) === 'M'
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
  static _getUnitAdjustedRange(gridSpaces) {
    const units = canvas.scene.grid.units;
    if (units === 'sq') return (Number(gridSpaces) || 0);
    else if (units === 'ft') return 5 * (Number(gridSpaces) || 0);
    else if (units === 'm') return 1.5 * (Number(gridSpaces) || 0);
    return 0;
  }
}
