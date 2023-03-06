import { DistanceMeasurer } from '../scripts/measurer.js';
import { getGridColorString } from '../scripts/utils.js';
import { GRID_MASK } from '../tactical-grid.js';
import { readDeprecated } from './deprecatedSettings.js';

export const MODULE_CONFIG = {
  defaultViewDistance: 4,
  defaultViewShape: 'circle-soft',
  enableOnControl: true,
  enableOnHover: true,
  enableOnCombatOnly: false,
  enableOnRuler: true,
  mixColors: true,
  assignDispositionBasedColor: true,
  dispositionColors: {
    playerOwner: 0x00ff00,
    friendly: 0x00ff00,
    neutral: 0x0000ff,
    hostile: 0xff0000,
  },
  layerEnabled: {
    TokenLayer: true,
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
};

export default class SettingsConfig extends FormApplication {
  constructor() {
    super({}, {});
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'aedifs-tactical-grid-settings',
      classes: ['sheet'],
      template: 'modules/aedifs-tactical-grid/templates/settings.html',
      resizable: false,
      minimizable: false,
      title: 'Tactical Grid Settings',
      width: 600,
      height: 'auto',
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.content', initial: 'enable' }],
    });
  }

  async getData(options) {
    const data = super.getData(options);
    mergeObject(data, deepClone(MODULE_CONFIG));

    data.viewShapes = [
      { label: 'Circle', value: 'circle' },
      { label: 'Square', value: 'square' },
      { label: 'Circle (Soft)', value: 'circle-soft' },
      { label: 'Square (Soft)', value: 'square-soft' },
      { label: 'Hexagon (Column)', value: 'hexagonCol' },
      { label: 'Hexagon (Row)', value: 'hexagonRow' },
    ];

    for (const [k, v] of Object.entries(data.dispositionColors)) {
      data.dispositionColors[k] = new Color(v).toString();
    }

    return data;
  }

  /**
   * @param {Event} event
   * @param {Object} formData
   */
  async _updateObject(event, formData) {
    const settings = expandObject(formData);

    for (const [k, v] of Object.entries(settings.dispositionColors)) {
      settings.dispositionColors[k] = Number(Color.fromString(v));
    }

    updateSettings(settings);
  }
}

