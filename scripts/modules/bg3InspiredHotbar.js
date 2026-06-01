/**
 * BG3 Inspired HUD - Core
 * https://foundryvtt.com/packages/bg3-hud-core
 */

import { RangeHighlightAPI } from '../rangeHighlighter.js';

export function register() {
    Hooks.on('renderBG3Hotbar', (bg3Hotbar, html, opts) => {
        registerHotBarListeners(bg3Hotbar.components.hotbar);
        registerWeaponListeners(bg3Hotbar.components.weaponSets);
    });
}

function registerHotBarListeners(hotbar) {
    if (!hotbar) return;
    for (const container of hotbar.gridContainers) {
        $(container.element)
            .on('mouseover', '.bg3-grid-cell.filled', (event) => {
                RangeHighlightAPI.rangeHighlightItemUuid(event.currentTarget.dataset.uuid);
            })
            .on('mouseleave', '.bg3-grid-cell.filled', (event) => {
                RangeHighlightAPI.clearRangeHighlight(hotbar.token);
            });
    }
}

function registerWeaponListeners(weapon) {
    if (!weapon) return;
    $(weapon.element)
        .on('mouseover', '.bg3-weapon-set .bg3-grid-cell.filled', (event) => {
            RangeHighlightAPI.rangeHighlightItemUuid(event.currentTarget.dataset.uuid);
        })
        .on('mouseleave', '.bg3-weapon-set .bg3-grid-cell.filled', (event) => {
            RangeHighlightAPI.clearRangeHighlight(weapon.token);
        });
}
