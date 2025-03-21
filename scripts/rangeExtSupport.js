import { RangeHighlightAPI, itemRangeHighlightEnabled } from './rangeHighlighter.js';

// ===========================
// ==== ACTOR SHEET HOOKS ====
// ===========================

export function registerActorSheetHooks() {
  if (game.system.id === 'crucible') {
    Hooks.on('renderActorSheet', _crucibleActorSheetHook);
  } else {
    Hooks.on('renderActorSheet', _genericActorSheetHook);
    if (game.system.id === 'pf2e') Hooks.on('renderActorSheet', _pf2eActorSheetHook);
  }
}

function _genericActorSheetHook(sheet, form, options) {
  if (!itemRangeHighlightEnabled()) return;

  $(form)
    .find('.item-name')
    .on('mouseenter', (event) => _hoverItem(sheet, $(event.target).closest(`[data-item-id]`).attr('data-item-id')))
    .on('mouseleave', () => _hoverLeaveItem(sheet));
}

function _pf2eActorSheetHook(sheet, form, options) {
  if (!itemRangeHighlightEnabled()) return;

  $(form)
    .find('.actions-list.strikes-list')
    .find('.strike')
    .on('mouseenter', (event) =>
      _hoverPF2eStrikeAction(sheet, $(event.target).closest(`.strike`).attr('data-action-index'))
    )
    .on('mouseleave', () => _hoverLeaveItem(sheet));
}

