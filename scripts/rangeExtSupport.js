import { RangeHighlightAPI, itemRangeHighlightEnabled } from './rangeHighlighter.js';

export function getRangeCalculator() {
  switch (game.system.id) {
    case 'dnd5e':
      return Dnd5eRange;
    case 'pf2e':
      return Pf2eRange;
    default:
      return SystemRange;
  }
}

// ===========================
// ==== RANGE CALCULATORS ====
// ===========================

class SystemRange {
  static getTokenRange(token) {
    return [5];
  }

  static getItemRange(item, token) {
    return [];
  }
}

class Dnd5eRange extends SystemRange {
  static getTokenRange(token) {
    const actor = token.actor;
    const allRanges = new Set([5]);

    actor.items
      .filter(
        (item) =>
          item.system.equipped &&
          item.system.actionType === 'mwak' &&
          ['martialM', 'simpleM', 'natural', 'improv'].includes(item.system.weaponType)
      )
      .forEach((item) => {
        const ranges = this.getItemRange(item, token).sort();
        ranges.forEach((d) => allRanges.add(d));
      });

    return Array.from(allRanges);
  }

  static getItemRange(item, token) {
    const ranges = [];

    if (item.system.range) {
      let range = item.system.range.value || 0;
      let longRange = item.system.range.long || 0;
      const actor = token.actor;

      if (foundry.utils.getProperty(actor, 'flags.midi-qol.sharpShooter') && range < longRange)
        range = longRange;
      if (
        item.system.actionType === 'rsak' &&
        foundry.utils.getProperty(actor, 'flags.dnd5e.spellSniper')
      ) {
        range = 2 * range;
        longRange = 2 * longRange;
      }

      if (item.system.range.units === 'touch') {
        range = 5;
        longRange = 0;
        if (item.system.properties?.rch) range *= 2;
      }

      if (['mwak', 'msak', 'mpak'].includes(item.system.actionType) && !item.system.properties?.thr)
        longRange = 0;

      if (range) ranges.push(range);
      if (longRange) ranges.push(longRange);
    }

    return ranges;
  }
}

class Pf2eRange extends SystemRange {
  static getItemRange(item) {
    const ranges = [];

    let range = item.range?.increment;
    let longRange = item.range?.max;

    let rangeVal = item.system.range?.value;
    if (rangeVal) {
      rangeVal = parseInt(rangeVal);
      if (Number.isFinite(rangeVal)) range = rangeVal;
    }

    if (range) ranges.push(range);
    if (longRange) ranges.push(longRange);

    return ranges;
  }
}

// =================================
// ==== External Module Support ====
// =================================

export function registerExternalModuleHooks() {
  // Action Pack
  _actionPack();
  // Argon - Combat HUD
  _argonHud();
  // Token Action HUD
  _tokenActionHud();
}

// Action Pack
// https://foundryvtt.com/packages/action-pack
function _actionPack() {
  if (!game.modules.get('action-pack')?.active) return;

  Hooks.on('action-pack.updateTray', (html) => {
    html
      .find('.item-name')
      .on('mouseover', async (event) => {
        if (!itemRangeHighlightEnabled()) return;
        RangeHighlightAPI.rangeHighlightItemUuid(
          $(event.target).closest('.item').data('item-uuid')
        );
      })
      .on('mouseleave', async (event) => {
        RangeHighlightAPI.clearRangeHighlightItemUuid(
          $(event.target).closest('.item').data('item-uuid')
        );
      });
  });
}

// Argon - Combat HUD
// https://foundryvtt.com/packages/enhancedcombathud
function _argonHud() {
  if (!game.modules.get('enhancedcombathud')?.active) return;
  Hooks.on('renderCoreHUD', (hud, html, opts) => {
    if (!itemRangeHighlightEnabled()) return;
    hud.itemButtons.forEach((button) => {
      $(button.element)
        .on('mouseover', (event) => {
          console.log(button);
          RangeHighlightAPI.rangeHighlight(button.token, { item: button.item });
        })
        .on('mouseleave', (event) => {
          RangeHighlightAPI.clearRangeHighlight(button.token);
        });
    });
  });
}

// Token Action HUD
// https://foundryvtt.com/packages/token-action-hud-core
function _tokenActionHud() {
  if (!game.modules.get('token-action-hud-core')?.active) return;

  let token;
  Hooks.on('renderTokenActionHud', (hud, html, opts) => {
    if (!itemRangeHighlightEnabled()) {
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
