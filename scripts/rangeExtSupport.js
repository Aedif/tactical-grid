import { RangeHighlightAPI, itemRangeHighlightEnabled } from './rangeHighlighter.js';

// ===========================
// ==== ACTOR SHEET HOOKS ====
// ===========================

export function registerActorSheetHooks() {
  if (game.system.id === 'crucible') {
    Hooks.on('renderActorSheet', _crucibleActorSheetHook);
  } else {
    Hooks.on('renderActorSheet', _genericActorSheetHook);
  }
}

function _genericActorSheetHook(sheet, form, options) {
  if (!itemRangeHighlightEnabled()) return;

  $(form)
    .find('.item-name')
    .on('mouseenter', (event) =>
      _hoverItem(sheet, $(event.target).closest(`[data-item-id]`).attr('data-item-id'))
    )
    .on('mouseleave', () => _hoverLeaveItem(sheet));
}

function _crucibleActorSheetHook(sheet, form, options) {
  if (!itemRangeHighlightEnabled()) return;

  form = $(form);

  form
    .find('.line-item')
    .on('mouseenter', (event) =>
      _hoverItem(sheet, $(event.target).closest(`[data-item-id]`).attr('data-item-id'))
    )
    .on('mouseleave', () => _hoverLeaveItem(sheet));

  form
    .find('.action[data-action-id="strike"]')
    .on('mouseenter', () => {
      const actor = sheet.object;
      const weapon = actor.actions.strike.usage.weapon;
      if (weapon) _hoverItem(sheet, weapon.id);
    })
    .on('mouseleave', () => _hoverLeaveItem(sheet));
}

/**
 * Respond to mouse hovering over an item with itemId
 * @param {ActorSheet} sheet
 * @param {String} itemId
 * @returns {null}
 */
function _hoverItem(sheet, itemId) {
  if (!itemRangeHighlightEnabled()) return;
  const token = sheet.token?.object;
  if (!token) return;

  const actor = sheet.object;
  const item = actor.items.get(itemId);

  if (!item) {
    RangeHighlightAPI.clearRangeHighlight(token);
    return;
  }

  RangeHighlightAPI.rangeHighlight(token, { item });
}

/**
 * Respond to mouse ending hover over an item
 * @param {ActorSheet} sheet
 */
function _hoverLeaveItem(sheet) {
  const token = sheet.token?.object;
  if (token) TacticalGrid.clearRangeHighlight(token);
}

// ===========================
// ==== RANGE CALCULATORS ====
// ===========================

export function getRangeCalculator() {
  switch (game.system.id) {
    case 'dnd5e':
      return Dnd5eRange;
    case 'pf2e':
      return Pf2eRange;
    case 'crucible':
      return CrucibleRange;
    default:
      return SystemRange;
  }
}

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
        if (item.system.properties?.rch) allRanges.add(10);
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
  static getTokenRange(token) {
    return [token.actor?.getReach?.({ action: 'attack' }) || 0];
  }

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

    if (!ranges.length && item.isMelee) {
      if (item.system.traits.value?.includes('reach')) ranges.push(10);
      else ranges.push(5);
    }

    return ranges;
  }
}

class CrucibleRange extends SystemRange {
  static getTokenRange(token) {
    const allRanges = new Set([1]);

    token.actor.items.forEach((item) => {
      if (item.system.equipped && item.system.range && !item.system.config.category.ranged) {
        allRanges.add(item.system.range);
      }
    });

    return Array.from(allRanges);
  }

  static getItemRange(item, token) {
    const ranges = [];

    let range = item.system.range || 0;
    if (range) ranges.push(range);

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
  // DnD5e Macro Bar
  _dnd5eMacroBar();
}

// DnD5e Macro Bar
function _dnd5eMacroBar() {
  if (game.system.id !== 'dnd5e') return;
  const getActorAndToken = function () {
    let actor;
    const speaker = ChatMessage.getSpeaker();

    if (speaker.token) actor = game.actors.tokens[speaker.token];
    actor ??= game.actors.get(speaker.actor);
    if (!actor) return [];

    const token = canvas.tokens?.get(speaker.token ?? '');
    if (!token) return [];

    return [actor, token];
  };

  $('#ui-middle')
    .on('mouseover', '.macro', (event) => {
      if (!itemRangeHighlightEnabled()) return;
      const macro = game.macros.get($(event.target).closest('.macro').data('macro-id'));
      if (macro?.getFlag('dnd5e', 'itemMacro')) {
        // RegEx courtesy of Illandril
        // https://github.com/illandril/FoundryVTT-hotbar-uses
        const match = macro.command.match(
          /^\s*dnd5e\s*\.\s*documents\s*\.\s*macro\s*\.\s*rollItem\s*\(\s*(?<q>["'`])(?<itemName>.+?)\k<q>\s*\)\s*;?\s*$/
        );
        if (!match) return;
        const itemName = match.groups?.itemName;

        let [actor, token] = getActorAndToken();

        if (!token) return;

        const item = actor.items.filter((item) => item.name === itemName)?.[0];
        if (item) {
          RangeHighlightAPI.rangeHighlight(token, { item });
        } else {
          RangeHighlightAPI.clearRangeHighlight(token);
        }
      }
    })
    .on('mouseleave', '.macro', (event) => {
      const macro = game.macros.get($(event.target).closest('.macro').data('macro-id'));
      if (macro?.getFlag('dnd5e', 'itemMacro')) {
        let [actor, token] = getActorAndToken();
        if (token) RangeHighlightAPI.clearRangeHighlight(token);
      }
    });
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
