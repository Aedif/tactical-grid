import { MODULE_ID } from '../scripts/utils.js';

export function readDeprecated(settings) {
  game.settings.register(MODULE_ID, 'enableForControlled', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });
  settings.enableOnControl = game.settings.get(MODULE_ID, 'enableForControlled');

  game.settings.register(MODULE_ID, 'enableForHover', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });
  settings.enableOnHover = game.settings.get(MODULE_ID, 'enableForHover');

  game.settings.register(MODULE_ID, 'tacticalGridCombatOnly', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });
  settings.enableOnCombatOnly = game.settings.get(MODULE_ID, 'tacticalGridCombatOnly');

  game.settings.register(MODULE_ID, 'defaultViewDistance', {
    scope: 'world',
    config: false,
    type: Number,
    default: 4,
  });
  settings.defaultViewDistance = game.settings.get(MODULE_ID, 'defaultViewDistance');

  game.settings.register(MODULE_ID, 'defaultViewShape', {
    scope: 'world',
    config: false,
    type: String,
    default: 'circle-soft',
  });
  settings.defaultViewShape = game.settings.get(MODULE_ID, 'defaultViewShape');

  game.settings.register(MODULE_ID, 'mixColors', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });
  settings.mixColors = game.settings.get(MODULE_ID, 'mixColors');

  game.settings.register(MODULE_ID, 'useDispositionColors', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });
  settings.assignDispositionBasedColor = game.settings.get(MODULE_ID, 'useDispositionColors');

  game.settings.register(MODULE_ID, 'dispositionColors', {
    scope: 'world',
    config: false,
    type: Object,
    default: {
      playerOwner: 0x00ff00,
      friendly: 0x00ff00,
      neutral: 0x0000ff,
      hostile: 0xff0000,
    },
  });
  settings.dispositionColors = game.settings.get(MODULE_ID, 'dispositionColors');

  game.settings.register(MODULE_ID, 'rulerEnabled', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });
  settings.enableOnRuler = game.settings.get(MODULE_ID, 'rulerEnabled');

  const embedsAndLayers = [
    ['Token', 'TokenLayer'],
    ['MeasuredTemplate', 'TemplateLayer'],
    ['Tile', 'TilesLayer'],
    ['Drawing', 'DrawingsLayer'],
    ['Wall', 'WallsLayer'],
    ['AmbientLight', 'LightingLayer'],
    ['AmbientSound', 'SoundsLayer'],
    ['Note', 'NotesLayer'],
  ];
  for (const [embedName, layerName] of embedsAndLayers) {
    const settingName = `${layerName}Enabled`;
    game.settings.register(MODULE_ID, settingName, {
      scope: 'world',
      config: false,
      type: Boolean,
      default: embedName === 'Token',
    });
    settings.layerEnabled[layerName] = game.settings.get(MODULE_ID, settingName);
  }
}
