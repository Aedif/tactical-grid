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
  // For most cases this returns the item we want to highlight
  // NOTE: If the item is disabled, for any reason, the itemId will be undefined
  let item = actor.items.get(itemId);
  // In some cases though, there is a more relevant action that we want to highlight, e.g., if the item is an effect
  // that grants a temporary strike, since the effect itself does not have a range
  item = actor.system.actions.find((action) => action.item?.id === itemId)?.item ?? item;
  if (item) RangeHighlightAPI.rangeHighlight(actor.getActiveTokens()[0], { item });
}
