import { EMBEDS_AND_LAYERS } from '../scripts/utils.js';

export function readDeprecated(settings) {
  game.settings.register('aedifs-tactical-grid', 'enableForControlled', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });
  settings.enableOnControl = game.settings.get('aedifs-tactical-grid', 'enableForControlled');

  game.settings.register('aedifs-tactical-grid', 'enableForHover', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });
  settings.enableOnHover = game.settings.get('aedifs-tactical-grid', 'enableForHover');

  game.settings.register('aedifs-tactical-grid', 'tacticalGridCombatOnly', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });
  settings.enableOnCombatOnly = game.settings.get('aedifs-tactical-grid', 'tacticalGridCombatOnly');

  game.settings.register('aedifs-tactical-grid', 'defaultViewDistance', {
    scope: 'world',
    config: false,
    type: Number,
    default: 4,
  });
  settings.defaultViewDistance = game.settings.get('aedifs-tactical-grid', 'defaultViewDistance');

  game.settings.register('aedifs-tactical-grid', 'defaultViewShape', {
    scope: 'world',
    config: false,
    type: String,
    default: 'circle-soft',
  });
  settings.defaultViewShape = game.settings.get('aedifs-tactical-grid', 'defaultViewShape');

  game.settings.register('aedifs-tactical-grid', 'mixColors', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });
  settings.mixColors = game.settings.get('aedifs-tactical-grid', 'mixColors');

  game.settings.register('aedifs-tactical-grid', 'useDispositionColors', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });
  settings.assignDispositionBasedColor = game.settings.get(
    'aedifs-tactical-grid',
    'useDispositionColors'
  );

  game.settings.register('aedifs-tactical-grid', 'dispositionColors', {
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
  settings.dispositionColors = game.settings.get('aedifs-tactical-grid', 'dispositionColors');

  game.settings.register('aedifs-tactical-grid', 'rulerEnabled', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });
  settings.enableOnRuler = game.settings.get('aedifs-tactical-grid', 'rulerEnabled');

  for (const [embedName, layerName] of EMBEDS_AND_LAYERS) {
    const settingName = `${layerName}Enabled`;
    game.settings.register('aedifs-tactical-grid', settingName, {
      scope: 'world',
      config: false,
      type: Boolean,
      default: embedName === 'Token',
    });
    settings.layerEnabled[layerName] = game.settings.get('aedifs-tactical-grid', settingName);
  }
}
