/**
 * BG3 Inspired HUD
 * https://foundryvtt.com/packages/bg3-inspired-hotbar
 */

import { RangeHighlightAPI } from '../rangeHighlighter.js';

export function register() {
  Hooks.on('renderBG3Hotbar', (hud, html, opts) => {
    registerHotBarListeners(hud.components.container);
    registerWeaponListeners(hud.components.weapon);
  });
}

function registerHotBarListeners(hotbar) {
  for (const container of hotbar.components.hotbar) {
    $(container.element)
      .on('mouseover', '.hotbar-cell.has-item', (event) => {
        RangeHighlightAPI.rangeHighlightItemUuid(container.data.items[event.currentTarget.dataset.slot]?.uuid);
      })
      .on('mouseleave', '.hotbar-cell.has-item', (event) => {
        RangeHighlightAPI.clearRangeHighlight(hotbar.token);
      });
  }
}

function registerWeaponListeners(weapon) {
  $(weapon.element)
    .on('mouseover', '.bg3-weapon-set .hotbar-cell.has-item', (event) => {
      RangeHighlightAPI.rangeHighlightItemUuid(
        weapon.data.weapon[weapon.activeSet]?.items[event.currentTarget.dataset.slot]?.uuid
      );
    })
    .on('mouseleave', '.bg3-weapon-set .hotbar-cell.has-item', (event) => {
      RangeHighlightAPI.clearRangeHighlight(weapon.token);
    });
}
