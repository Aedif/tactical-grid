/**
 * PF2e HUD
 * https://foundryvtt.com/packages/pf2e-hud
 */

import { RangeHighlightAPI } from '../rangeHighlighter.js';

export function register() {
  Hooks.on('renderPersistentShortcutsPF2eHUD', (hud, html, options, context) => {
    const shortcuts = html.querySelectorAll('.shortcut');
    for (const shortcut of shortcuts) {
      $(shortcut)
        .on('mouseenter', null, (event) => highlightItemById(event.currentTarget.dataset.itemId, hud.actor))
        .on('mouseleave', null, (event) => RangeHighlightAPI.clearRangeHighlight(hud.actor.getActiveTokens()));
    }
  });

  Hooks.on('renderItemsSidebarPF2eHUD', (hud, html, options, context) => {
    $(html)
      .on('mouseenter', '.item', (event) => highlightItemById(event.currentTarget.dataset.itemId, hud.actor))
      .on('mouseleave', '.item', (event) => RangeHighlightAPI.clearRangeHighlight(hud.actor.getActiveTokens()));
  });

  Hooks.on('renderSpellsSidebarPF2eHUD', (hud, html, options, context) => {
    $(html)
      .on('mouseenter', '.item', (event) => highlightItemById(event.currentTarget.dataset.itemId, hud.actor))
      .on('mouseleave', '.item', (event) => RangeHighlightAPI.clearRangeHighlight(hud.actor.getActiveTokens()));
  });

  Hooks.on('renderActionsSidebarPF2eHUD', (hud, html, options, context) => {
    $(html)
      .on('mouseenter', '.item', (event) => highlightItemById(event.currentTarget.dataset.itemId, hud.actor))
      .on('mouseleave', '.item', (event) => RangeHighlightAPI.clearRangeHighlight(hud.actor.getActiveTokens()));
  });
}

function highlightItemById(itemId, actor) {
  const item = actor.items.get(itemId) ?? actor.system.actions.find((action) => action.item?.id === itemId)?.item;
  if (item) RangeHighlightAPI.rangeHighlight(actor.getActiveTokens()[0], { item });
}
