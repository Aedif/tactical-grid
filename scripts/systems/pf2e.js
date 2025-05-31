import { RangeHighlightAPI } from '../rangeHighlighter.js';
import { GenericSystem } from './generic.js';

export default class PF2e extends GenericSystem {
  /** @override */
  static onInit() {
    this._registerActorSheetListeners();
  }

  /** @override */
  static getTokenRange(token) {
    const reach = { range: token.actor?.getReach?.({ action: 'attack' }) || 0 };
    if (reach.range === 10) reach.measureDistance = this._reachMeasureDistance;
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

    let range = item.system.range?.value;
    if (range) {
      range = parseInt(range);
      if (Number.isFinite(range)) range = range;
    }

    if (!ranges.length && item.isMelee) {
      if (item.system.traits.value?.includes('reach'))
        ranges.push({ range: 10, measureDistance: this._reachMeasureDistance });
      else ranges.push(5);
    }

    return ranges;
  }

  // PF2e has an exception for distance measurements for the 10ft reach.
  // This is a modified PF2e `measureDistances` function to account for this
  // TODO: check if it's still necessary as of v13
  static _reachMeasureDistance(path) {
    const ray = new Ray(path[0], path[1]);
    const segments = [{ ray }];

    let nDiagonal = 0;
    const d = canvas.dimensions;

    const result = segments.map((s) => {
      const r = s.ray,
        nx = Math.abs(Math.ceil(r.dx / d.size)),
        ny = Math.abs(Math.ceil(r.dy / d.size)),
        nd = Math.min(nx, ny),
        ns = Math.abs(ny - nx);
      nDiagonal += nd;
      const nd10 = Math.floor(nDiagonal / 2) - Math.floor((nDiagonal - nd) / 2);
      return (nd10 + (nd - nd10) + ns) * d.distance;
    });

    return { distance: result };
  }

  static _registerActorSheetListeners() {
    Hooks.on('renderActorSheet', (actorSheet, html, options) => {
      if (!RangeHighlightAPI.itemEnabled) return;

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
