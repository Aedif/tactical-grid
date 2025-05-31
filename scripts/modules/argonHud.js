/**
 * Argon - Combat HUD
 * https://foundryvtt.com/packages/enhancedcombathud
 */

import { RangeHighlightAPI } from '../rangeHighlighter.js';

export function register() {
  Hooks.on('renderCoreHUD', (hud, html, opts) => {
    if (!RangeHighlightAPI.itemHighlightEnabled) return;
    hud.itemButtons.forEach((button) => {
      $(button.element)
        .on('mouseover', (event) => {
          RangeHighlightAPI.rangeHighlight(button.token, { item: button.item });
        })
        .on('mouseleave', (event) => {
          RangeHighlightAPI.clearRangeHighlight(button.token);
        });
    });
  });
}
