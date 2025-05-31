/**
 * Token Action HUD
 * https://foundryvtt.com/packages/token-action-hud-core
 */

import { RangeHighlightAPI } from '../rangeHighlighter.js';

export function register() {
  let token;
  Hooks.on('renderTokenActionHud', (hud, html, opts) => {
    if (!RangeHighlightAPI.itemEnabled) {
      token = null;
      return;
    }
    token = hud.token;
  });

  Hooks.on('tokenActionHudSystemActionHoverOn', (event, item) => {
    if (token) RangeHighlightAPI.rangeHighlight(token, { item });
  });

  Hooks.on('tokenActionHudSystemActionHoverOff', (event, item) => {
    if (token) RangeHighlightAPI.clearRangeHighlight(token);
  });
}
