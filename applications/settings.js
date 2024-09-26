import { DistanceMeasurer, TEXT_STYLE } from '../scripts/measurer.js';
import { MODULE_ID, getGridColorString } from '../scripts/utils.js';
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
    diagonalMultiplier: 1.5,
    doubleDiagonalMultiplier: 1.75,
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
    roundToken: false,
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
  rulerDistanceMeasureGirdSpaces: true,
  disableTacticalGrid: false,
  rangeHighlighter: true,
  broadcastMeasures: false,
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
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-settings`,
      classes: ['sheet'],
      template: `modules/${MODULE_ID}/templates/settings.html`,
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
    foundry.utils.mergeObject(data, foundry.utils.deepClone(MODULE_CONFIG));

    data.viewShapes = VIEW_SHAPE_OPTIONS;

    for (const [k, v] of Object.entries(data.dispositionColors)) {
      data.dispositionColors[k] = new Color(v).toString();
    }

    data.marker.color = new Color(data.marker.color).toString();
    data.marker.border = new Color(data.marker.border).toString();

    data.fonts = [];
    FontConfig._collectDefinitions().forEach((f) => (data.fonts = data.fonts.concat(Object.keys(f))));

    data.units = canvas.scene?.grid.units || 'ft';

    data.calculators = [
      { name: 'None', value: 'none' },
      { name: "Simbul's Cover Calculator", value: 'simbuls-cover-calculator' },
      { name: 'Levels Auto Cover', value: 'levelsautocover' },
      { name: 'MidiQOL (mirror `Calculate Cover` setting)', value: 'midi-qol' },
      { name: 'PF2e Perception', value: 'pf2e-perception' },
      { name: 'Alternative Token Cover', value: 'tokencover' },
    ];

    for (const calculator of data.calculators) {
      if (calculator.value !== 'none') {
        calculator.disabled = !game.modules.get(calculator.value)?.active;
      }
    }

    data.dispositions = [];
    for (const [k, v] of Object.entries(CONST.TOKEN_DISPOSITIONS)) {
      data.dispositions.push({
        value: v,
        label: game.i18n.localize(`TOKEN.DISPOSITION.${k}`),
        enabled: MODULE_CONFIG.range.token.dispositions[v],
      });
    }

    return data;
  }

  /**
   * @param {Event} event
   * @param {Object} formData
   */
  async _updateObject(event, formData) {
    const settings = foundry.utils.expandObject(formData);

    if (settings.range.colors) settings.range.colors = Object.values(settings.range.colors);
    else settings.range.colors = [];

    for (const [k, v] of Object.entries(settings.dispositionColors)) {
      settings.dispositionColors[k] = Number(Color.fromString(v));
    }
    settings.marker.color = Number(Color.fromString(settings.marker.color));
    settings.marker.border = Number(Color.fromString(settings.marker.border));

    await updateSettings(settings);
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
    html.find('.addRangeColor').on('click', this._onAddRangeColor.bind(this));
    html.find('.deleteRangeColor').on('click', this._onDeleteRangeColor.bind(this));
  }

  async _onAddRangeColor(event) {
    const formData = this._getSubmitData({});
    await this._updateObject(event, formData);

    MODULE_CONFIG.range.colors.push(foundry.utils.deepClone(MODULE_CONFIG.range.defaultColor));
    this.render(true);
  }

  async _onDeleteRangeColor(event) {
    const formData = foundry.utils.expandObject(this._getSubmitData({}));
    const index = $(event.target).closest('.deleteRangeColor').data('index');
    delete formData.range.colors[index];

    await this._updateObject(event, formData);
    this.render(true);
  }
}

export function registerSettings() {
  // 08/03/23 - Remove some point in the future once enough
  // confidence is had that all previous version users had
  // ran the module and saved the settings in a new format
  readDeprecated(MODULE_CONFIG);

  game.settings.register(MODULE_ID, 'settings', {
    scope: 'world',
    config: false,
    type: Object,
    default: MODULE_CONFIG,
    onChange: async (val) => _onSettingChange(val),
  });
  const settings = game.settings.get(MODULE_ID, 'settings');
  foundry.utils.mergeObject(MODULE_CONFIG, settings);

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

  game.settings.register(MODULE_ID, 'disableTacticalGrid', {
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
  MODULE_CLIENT_CONFIG.disableTacticalGrid = game.settings.get(MODULE_ID, 'disableTacticalGrid');

  game.settings.register(MODULE_ID, 'broadcastMeasures', {
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: async (val) => {
      MODULE_CLIENT_CONFIG.broadcastMeasures = val;
    },
  });
  MODULE_CLIENT_CONFIG.broadcastMeasures = game.settings.get(MODULE_ID, 'broadcastMeasures');

  game.settings.registerMenu(MODULE_ID, 'settings', {
    name: 'Configure Settings',
    hint: '',
    label: 'Settings',
    scope: 'world',
    icon: 'fas fa-cog',
    type: TGSettingsConfig,
    restricted: true,
  });

  game.settings.register(MODULE_ID, 'rulerActivatedDistanceMeasure', {
    name: game.i18n.localize(`${MODULE_ID}.settings.displayDistancesOnRulerDrag.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.displayDistancesOnRulerDrag.hint`),
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: async (val) => {
      MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure = val;
      unregisterRulerLibWrapperMethods();
      registerRulerLibWrapperMethods();
    },
  });
  MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure = game.settings.get(MODULE_ID, 'rulerActivatedDistanceMeasure');

  game.settings.register(MODULE_ID, 'tokenActivatedDistanceMeasure', {
    name: game.i18n.localize(`${MODULE_ID}.settings.displayDistancesOnTokenDrag.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.displayDistancesOnTokenDrag.hint`),
    scope: 'client',
    config: true,
    type: Boolean,
    default: MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure,
    onChange: (val) => {
      MODULE_CLIENT_CONFIG.tokenActivatedDistanceMeasure = val;
    },
  });
  MODULE_CLIENT_CONFIG.tokenActivatedDistanceMeasure = game.settings.get(MODULE_ID, 'tokenActivatedDistanceMeasure');

  game.settings.register(MODULE_ID, 'rulerDistanceMeasureGirdSpaces', {
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
  MODULE_CLIENT_CONFIG.rulerDistanceMeasureGirdSpaces = game.settings.get(MODULE_ID, 'rulerDistanceMeasureGirdSpaces');

  game.settings.register(MODULE_ID, 'rangeHighlighter', {
    name: 'Enable Range Highlighter',
    hint: 'Turn on/off Token/Item range highlighting on hover.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: MODULE_CLIENT_CONFIG.rangeHighlighter,
    onChange: async (val) => {
      MODULE_CLIENT_CONFIG.rangeHighlighter = val;
    },
  });
  MODULE_CLIENT_CONFIG.rangeHighlighter = game.settings.get(MODULE_ID, 'rangeHighlighter');

  registerRulerLibWrapperMethods();

  /** =======================================================
   *  Insert token specific viewDistance and viewShape flags
   *  =======================================================
   */
  Hooks.on('renderTokenConfig', (tokenConfig) => {
    const viewDistance = tokenConfig.object.getFlag(MODULE_ID, 'viewDistance') ?? '';
    const viewShape = tokenConfig.object.getFlag(MODULE_ID, 'viewShape') ?? '';
    const shapeColor = tokenConfig.object.getFlag(MODULE_ID, 'color') ?? '';
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

    $(tokenConfig.form).find('[name="sight.visionMode"]').closest('.form-group').after(control);
    tokenConfig.setPosition({ height: 'auto' });
  });

  if (typeof libWrapper === 'function') {
    ['Token', 'TokenLayer'].forEach((clsName) => {
      libWrapper.register(
        MODULE_ID,
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

  if ('measurement' in diff && TEXT_STYLE) {
    foundry.utils.mergeObject(TEXT_STYLE, diff.measurement);
  }
}

export async function updateSettings(newSettings) {
  const settings = foundry.utils.mergeObject(foundry.utils.deepClone(MODULE_CONFIG), newSettings, {
    insertKeys: false,
  });
  await game.settings.set(MODULE_ID, 'settings', settings);
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
      'CONFIG.Canvas.rulerClass.prototype.measure',
      function (wrapped, ...args) {
        let result = wrapped(...args);
        if (this.user.id === game.user.id) {
          const tokenPreviews = canvas.tokens.preview.children;
          if (
            (!tokenPreviews.length && MODULE_CLIENT_CONFIG.rulerActivatedDistanceMeasure) ||
            (tokenPreviews.length && MODULE_CLIENT_CONFIG.tokenActivatedDistanceMeasure) ||
            DistanceMeasurer.keyPressed
          ) {
            DistanceMeasurer.showMeasures({
              gridSpaces: MODULE_CLIENT_CONFIG.rulerDistanceMeasureGirdSpaces,
            });
          }
        }
        return result;
      },
      'WRAPPER'
    );
    rulerWrappers.push(id);

    id = libWrapper.register(
      MODULE_ID,
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

function unregisterRulerLibWrapperMethods() {
  if (typeof libWrapper === 'function') {
    for (const id of rulerWrappers) {
      libWrapper.unregister(MODULE_ID, id);
    }
    rulerWrappers = [];
  }
}
