/**
 * Action Pack
 * https://foundryvtt.com/packages/action-pack
 * TODO: check for v13 implementation
 */

import { RangeHighlightAPI } from '../rangeHighlighter.js';

export function register() {
  Hooks.on('action-pack.updateTray', (html) => {
    html
      .find('.item-name')
      .on('mouseover', async (event) => {
        if (!RangeHighlightAPI.itemHighlightEnabled) return;
        RangeHighlightAPI.rangeHighlightItemUuid($(event.target).closest('.item').data('item-uuid'));
      })
      .on('mouseleave', async (event) => {
        RangeHighlightAPI.clearRangeHighlightItemUuid($(event.target).closest('.item').data('item-uuid'));
      });
  });
}
