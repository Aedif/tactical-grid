/**
 * PF2e HUD
 * https://foundryvtt.com/packages/pf2e-hud
 */

import { RangeHighlightAPI } from '../rangeHighlighter.js';

export function register() {
  Hooks.on('renderPersistentShortcutsPF2eHUD', (hud, html, options, context) => {
    $(html)
      .on('mouseenter', '.item.shortcut', (event) => {
        RangeHighlightAPI.rangeHighlightItemUuid(options.shortcuts[event.target.dataset.slot].item.uuid);
      })
      .on('mouseleave', '.item.shortcut', (event) => {
        RangeHighlightAPI.clearRangeHighlight(hud.actor.getActiveTokens());
      });
  });

  Hooks.on('renderItemsSidebarPF2eHUD', (hud, html, options, context) => {
    $(html)
      .on('mouseenter', '.item', (event) => {
        const uuid = hud.parent.actor.items.get(event.currentTarget.dataset.itemId)?.uuid;
        if (uuid) RangeHighlightAPI.rangeHighlightItemUuid(uuid);
      })
      .on('mouseleave', '.item', (event) => {
        RangeHighlightAPI.clearRangeHighlight(hud.parent.actor.getActiveTokens());
      });
  });

  Hooks.on('renderSpellsSidebarPF2eHUD', (hud, html, options, context) => {
    $(html)
      .on('mouseenter', '.item', (event) => {
        const uuid = hud.actor.items.get(event.currentTarget.dataset.itemId)?.uuid;
        if (uuid) RangeHighlightAPI.rangeHighlightItemUuid(uuid);
      })
      .on('mouseleave', '.item', (event) => {
        RangeHighlightAPI.clearRangeHighlight(hud.actor.getActiveTokens());
      });
  });
}
