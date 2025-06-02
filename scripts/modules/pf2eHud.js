/**
 * PF2e HUD
 * https://foundryvtt.com/packages/pf2e-hud
 * TODO: check for v13 implementation
 */

import { RangeHighlightAPI } from '../rangeHighlighter.js';
import PF2e from '../systems/pf2e.js';

function getPersistentToken() {
  return game.hud.persistent.actor.getActiveTokens().filter((t) => t.controlled)[0];
}

export function register() {
  Hooks.on('renderPF2eHudPersistent', (hud, html, opts) => {
    // Shortcuts
    $(html)
      .on('mouseenter', '.shortcut', (event) => {
        const persistent = game.hud.persistent;

        const shortcut = persistent.shortcuts.getShortcutFromElement(event.currentTarget);
        const item = persistent.actor.items.get(shortcut.itemId);
        const token = getPersistentToken();

        if (item && token) RangeHighlightAPI.rangeHighlight(token, { item });
      })
      .on('mouseleave', '.shortcut', () => {
        const token = getPersistentToken();
        if (token) RangeHighlightAPI.clearRangeHighlight(token);
      });

    // Macros
    $(html)
      .on('mouseenter', '.macro', (event) => {
        const item = PF2e.getItemFromMacro(
          game.macros.get($(event.currentTarget).data('macroId')),
          game.hud.persistent.actor
        );
        const token = getPersistentToken();
        if (item && token) RangeHighlightAPI.rangeHighlight(token, { item });
      })
      .on('mouseleave', '.macro', () => {
        const token = getPersistentToken();
        if (token) RangeHighlightAPI.clearRangeHighlight(token);
      });
  });

  // Sidebar
  Hooks.on('renderPF2eHudSidebar', (sidebar, html) => {
    // Items
    $(html)
      .on('mouseenter', '.item', (event) => {
        const item = game.hud.persistent.actor.items.get($(event.currentTarget).data('itemId'));
        const token = getPersistentToken();
        if (item && token) RangeHighlightAPI.rangeHighlight(token, { item });
      })
      .on('mouseleave', '.item', () => {
        const token = getPersistentToken();
        if (token) RangeHighlightAPI.clearRangeHighlight(token);
      });
  });
}
