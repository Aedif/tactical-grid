import { MODULE_ID, getGridColorString } from '../scripts/utils.js';
import { GRID_MASK } from '../tactical-grid.js';
import ClientSettingsConfigApp from './clientSettingsApp.js';
import WorldSettingConfigApp from './worldSettingsApp.js';

export const MODULE_CONFIG = {
  defaultViewDistance: 4,
  usePropertyBasedDistance: false,
  propertyDistance: 'actor.system.attributes.movement.walk',
  defaultViewShape: 'circle-soft',
  enableOnControl: true,
  enableOnHover: true,
  enableOnCombatOnly: false,
  enableOnRuler: true,
  mixColors: false,
  assignDispositionBasedColor: true,
  dispositionColors: {
    playerOwner: 0x00ff00,
    friendly: 0x00ff00,
    neutral: 0x0000ff,
    hostile: 0xff0000,
  },
  layerEnabled: {
    TokenLayer: false,
    TemplateLayer: false,
    TilesLayer: false,
    DrawingsLayer: false,
    WallsLayer: false,
    LightingLayer: false,
    SoundsLayer: false,
    NotesLayer: false,
  },
  rulerViewDistance: 4,
  rulerViewShape: 'circle-soft',
  rulerColor: '',
  measurement: {
    volumetricTokens: false,
    precision: 0,
    fontSize: CONFIG.canvasTextStyle.fontSize,
    fontFamily: CONFIG.canvasTextStyle.fontFamily,
    fill: CONFIG.canvasTextStyle.fill,
    enableFontScaling: true,
    baseGridSize: 100,
    ignoreEffect: '',
  },
  marker: {
    color: 0xff0000,
    border: 0xff0000,
    alpha: 0.2,
  },
  cover: {
    calculator: 'none',
    noCover: '',
    halfCover: '',
    threeQuartersCover: '',
    totalCover: '',
    combatOnly: false,
  },
  range: {
    item: {
      enabled: false,
      combatOnly: false,
    },
    token: {
      enabled: false,
      combatOnly: false,
      dispositions: {},
    },
    colors: [
      {
        color: '#00ff00',
        alpha: 0.1,
        lineColor: '#00ff00',
        lineWidth: 2,
        lineAlpha: 0.4,
        shrink: 0.8,
      },
      {
        color: '#ffae00',
        alpha: 0.1,
        lineColor: '#ffae00',
        lineWidth: 2,
        lineAlpha: 0.4,
        shrink: 0.8,
      },
      {
        color: '#ff0000',
        alpha: 0.1,
        lineColor: '#ff0000',
        lineWidth: 2,
        lineAlpha: 0.4,
        shrink: 0.8,
      },
    ],
    defaultColor: {
      color: '#ffffff',
      alpha: 0.1,
      lineColor: '#ffffff',
      lineWidth: 2,
      lineAlpha: 0.4,
      shrink: 0.8,
    },
  },
  distanceCalcOffset: 0,
};

export const MODULE_CLIENT_CONFIG = {
  rulerActivatedDistanceMeasure: false,
  tokenActivatedDistanceMeasure: false,
  combatOnlyDistanceMeasure: false,
  disableTacticalGrid: false,
  rangeHighlighter: true,
};

export const VIEW_SHAPE_OPTIONS = [
  { label: 'Circle', value: 'circle' },
  { label: 'Square', value: 'square' },
  { label: 'Circle (Soft)', value: 'circle-soft' },
  { label: 'Square (Soft)', value: 'square-soft' },
  { label: 'Hexagon (Column)', value: 'hexagonCol' },
  { label: 'Hexagon (Row)', value: 'hexagonRow' },
];

