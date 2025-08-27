/**
 * PF2e HUD
 * https://foundryvtt.com/packages/pf2e-hud
 */

import { RangeHighlightAPI } from '../rangeHighlighter.js';

export function register() {
  Hooks.once('renderPersistentShortcutsPF2eHUD', (hud, html, options, context) => {
    $(html)
      .on('mouseenter', '.item.shortcut', (event) => highlightItemById(event.currentTarget.dataset.itemId, hud.actor))
      .on('mouseleave', '.item.shortcut', (event) =>
        RangeHighlightAPI.clearRangeHighlight(hud.actor.getActiveTokens())
      );
  });

  Hooks.once('renderItemsSidebarPF2eHUD', (hud, html, options, context) => {
    $(html)
      .on('mouseenter', '.item', (event) => highlightItemById(event.currentTarget.dataset.itemId, hud.actor))
      .on('mouseleave', '.item', (event) => RangeHighlightAPI.clearRangeHighlight(hud.actor.getActiveTokens()));
  });

  Hooks.once('renderSpellsSidebarPF2eHUD', (hud, html, options, context) => {
    $(html)
      .on('mouseenter', '.item', (event) => highlightItemById(event.currentTarget.dataset.itemId, hud.actor))
      .on('mouseleave', '.item', (event) => RangeHighlightAPI.clearRangeHighlight(hud.actor.getActiveTokens()));
  });

  Hooks.once('renderActionsSidebarPF2eHUD', (hud, html, options, context) => {
    $(html)
      .on('mouseenter', '.item', (event) => highlightItemById(event.currentTarget.dataset.itemId, hud.actor))
      .on('mouseleave', '.item', (event) => RangeHighlightAPI.clearRangeHighlight(hud.actor.getActiveTokens()));
  });
}

function highlightItemById(itemId, actor) {
  const item = actor.items.get(itemId) ?? actor.system.actions.find((action) => action.item?.id === itemId)?.item;
  if (item) RangeHighlightAPI.rangeHighlight(actor.getActiveTokens()[0], { item });
}