function _crucibleActorSheetHook(sheet, form, options) {
  if (!itemRangeHighlightEnabled()) return;

  form = $(form);

  form
    .find('.line-item')
    .on('mouseenter', (event) => _hoverItem(sheet, $(event.target).closest(`[data-item-id]`).attr('data-item-id')))
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
 * Respond to mouse hovering over PF2e strike action with a given index
 */
function _hoverPF2eStrikeAction(sheet, actionIndex) {
  if (!itemRangeHighlightEnabled()) return;
  const token = sheet.token?.object;
  if (!token) return;

  const actor = sheet.object;

  const item = actor.system.actions[actionIndex]?.item;
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
    case 'dc20rpg':
      return DC20Range;
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

  static _getUnitAdjustedRange(gridSpaces) {
    const units = canvas.scene.grid.units;
    if (units === 'ft') return 5 * gridSpaces;
    else if (units === 'm') return 1.5 * gridSpaces;
    return 0;
  }
}

class DC20Range extends SystemRange {
  static getTokenRange(token) {
    const actor = token.actor;
    const allRanges = new Set([1]);

    actor.items
      .filter((item) => item.system.statuses?.equipped && item.system.weaponType === 'melee')
      .forEach((item) => {
        if (item.system.properties.reach.active) allRanges.add(2);
      });

    return Array.from(allRanges);
  }

  static getItemRange(item, token) {
    const ranges = [];

    let normalRange = 0;
    let maxRange = 0;

    if (item.system.weaponType === 'melee') {
      if (item.system.properties.reach.active) normalRange = 2;
      else normalRange = 1;
    } else {
      normalRange = item.system.range.normal;
      maxRange = item.system.range.max;
    }

    if (normalRange) ranges.push(normalRange);
    if (maxRange) ranges.push(maxRange);

    return ranges;
  }
}

class Dnd5eRange extends SystemRange {
  static _hasProperty(item, property) {
    const properties = item.system.properties;
    if (properties) {
      if (properties instanceof Set) return properties.has(property); // Dnd5e >=3.0.0
      else return properties[property]; // DnD5e <3.0.0
    }
    return false;
  }

  static _isMelee(item) {
    return (
      item.system.actionType === 'mwak' &&
      ['martialM', 'simpleM', 'natural', 'improv'].includes(item.system.weaponType ?? item.system.type?.value)
    );
  }

  static getTokenRange(token) {
    const actor = token.actor;
    const allRanges = new Set([this._getUnitAdjustedRange(1)]);

    actor.items
      .filter((item) => item.system.equipped && this._isMelee(item))
      .forEach((item) => {
        if (this._hasProperty(item, 'rch')) allRanges.add(this._getUnitAdjustedRange(2));
      });

    return Array.from(allRanges);
  }

  static getItemRange(item, token) {
    const ranges = new Set();

    if (item.system.range) {
      let reach = item.system.range.reach || 0;
      let range = item.system.range.value || 0;
      let longRange = item.system.range.long || 0;

      // If item range is measured in 'ft' but canvas is set to 'm', convert the range value
      if (item.system.range.units === 'ft' && canvas.scene.grid.units === 'm') {
        range *= 0.3;
        longRange *= 0.3;
        reach *= 0.3;
      }

      let thrMelee = 0;
      const actor = token.actor;

      if (foundry.utils.getProperty(actor, 'flags.midi-qol.sharpShooter') && range < longRange) range = longRange;
      if (item.system.actionType === 'rsak' && foundry.utils.getProperty(actor, 'flags.dnd5e.spellSniper')) {
        range = 2 * range;
        longRange = 2 * longRange;
      }

      if (item.system.range.units === 'touch') {
        range = this._getUnitAdjustedRange(this._hasProperty(item, 'rch') ? 2 : 1);
        longRange = 0;
      }

      if (['mwak', 'msak', 'mpak'].includes(item.system.actionType)) {
        if (this._hasProperty(item, 'thr')) {
          thrMelee = this._getUnitAdjustedRange(this._hasProperty(item, 'rch') ? 2 : 1);
        } else {
          longRange = 0;
        }
      }

      if (reach) ranges.add(reach);
      if (thrMelee) ranges.add(thrMelee);
      if (range) ranges.add(range);
      if (longRange) ranges.add(longRange);
    }

    return Array.from(ranges);
  }
}

class Pf2eRange extends SystemRange {
  static getTokenRange(token) {
    const reach = { range: token.actor?.getReach?.({ action: 'attack' }) || 0 };
    if (reach.range === 10) reach.measureDistance = this._reachMeasureDistance;
    return [reach];
  }

  static getItemRange(item) {
    const ranges = [];

    if (item.range) {
      let increment = item.range.increment;
      let maxRange = item.range.max;

      if (increment && maxRange) {
        let range = 0;
        let maxIncrementCount = 6;
        while (range < maxRange && maxIncrementCount > 0) {
          range += increment;
          if (range > maxRange) range = maxRange;
          maxIncrementCount--;
          ranges.push(range);
        }
      } else if (increment) {
        ranges.push(increment);
      } else if (maxRange) {
        ranges.push(maxRange);
      }
    } else if (item.system.area?.type === 'emanation') {
      if (Number.isFinite(item.system.area.value)) ranges.push(item.system.area.value);
    }

    let range = item.system.range?.value;
    if (range) {
      range = parseInt(range);
      if (Number.isFinite(range)) range = range;
    }

    if (!ranges.length && item.isMelee) {
      if (item.system.traits.value?.includes('reach'))
        ranges.push({ range: 10, measureDistance: this._reachMeasureDistance });
      else ranges.push(5);
    }

    return ranges;
  }

  // PF2e has an exception for distance measurements for the 10ft reach.
  // This is a modified PF2e `measureDistances` function to account for this
  static _reachMeasureDistance(path) {
    const ray = new Ray(path[0], path[1]);
    const segments = [{ ray }];

    let nDiagonal = 0;
    const d = canvas.dimensions;

    const result = segments.map((s) => {
      const r = s.ray,
        nx = Math.abs(Math.ceil(r.dx / d.size)),
        ny = Math.abs(Math.ceil(r.dy / d.size)),
        nd = Math.min(nx, ny),
        ns = Math.abs(ny - nx);
      nDiagonal += nd;
      const nd10 = Math.floor(nDiagonal / 2) - Math.floor((nDiagonal - nd) / 2);
      return (nd10 + (nd - nd10) + ns) * d.distance;
    });

    return { distance: result };
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
  // DnD5e/Pf2e/DC20 Macro Bar
  _macroBar();
  // PF2e HUD
  _pf2eHud();
}

// DnD5e/PF2e Macro Bar
function _macroBar() {
  if (!['dnd5e', 'pf2e', 'dc20rpg'].includes(game.system.id)) return;

  $('#ui-middle')
    .on('mouseover', '.macro', (event) => {
      if (!itemRangeHighlightEnabled()) return;

      let [actor, token] = getActorAndToken();
      if (!token || !actor) return;

      const macro = game.macros.get($(event.target).closest('.macro').data('macro-id'));

      let item;
      if (game.system.id === 'dnd5e') item = _getItemFromMacroDnd5e(macro, actor);
      else if (game.system.id === 'pf2e') item = _getItemFromMacroPf2e(macro, actor);
      else if (game.system.id === 'dc20rpg') item = _getItemFromMacroDC20(macro, actor);

      if (item) {
        RangeHighlightAPI.rangeHighlight(token, { item });
      } else {
        RangeHighlightAPI.clearRangeHighlight(token);
      }
    })
    .on('mouseleave', '.macro', (event) => {
      const macro = game.macros.get($(event.target).closest('.macro').data('macro-id'));
      if (!macro) return;

      let [actor, token] = getActorAndToken();
      if (token) RangeHighlightAPI.clearRangeHighlight(token);
    });
}

function _getItemFromMacroDnd5e(macro, actor) {
  if (macro?.getFlag('dnd5e', 'itemMacro')) {
    // RegEx courtesy of Illandril
    // https://github.com/illandril/FoundryVTT-hotbar-uses
    const match = macro.command.match(
      /^\s*dnd5e\s*\.\s*documents\s*\.\s*macro\s*\.\s*rollItem\s*\(\s*(?<q>["'`])(?<itemName>.+?)\k<q>\s*\)\s*;?\s*$/
    );
    if (!match) return;
    const itemName = match.groups?.itemName;

    const item = actor.items.filter((item) => item.name === itemName)?.[0];
    return item;
  }

  return null;
}

function _getItemFromMacroPf2e(macro, actor) {
  if (!macro) return null;
  let match;
  if (macro.getFlag('pf2e', 'actionMacro')) {
    match = macro.command.match(/^game\.pf2e\.rollActionMacro\(.*itemId: *"(?<itemId>[A-Za-z0-9]+)"/);
  } else if (macro.getFlag('pf2e', 'itemMacro')) {
    match = macro.command.match(/^game\.pf2e\.rollItemMacro\(" *(?<itemId>[A-Za-z0-9]+)"/);
    if (!match) {
      match = macro.command.match(/^game\.pf2e\.rollItemMacro\("Actor\.([A-Za-z0-9]+)\.Item\.(?<itemId>[A-Za-z0-9]+)"/);
    }
  }

  if (match) {
    const itemId = match.groups?.itemId;
    const item = actor.items.get(itemId);
    return item;
  }

  return null;
}

function _getItemFromMacroDC20(macro, actor) {
  if (macro?.getFlag('dc20rpg', 'itemMacro')) {
    const match = macro.command.match(/^game\.dc20rpg\.rollItemMacro\(\"(?<itemName>[A-Za-z0-9]+)\"\)/);
    if (!match) return;
    const itemName = match.groups?.itemName;

    const item = actor.items.filter((item) => item.name === itemName)?.[0];
    return item;
  }

  return null;
}

function getActorAndToken() {
  let actor;
  const speaker = ChatMessage.getSpeaker();

  if (speaker.token) actor = game.actors.tokens[speaker.token];
  actor ??= game.actors.get(speaker.actor);
  if (!actor) return [];

  const token = canvas.tokens?.get(speaker.token ?? '');
  if (!token) return [];

  return [actor, token];
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
        RangeHighlightAPI.rangeHighlightItemUuid($(event.target).closest('.item').data('item-uuid'));
      })
      .on('mouseleave', async (event) => {
        RangeHighlightAPI.clearRangeHighlightItemUuid($(event.target).closest('.item').data('item-uuid'));
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

// PF2e HUD
// https://foundryvtt.com/packages/pf2e-hud
function _pf2eHud() {
  if (!game.modules.get('pf2e-hud')?.active) return;

  const getPersistentToken = function () {
    return game.hud.persistent.actor.getActiveTokens().filter((t) => t.controlled)[0];
  };

  Hooks.on('renderPF2eHudPersistent', (hud, html, opts) => {
    if (!itemRangeHighlightEnabled()) return;

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
        const item = _getItemFromMacroPf2e(
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
    if (!itemRangeHighlightEnabled()) return;

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
