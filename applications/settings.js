import { DistanceMeasurer, TEXT_STYLE } from '../scripts/measurer.js';
import { getGridColorString } from '../scripts/utils.js';
import { GRID_MASK } from '../tactical-grid.js';
import { readDeprecated } from './deprecatedSettings.js';

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
  measurement: {
    includeElevation: true,
    shortestDistance: true,
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
  },
};

export const MODULE_CLIENT_CONFIG = {
  rulerActivatedDistanceMeasure: false,
  rulerDistanceMeasureGirdSpaces: true,
  disableTacticalGrid: false,
};

const VIEW_SHAPE_OPTIONS = [
  { label: 'Circle', value: 'circle' },
  { label: 'Square', value: 'square' },
  { label: 'Circle (Soft)', value: 'circle-soft' },
  { label: 'Square (Soft)', value: 'square-soft' },
  { label: 'Hexagon (Column)', value: 'hexagonCol' },
  { label: 'Hexagon (Row)', value: 'hexagonRow' },
];

export default class TGSettingsConfig extends FormApplication {
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

    data.viewShapes = VIEW_SHAPE_OPTIONS;

    for (const [k, v] of Object.entries(data.dispositionColors)) {
      data.dispositionColors[k] = new Color(v).toString();
    }

    data.marker.color = new Color(data.marker.color).toString();
    data.marker.border = new Color(data.marker.border).toString();

    data.fonts = Object.keys(CONFIG.fontDefinitions);
    data.units = canvas.scene?.grid.units || 'ft';

    data.calculators = [
      { name: 'None', value: 'none' },
      { name: "Simbul's Cover Calculator", value: 'simbuls-cover-calculator' },
      { name: 'Levels Auto Cover', value: 'levelsautocover' },
      { name: 'Alternative Token Visibility', value: 'tokenvisibility' },
      { name: 'MidiQOL (mirror `Calculate Cover` setting)', value: 'midi-qol' },
      { name: 'PF2e Perception', value: 'pf2e-perception' },
    ];

    for (const calculator of data.calculators) {
      if (calculator.value !== 'none') {
        calculator.disabled = !game.modules.get(calculator.value)?.active;
      }
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
    settings.marker.color = Number(Color.fromString(settings.marker.color));
    settings.marker.border = Number(Color.fromString(settings.marker.border));

    updateSettings(settings);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html
      .find('[name="usePropertyBasedDistance"]')
      .on('change', (event) => {
        html.find('[name="propertyDistance"]').prop('disabled', !event.target.checked);
        html.find('[name="defaultViewDistance"]').prop('disabled', event.target.checked);
      })
      .trigger('change');
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

  game.settings.register('aedifs-tactical-grid', 'disableTacticalGrid', {
    name: 'Disable Tactical Grid',
    hint: 'Disables tactical grid for this client.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: async (val) => {
      MODULE_CLIENT_CONFIG.disableTacticalGrid = val;
      GRID_MASK.container?.drawMask();
    },
  });
  MODULE_CLIENT_CONFIG.disableTacticalGrid = game.settings.get(
    'aedifs-tactical-grid',
    'disableTacticalGrid'
  );

  game.settings.registerMenu('aedifs-tactical-grid', 'settings', {
    name: 'Configure Settings',
    hint: '',
    label: 'Settings',
    scope: 'world',
    icon: 'fas fa-cog',
    type: TGSettingsConfig,
    restricted: true,
  });

  game.settings.register('aedifs-tactical-grid', 'rulerActivatedDistanceMeasure', {
    name: 'Display Distances on Ruler Drag',
    hint: 'When enabled distances between the leading point of the ruler and all visible Tokens will be calculated and displayed on them.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: async (val) => {
      MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure = val;
      unregisterRulerLibWrapperMethods();
      if (val) registerRulerLibWrapperMethods();
    },
  });
  MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure = game.settings.get(
    'aedifs-tactical-grid',
    'rulerActivatedDistanceMeasure'
  );
  game.settings.register('aedifs-tactical-grid', 'rulerDistanceMeasureGirdSpaces', {
    name: 'Ruler: Grid Spaces',
    hint: 'Calculate Ruler triggered distance measurements in grid space increments.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: async (val) => {
      MODULE_CLIENT_CONFIG.rulerDistanceMeasureGirdSpaces = val;
    },
  });
  MODULE_CLIENT_CONFIG.rulerDistanceMeasureGirdSpaces = game.settings.get(
    'aedifs-tactical-grid',
    'rulerDistanceMeasureGirdSpaces'
  );

  if (MODULE_CONFIG.enableOnRuler || MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure) {
    registerRulerLibWrapperMethods();
  }

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
    for (const opt of VIEW_SHAPE_OPTIONS) {
      options += `<option value="${opt.value}" ${viewShape === opt.value ? 'selected' : ''}>${
        opt.label
      }</option>`;
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
            // v11 args[0].interactionData?.origin
            DistanceMeasurer.clickLeft(args[0].interactionData?.origin ?? args[0].data?.origin);
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
    if (MODULE_CONFIG.enableOnRuler || MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure)
      registerRulerLibWrapperMethods();
  }

  if (
    ['enableOnControl', 'enableOnHover', 'enableOnCombatOnly', 'layerEnabled'].some(
      (s) => s in diff
    )
  ) {
    GRID_MASK.container?.drawMask();
  }

  if ('measurement' in diff && TEXT_STYLE) {
    mergeObject(TEXT_STYLE, diff.measurement);
  }
}

export async function updateSettings(newSettings) {
  const settings = mergeObject(deepClone(MODULE_CONFIG), newSettings, { insertKeys: false });
  game.settings.set('aedifs-tactical-grid', 'settings', settings);
}

// ======================
// Ruler Related Wrappers
// ======================

let rulerWrappers = [];

export function registerRulerLibWrapperMethods() {
  if (typeof libWrapper === 'function') {
    unregisterRulerLibWrapperMethods();
    let id;
    if (MODULE_CONFIG.enableOnRuler) {
      id = libWrapper.register(
        'aedifs-tactical-grid',
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
        'aedifs-tactical-grid',
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

    if (MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure) {
      id = libWrapper.register(
        'aedifs-tactical-grid',
        'CONFIG.Canvas.rulerClass.prototype.measure',
        function (wrapped, ...args) {
          let result = wrapped(...args);
          const opts = args[1] ?? {};
          if (this.user.id === game.user.id)
            DistanceMeasurer.showMeasures({
              gridSpaces: MODULE_CLIENT_CONFIG.rulerDistanceMeasureGirdSpaces,
              snap: opts.snap ?? opts.gridSpaces,
            });
          return result;
        },
        'WRAPPER'
      );
      rulerWrappers.push(id);
    }

    if (MODULE_CONFIG.enableOnRuler || MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure) {
      id = libWrapper.register(
        'aedifs-tactical-grid',
        'CONFIG.Canvas.rulerClass.prototype._endMeasurement',
        function (wrapped, ...args) {
          let result = wrapped(...args);
          if (this.user.id === game.user.id) {
            if (MODULE_CONFIG.enableOnRuler) GRID_MASK.container.drawMask();
            DistanceMeasurer.hideMeasures();
          }
          return result;
        },
        'WRAPPER'
      );
      rulerWrappers.push(id);
    }
  }
}

function unregisterRulerLibWrapperMethods() {
  if (typeof libWrapper === 'function') {
    for (const id of rulerWrappers) {
      libWrapper.unregister('aedifs-tactical-grid', id);
    }
    rulerWrappers = [];
  }
}
