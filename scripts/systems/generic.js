import { RangeHighlightAPI } from '../rangeHighlighter.js';

/**
 * GenericSystem to be extended to provide additional game system support.
 * Functions to be overridden:
 * - onInit: register hooks for ActorSheets and other contexts within which you can call hoverItem and hoverLeaveItem
 * - getTokenRange: given a token return the range that should be displayed on hover
 * - getItemRange: given an item and a token return the range to be be displayed on item hover
 */
export class GenericSystem {
  /**
   * Calculates the range/s of the provided Token
   * @param {Token} token
   * @returns {Array[]} Item range/s in Scene units
   */
  static getTokenRange(token) {
    return [5];
  }

  /**
   * Calculates the range/s of the provided Item wielded by a specific Token
   * @param {Item}  item
   * @param {Token} token
   * @returns {Array[]} Item range/s in grid units
   */
  static getItemRange(item, token) {
    return [];
  }

  /**
   * Called on game 'init'. This is where any system specific hooks and wrappers should be registered
   */
  static onInit() {}

  /**
   * Utility that converts grid spaces to range in grid units
   * @param {Number} gridSpaces
   * @returns
   */
  static _getUnitAdjustedRange(gridSpaces) {
    const units = canvas.scene.grid.units;
    if (units === 'ft') return 5 * gridSpaces;
    else if (units === 'm') return 1.5 * gridSpaces;
    return 0;
  }

  /**
   * Respond to mouse hovering over an item with itemId
   */
  static hoverItem({ item, itemId, actorSheet, actor, token } = {}) {
    if (!RangeHighlightAPI.itemEnabled) return;

    actor = actor ?? actorSheet?.document ?? token?.actor;
    if (!actor) return;

    token = token ?? actorSheet?.token?.object ?? actor?.getActiveTokens()[0];
    if (!token) return;

    item = item ?? actor.items.get(itemId);

    if (!item) {
      RangeHighlightAPI.clearRangeHighlight(token);
      return;
    }

    RangeHighlightAPI.rangeHighlight(token, { item });
  }

  /**
   * Respond to mouse ending hover over an item
   */
  static hoverLeaveItem({ actorSheet, actor, token }) {
    actor = actor ?? actorSheet?.document ?? token?.actor;
    token = token ?? actorSheet?.token?.object ?? actor?.getActiveTokens()[0];

    if (token) RangeHighlightAPI.clearRangeHighlight(token);
  }
}