export function registerSettings() {
  // 08/03/23 - Remove some point in the future once enough
  // confidence is had that all previous version users had
  // ran the module and saved the settings in a new format
  readDeprecated(MODULE_CONFIG);

  game.settings.register('aedifs-tactical-grid', 'settings', {
    scope: 'world',
    config: false,
    type: Object,
    default: MODULE_CONFIG,
    onChange: async (val) => _onSettingChange(val),
  });
  const settings = game.settings.get('aedifs-tactical-grid', 'settings');
  mergeObject(MODULE_CONFIG, settings);

  if (MODULE_CONFIG.enableOnRuler) {
    registerRulerLibWrapperMethods();
  }

  game.settings.registerMenu('aedifs-tactical-grid', 'settings', {
    name: 'Configure Settings',
    hint: '',
    label: 'Settings',
    scope: 'world',
    icon: 'fas fa-cog',
    type: SettingsConfig,
    restricted: true,
  });

  /** =======================================================
   *  Insert token specific viewDistance and viewShape flags
   *  =======================================================
   */
  Hooks.on('renderTokenConfig', (tokenConfig) => {
    const viewDistance = tokenConfig.object.getFlag('aedifs-tactical-grid', 'viewDistance') ?? '';
    const viewShape = tokenConfig.object.getFlag('aedifs-tactical-grid', 'viewShape') ?? '';
    const shapeColor = tokenConfig.object.getFlag('aedifs-tactical-grid', 'color') ?? '';
    const gridColor = getGridColorString();

    let options = '<option value=""></option>';
    for (const [k, v] of Object.entries(shapeOptions)) {
      options += `<option value="${k}" ${viewShape === k ? 'selected' : ''}>${v}</option>`;
    }

    const control = $(`
  <fieldset>
    <legend>Tactical Grid</legend>
    <div class="form-group slim">
      <label>View Distance <span class="units">(Grid spaces)</span></label>
      <div class="form-fields">
        <input type="number" value="${viewDistance}" step="any" name="flags.aedifs-tactical-grid.viewDistance">
      </div>
      <p class="notes">${game.i18n.localize(
        'aedifs-tactical-grid.settings.defaultViewDistance.hint'
      )}</p>
    </div>
    <div class="form-group">
      <label>View Shape</label>
      <div class="form-fields">
          <select name="flags.aedifs-tactical-grid.viewShape">
            ${options}
          </select>
      </div>
      <p class="hint">${game.i18n.localize(
        'aedifs-tactical-grid.settings.defaultViewShape.hint'
      )}</p>
      </div>
      <div class="form-group">
        <label>Color</label>
        <div class="form-fields">
          <input class="color" type="text" name="flags.aedifs-tactical-grid.color" value="${shapeColor}">
          <input type="color" value="${
            shapeColor ?? gridColor
          }" data-edit="flags.aedifs-tactical-grid.color">
        </div>
      </div>
  </fieldset>
    `);

    $(tokenConfig.form).find('[name="sight.visionMode"]').closest('.form-group').after(control);
    tokenConfig.setPosition({ height: 'auto' });
  });

  if (typeof libWrapper === 'function') {
    ['Token', 'TokenLayer'].forEach((clsName) => {
      libWrapper.register(
        'aedifs-tactical-grid',
        `${clsName}.prototype._onClickLeft`,
        function (wrapped, ...args) {
          let result = wrapped(...args);
          try {
            DistanceMeasurer.clickLeft(args[0].data?.origin);
          } catch (e) {
            console.log(e);
          }
          return result;
        },
        'WRAPPER'
      );
    });

    /** =================================
     *  Insert scene grid line width flag
     *  =================================
     */
    Hooks.on('renderSceneConfig', (sceneConfig) => {
      const lineWidth = sceneConfig.object.getFlag('aedifs-tactical-grid', 'gridLineWidth') ?? 1;

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
  const diff = diffObject(MODULE_CONFIG, newSettings);
  mergeObject(MODULE_CONFIG, newSettings);
  // perform operations if specific settings have changed

  if ('defaultViewDistance' in diff) {
    MODULE_CONFIG.defaultViewDistance = MODULE_CONFIG.defaultViewDistance ?? 0;
  }

  if ('enableOnRuler' in diff) {
    unregisterRulerLibWrapperMethods();
    if (MODULE_CONFIG.enableOnRuler) registerRulerLibWrapperMethods();
  }

  if (
    ['enableOnControl', 'enableOnHover', 'enableOnCombatOnly', 'layerEnabled'].some(
      (s) => s in diff
    )
  ) {
    GRID_MASK.container?.drawMask();
  }
}

export async function updateSettings(newSettings) {
  const settings = mergeObject(deepClone(MODULE_CONFIG), newSettings, { insertKeys: false });
  game.settings.set('aedifs-tactical-grid', 'settings', settings);
}

// ======================
// Ruler Related Wrappers
// ======================

function registerRulerLibWrapperMethods() {
  if (typeof libWrapper === 'function') {
    libWrapper.register(
      'aedifs-tactical-grid',
      'Ruler.prototype._onDragStart',
      function (wrapped, ...args) {
        let result = wrapped(...args);
        GRID_MASK.container.drawMask();
        return result;
      },
      'WRAPPER'
    );

    libWrapper.register(
      'aedifs-tactical-grid',
      'Ruler.prototype._endMeasurement',
      function (wrapped, ...args) {
        let result = wrapped(...args);
        GRID_MASK.container.drawMask();
        return result;
      },
      'WRAPPER'
    );

    libWrapper.register(
      'aedifs-tactical-grid',
      'Ruler.prototype._onMouseMove',
      function (wrapped, ...args) {
        let result = wrapped(...args);
        GRID_MASK.container.setMaskPosition(this);
        return result;
      },
      'WRAPPER'
    );
  }
}

function unregisterRulerLibWrapperMethods() {
  if (typeof libWrapper === 'function') {
    libWrapper.unregister_all('aedifs-tactical-grid');
  }
}
