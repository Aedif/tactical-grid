import { getGridColorString } from './utils.js';
import { GRID_MASK } from '../tactical-grid.js';

// Config
export const MODULE_CONFIG = {
  defaultViewLength: 4,
  defaultViewShape: 'circle-soft',
  controlled: true,
  hover: true,
  enableInCombatOnly: false,
  ruler: true,
  mixColors: true,
  useDispositionColors: true,
  dispositionColors: {
    playerOwner: 0x00ff00,
    friendly: 0x00ff00,
    neutral: 0x0000ff,
    hostile: 0xff0000,
  },
};

export const EMBEDS_AND_LAYERS = [
  ['Token', 'TokenLayer'],
  ['MeasuredTemplate', 'TemplateLayer'],
  ['Tile', 'TilesLayer'],
  ['Drawing', 'DrawingsLayer'],
  ['Wall', 'WallsLayer'],
  ['AmbientLight', 'LightingLayer'],
  ['AmbientSound', 'SoundsLayer'],
  ['Note', 'NotesLayer'],
];

export function init() {
  game.settings.register('aedifs-tactical-grid', 'enableForControlled', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.enableForControlled.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.enableForControlled.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: MODULE_CONFIG.controlled,
    onChange: async (val) => {
      MODULE_CONFIG.controlled = val;
      GRID_MASK.container.drawMask();
    },
  });
  MODULE_CONFIG.controlled = game.settings.get('aedifs-tactical-grid', 'enableForControlled');

  game.settings.register('aedifs-tactical-grid', 'enableForHover', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.enableForHover.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.enableForHover.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: MODULE_CONFIG.hover,
    onChange: async (val) => {
      MODULE_CONFIG.hover = val;
      GRID_MASK.container.drawMask();
    },
  });
  MODULE_CONFIG.hover = game.settings.get('aedifs-tactical-grid', 'enableForHover');

  game.settings.register('aedifs-tactical-grid', 'tacticalGridCombatOnly', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.tacticalGridCombatOnly.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.tacticalGridCombatOnly.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: MODULE_CONFIG.enableInCombatOnly,
    onChange: async (val) => {
      MODULE_CONFIG.enableInCombatOnly = val;
      GRID_MASK.container.drawMask();
    },
  });
  MODULE_CONFIG.enableInCombatOnly = game.settings.get(
    'aedifs-tactical-grid',
    'tacticalGridCombatOnly'
  );

  game.settings.register('aedifs-tactical-grid', 'tacticalGridCombatOnly', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.tacticalGridCombatOnly.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.tacticalGridCombatOnly.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: MODULE_CONFIG.enableInCombatOnly,
    onChange: async (val) => {
      MODULE_CONFIG.enableInCombatOnly = val;
      GRID_MASK.container.drawMask();
    },
  });
  MODULE_CONFIG.enableInCombatOnly = game.settings.get(
    'aedifs-tactical-grid',
    'tacticalGridCombatOnly'
  );

  game.settings.register('aedifs-tactical-grid', 'defaultViewDistance', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewDistance.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewDistance.hint'),
    scope: 'world',
    config: true,
    type: Number,
    default: MODULE_CONFIG.defaultViewLength,
    onChange: async (val) => {
      MODULE_CONFIG.defaultViewLength = val ? val : 0;
    },
  });
  MODULE_CONFIG.defaultViewLength = game.settings.get(
    'aedifs-tactical-grid',
    'defaultViewDistance'
  );

  let shapeOptions = {
    circle: 'Circle',
    'circle-soft': 'Circle (Soft)',
    square: 'Square',
    'square-soft': 'Square (Soft)',
    hexagonRow: 'Hexagon (Row)',
    hexagonCol: 'Hexagon (Column)',
  };

  game.settings.register('aedifs-tactical-grid', 'defaultViewShape', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewShape.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewShape.hint'),
    scope: 'world',
    config: true,
    type: String,
    default: MODULE_CONFIG.defaultViewShape,
    choices: shapeOptions,
    onChange: async (val) => {
      MODULE_CONFIG.defaultViewShape = val;
    },
  });
  MODULE_CONFIG.defaultViewShape = game.settings.get('aedifs-tactical-grid', 'defaultViewShape');

  game.settings.register('aedifs-tactical-grid', 'mixColors', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.mixColors.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.mixColors.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: MODULE_CONFIG.mixColors,
    onChange: async (val) => {
      MODULE_CONFIG.mixColors = val;
    },
  });
  MODULE_CONFIG.mixColors = game.settings.get('aedifs-tactical-grid', 'mixColors');

  game.settings.register('aedifs-tactical-grid', 'useDispositionColors', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.useDispositionColors.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.useDispositionColors.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: MODULE_CONFIG.useDispositionColors,
    onChange: async (val) => {
      MODULE_CONFIG.useDispositionColors = val;
    },
  });
  MODULE_CONFIG.useDispositionColors = game.settings.get(
    'aedifs-tactical-grid',
    'useDispositionColors'
  );

  game.settings.register('aedifs-tactical-grid', 'dispositionColors', {
    scope: 'world',
    config: false,
    type: Object,
    default: MODULE_CONFIG.dispositionColors,
    onChange: async (val) => {
      mergeObject(MODULE_CONFIG.dispositionColors, val);
    },
  });
  MODULE_CONFIG.dispositionColors = game.settings.get('aedifs-tactical-grid', 'dispositionColors');

  game.settings.register('aedifs-tactical-grid', 'rulerEnabled', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.ruler.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.ruler.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: MODULE_CONFIG.ruler,
    onChange: async (val) => {
      unregisterLibwrapperMethods();
      MODULE_CONFIG.ruler = val;
      if (val) registerLibwrapperMethods();
    },
  });
  MODULE_CONFIG.ruler = game.settings.get('aedifs-tactical-grid', 'rulerEnabled');

  if (MODULE_CONFIG.ruler) {
    registerLibwrapperMethods();
  }

  for (const [embedName, layerName] of EMBEDS_AND_LAYERS) {
    const settingName = `${layerName}Enabled`;
    game.settings.register('aedifs-tactical-grid', settingName, {
      name: embedName + ' Layer',
      hint: `Enable tactical grid for \"${embedName} Layer\"`,
      scope: 'world',
      config: true,
      type: Boolean,
      default: embedName === 'Token',
      onChange: async (val) => {
        MODULE_CONFIG[settingName] = val;
        if (cleanLayerName(canvas.activeLayer) === layerName) GRID_MASK.container.drawMask();
      },
    });
    MODULE_CONFIG[settingName] = game.settings.get('aedifs-tactical-grid', settingName);
  }

  const toggleSceneGrid = async function () {
    if (canvas.scene) {
      let settingName = `${cleanLayerName(canvas.activeLayer)}Enabled`;
      let val = canvas.scene.getFlag('aedifs-tactical-grid', settingName);
      if (val != null && !val) {
        await canvas.scene.unsetFlag('aedifs-tactical-grid', settingName);
        ui.notifications.info(`Tactical Grid: Scene Setting REMOVED { ${settingName} }`);
      } else {
        await canvas.scene.setFlag('aedifs-tactical-grid', settingName, !val);
        ui.notifications.info(
          `Tactical Grid: Scene Setting ADDED { ${settingName} = ${val ? 'False' : 'True'} }`
        );
      }
    }
  };

  let lastPress;
  game.keybindings.register('aedifs-tactical-grid', 'toggleGrid', {
    name: game.i18n.localize('aedifs-tactical-grid.keybindings.toggleGrid.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.keybindings.toggleGrid.hint'),
    editable: [],
    onUp: async () => {
      if (lastPress) {
        let settingName = `${cleanLayerName(canvas.activeLayer)}Enabled`;
        const diff = new Date().getTime() - lastPress;
        lastPress = null;
        if (diff < 1200) {
          try {
            let val = game.settings.get('aedifs-tactical-grid', settingName);
            game.settings.set('aedifs-tactical-grid', settingName, !val);
          } catch (e) {}
        } else {
          toggleSceneGrid();
        }
        GRID_MASK.container?.drawMask();
      }
    },
    onDown: () => {
      lastPress = new Date().getTime();
    },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register('aedifs-tactical-grid', 'sceneToggleGrid', {
    name: game.i18n.localize('aedifs-tactical-grid.keybindings.sceneToggleGrid.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.keybindings.sceneToggleGrid.hint'),
    editable: [],
    onDown: () => {
      toggleSceneGrid();
    },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
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
}

/** =================================
 *  Insert scene grid line width flag
 *  =================================
 */
Hooks.on('renderSceneConfig', (sceneConfig) => {
  if (typeof libWrapper === 'function') {
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
  }
});

function registerLibwrapperMethods() {
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

function unregisterLibwrapperMethods() {
  if (typeof libWrapper === 'function') {
    libWrapper.unregister_all('aedifs-tactical-grid');
  }
}

// Because PF2e is a special snowflake
export function cleanLayerName(layer) {
  return layer.name.replace('PF2e', '');
}