export function registerSettings() {
  game.settings.register(MODULE_ID, 'settings', {
    scope: 'world',
    config: false,
    type: Object,
    default: MODULE_CONFIG,
    onChange: async (val) => _onSettingChange(val),
  });
  const settings = game.settings.get(MODULE_ID, 'settings');
  foundry.utils.mergeObject(MODULE_CONFIG, settings);

  game.settings.register(MODULE_ID, 'clientSettings', {
    scope: 'client',
    config: false,
    type: Object,
    default: MODULE_CLIENT_CONFIG,
    onChange: async (val) => _onClientSettingChange(val),
  });
  const clientSettings = game.settings.get(MODULE_ID, 'clientSettings');
  foundry.utils.mergeObject(MODULE_CLIENT_CONFIG, clientSettings);

  // Hidden setting used to add a static offset for distance measurements
  game.settings.register(MODULE_ID, 'distanceCalcOffset', {
    scope: 'world',
    config: false,
    type: Number,
    default: MODULE_CONFIG.distanceCalcOffset,
    onChange: (val) => {
      MODULE_CONFIG.distanceCalcOffset = val;
    },
  });
  MODULE_CONFIG.distanceCalcOffset = game.settings.get(MODULE_ID, 'distanceCalcOffset');

  game.settings.registerMenu(MODULE_ID, 'settings', {
    name: game.i18n.localize(`${MODULE_ID}.settings.menu.world`),
    hint: '',
    label: game.i18n.localize('Configure'),
    scope: 'world',
    icon: 'fas fa-cog',
    type: WorldSettingConfigApp,
    restricted: true,
  });

  game.settings.registerMenu(MODULE_ID, 'clientSettings', {
    name: game.i18n.localize(`${MODULE_ID}.settings.menu.client`),
    hint: '',
    label: game.i18n.localize('Configure'),
    scope: 'world',
    icon: 'fas fa-cog',
    type: ClientSettingsConfigApp,
    restricted: false,
  });

  registerRulerLibWrapperMethods();

  /** =======================================================
   *  Insert token specific viewDistance and viewShape flags
   *  =======================================================
   */
  Hooks.on('renderTokenConfig', (tokenConfig) => {
    const viewDistance = tokenConfig.document.getFlag(MODULE_ID, 'viewDistance') ?? '';
    const viewShape = tokenConfig.document.getFlag(MODULE_ID, 'viewShape') ?? '';
    const shapeColor = tokenConfig.document.getFlag(MODULE_ID, 'color') ?? '';
    const gridColor = getGridColorString();

    let options = '<option value=""></option>';
    for (const opt of VIEW_SHAPE_OPTIONS) {
      options += `<option value="${opt.value}" ${viewShape === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    }

    const control = $(`
  <fieldset>
    <legend>Tactical Grid</legend>
    <div class="form-group slim">
      <label>View Distance <span class="units">(Grid spaces)</span></label>
      <div class="form-fields">
        <input type="number" value="${viewDistance}" step="any" name="flags.${MODULE_ID}.viewDistance">
      </div>
      <p class="notes">${game.i18n.localize(`${MODULE_ID}.settings.defaultViewDistance.hint`)}</p>
    </div>
    <div class="form-group">
      <label>View Shape</label>
      <div class="form-fields">
          <select name="flags.${MODULE_ID}.viewShape">
            ${options}
          </select>
      </div>
      <p class="hint">${game.i18n.localize(`${MODULE_ID}.settings.defaultViewShape.hint`)}</p>
      </div>
      <div class="form-group">
        <label>Color</label>
        <div class="form-fields">
          <input class="color" type="text" name="flags.${MODULE_ID}.color" value="${shapeColor}">
          <input type="color" value="${shapeColor ?? gridColor}" data-edit="flags.${MODULE_ID}.color">
        </div>
      </div>
  </fieldset>
    `);

    $(tokenConfig.element).find('[name="sight.visionMode"]').closest('.form-group').after(control);
    tokenConfig.setPosition({ height: 'auto' });
  });

  ['foundry.canvas.layers.TokenLayer'].forEach((clsName) => {
    libWrapper.register(
      MODULE_ID,
      `${clsName}.prototype._onClickLeft`,
      function (wrapped, ...args) {
        let result = wrapped(...args);
        try {
          TacticalGrid.distanceCalculator.canvasLeftClick(args[0].interactionData.origin, {
            gridSpaces:
              canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS &&
              !game.keyboard.isModifierActive(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT),
          });
        } catch (e) {
          console.log(e);
        }
        return result;
      },
      'WRAPPER'
    );
  });

  if (foundry.utils.isNewerVersion(12, game.version)) {
    /** =================================
     *  Insert scene grid line width flag
     *  =================================
     */
    Hooks.on('renderSceneConfig', (sceneConfig) => {
      const lineWidth = sceneConfig.object.getFlag(MODULE_ID, 'gridLineWidth') ?? 1;

      const control = $(`
<fieldset>
  <legend>Tactical Grid</legend>
  <div class="form-group">
    <label>Grid Line Width <span class="units">(Pixels)</span></label> 
    <div class="form-fields">
      <input type="range" name="flags.aedifs-tactical-grid.gridLineWidth" value="${lineWidth}" min="1" max="30" step="1">
      <span class="range-value">${lineWidth}</span>
    </div>
    <p class="notes"><b>(REQUIRES CANVAS RELOAD)</b></p>
  </div>
</fieldset>
    `);

      $(sceneConfig.form).find('[name="grid.alpha"]').closest('.form-group').after(control);
      sceneConfig.setPosition({ height: 'auto' });
    });
  }
}

function _onSettingChange(newSettings) {
  const diff = foundry.utils.diffObject(MODULE_CONFIG, newSettings);
  foundry.utils.mergeObject(MODULE_CONFIG, newSettings);
  // perform operations if specific settings have changed

  if ('defaultViewDistance' in diff) {
    MODULE_CONFIG.defaultViewDistance = MODULE_CONFIG.defaultViewDistance ?? 0;
  }

  if ('enableOnRuler' in diff) {
    unregisterRulerLibWrapperMethods();
    registerRulerLibWrapperMethods();
  }

  if (['enableOnControl', 'enableOnHover', 'enableOnCombatOnly', 'layerEnabled'].some((s) => s in diff)) {
    GRID_MASK.container?.drawMask();
  }

  if ('measurement' in diff) {
    TacticalGrid.distanceCalculator?.refreshTextStyle();
  }
}

function _onClientSettingChange(newSettings) {
  const diff = foundry.utils.diffObject(MODULE_CLIENT_CONFIG, newSettings);
  foundry.utils.mergeObject(MODULE_CLIENT_CONFIG, newSettings);

  if ('rulerActivatedDistanceMeasure' in diff) {
    unregisterRulerLibWrapperMethods();
    registerRulerLibWrapperMethods();
  }
}

export async function updateSettings(newSettings) {
  const settings = foundry.utils.mergeObject(foundry.utils.deepClone(MODULE_CONFIG), newSettings, {
    insertKeys: false,
  });
  await game.settings.set(MODULE_ID, 'settings', settings);
}

export async function updateClientSettings(newSettings) {
  const settings = foundry.utils.mergeObject(foundry.utils.deepClone(MODULE_CLIENT_CONFIG), newSettings, {
    insertKeys: false,
  });

  await game.settings.set(MODULE_ID, 'clientSettings', settings);
}

// ======================
// Ruler Related Wrappers
// ======================

let rulerWrappers = [];

export function registerRulerLibWrapperMethods() {
  unregisterRulerLibWrapperMethods();
  let id;
  if (MODULE_CONFIG.enableOnRuler) {
    id = libWrapper.register(
      MODULE_ID,
      'CONFIG.Canvas.rulerClass.prototype._onDragStart',
      function (wrapped, ...args) {
        let result = wrapped(...args);
        if (this.user.id === game.user.id) GRID_MASK.container.drawMask();
        return result;
      },
      'WRAPPER'
    );
    rulerWrappers.push(id);
    id = libWrapper.register(
      MODULE_ID,
      'CONFIG.Canvas.rulerClass.prototype._onMouseMove',
      function (wrapped, ...args) {
        let result = wrapped(...args);
        if (this.user.id === game.user.id) GRID_MASK.container.setMaskPosition(this);
        return result;
      },
      'WRAPPER'
    );
    rulerWrappers.push(id);
  }

  id = libWrapper.register(
    MODULE_ID,
    'CONFIG.Canvas.rulerClass.prototype._onPathChange',
    function (wrapped, ...args) {
      let result = wrapped(...args);
      if (this.user.id === game.user.id) {
        GRID_MASK.container.setMaskPosition({ id: 'RULER', center: this.destination });

        if (MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure) {
          if (!MODULE_CLIENT_CONFIG.combatOnlyDistanceMeasure || game.combat?.active) {
            if (this.destination) TacticalGrid.distanceCalculator.showDistanceLabelsFromPoint(this.destination);
            else TacticalGrid.distanceCalculator.hideLabels();
          }
        }
      }
      return result;
    },
    'WRAPPER'
  );
  rulerWrappers.push(id);

  id = libWrapper.register(
    MODULE_ID,
    'CONFIG.Token.rulerClass.prototype.refresh',
    function (wrapped, ...args) {
      let result = wrapped(...args);

      GRID_MASK.container.setMaskPosition({ id: 'RULER', center: this.destination });

      if (MODULE_CLIENT_CONFIG.tokenActivatedDistanceMeasure && this.token._preview) {
        if (!MODULE_CLIENT_CONFIG.combatOnlyDistanceMeasure || game.combat?.active) {
          TacticalGrid.distanceCalculator.showDistanceLabelsFromToken(this.token._preview);
        }
      }

      return result;
    },
    'WRAPPER'
  );
  rulerWrappers.push(id);

  id = libWrapper.register(
    MODULE_ID,
    'CONFIG.Canvas.rulerClass.prototype._onDragCancel',
    function (wrapped, ...args) {
      let result = wrapped(...args);
      if (this.user.id === game.user.id) {
        if (MODULE_CONFIG.enableOnRuler) GRID_MASK.container.drawMask();
        TacticalGrid.distanceCalculator.hideLabels();
      }
      return result;
    },
    'WRAPPER'
  );
  rulerWrappers.push(id);
}

function unregisterRulerLibWrapperMethods() {
  for (const id of rulerWrappers) {
    libWrapper.unregister(MODULE_ID, id);
  }
  rulerWrappers = [];
}
