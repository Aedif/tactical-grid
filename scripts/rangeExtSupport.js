import { RangeHighlightAPI } from './rangeHighlighter.js';

// =================================
// ==== External Module Support ====
// =================================

export function registerExternalModuleHooks() {
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

  Hooks.on('renderHotbar', (hotbar, element, data, options) => {
    $(element)
      .find('.slot')
      .on('mouseover', (event) => {
        const macro = ui.hotbar.slots[Number(event.target.dataset.slot) - 1]?.macro;
        if (!macro) return;

        let [actor, token] = getActorAndToken();
        if (!token || !actor) return;

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
      .on('mouseleave', (event) => {
        const macro = ui.hotbar.slots[Number(event.target.dataset.slot)];
        if (!macro) return;

        let [actor, token] = getActorAndToken();
        if (token) RangeHighlightAPI.clearRangeHighlight(token);
      });
  });
}

function _getItemFromMacroDnd5e(macro, actor) {
  if (macro?.getFlag('dnd5e', 'itemMacro')) {
    const match = macro.command.match(/.*rollItem\("(?<itemName>.+)"/);
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
        if (!RangeHighlightAPI.itemEnabled) return;
        RangeHighlightAPI.rangeHighlightItemUuid($(event.target).closest('.item').data('item-uuid'));
      })
      .on('mouseleave', async (event) => {
        RangeHighlightAPI.clearRangeHighlightItemUuid($(event.target).closest('.item').data('item-uuid'));
      });
  });
}

// Token Action HUD
// https://foundryvtt.com/packages/token-action-hud-core
function _tokenActionHud() {
  if (!game.modules.get('token-action-hud-core')?.active) return;

  let token;
  Hooks.on('renderTokenActionHud', (hud, html, opts) => {
    if (!RangeHighlightAPI.itemEnabled) {
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
    if (!RangeHighlightAPI.itemEnabled) return;

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
    if (!RangeHighlightAPI.itemEnabled) return;

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
