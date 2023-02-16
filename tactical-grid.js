// Config
const MODULE_CONFIG = {
  defaultViewLength: 4,
  defaultViewShape: 'circle-soft',
  controlled: true,
  hover: true,
  enableInCombatOnly: false,
};

let layerHooks = [];

// Canvas grid
let GRID = null;

// Sprites/Graphics used as a mask
let GRID_MASK;
let GRID_MASK_CONTAINER;

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

/** =================================
 *  Register Settings and keybindings
 *  =================================
 */

Hooks.on('init', () => {
  game.settings.register('aedifs-tactical-grid', 'enableForControlled', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.enableForControlled.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.enableForControlled.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: MODULE_CONFIG.controlled,
    onChange: async (val) => {
      MODULE_CONFIG.controlled = val;
      drawMask();
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
      drawMask();
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
      drawMask();
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
      drawMask();
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

  let options = getShapeOptions();
  game.settings.register('aedifs-tactical-grid', 'defaultViewShape', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewShape.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewShape.hint'),
    scope: 'world',
    config: true,
    type: String,
    default: MODULE_CONFIG.defaultViewShape,
    choices: options,
    onChange: async (val) => {
      MODULE_CONFIG.defaultViewShape = val;
    },
  });
  MODULE_CONFIG.defaultViewShape = game.settings.get('aedifs-tactical-grid', 'defaultViewShape');

  for (const [embedName, layerName] of embedsAndLayers) {
    const settingName = `${layerName}Enabled`;
    game.settings.register('aedifs-tactical-grid', settingName, {
      name: `Tactical Grid: ${layerName}`,
      hint: `Enable tactical grid for \"${layerName}\"`,
      scope: 'world',
      config: true,
      type: Boolean,
      default: embedName === 'Token',
      onChange: async (val) => {
        MODULE_CONFIG[settingName] = val;
        if (canvas.activeLayer.name === layerName) {
          if (MODULE_CONFIG[settingName]) {
            GRID.visible = false;
            drawMask();
          } else {
            destroyGridMask();
            GRID.visible = true;
          }
        }
      },
    });
    MODULE_CONFIG[settingName] = game.settings.get('aedifs-tactical-grid', settingName);
  }

  game.keybindings.register('aedifs-tactical-grid', 'toggleGrid', {
    name: game.i18n.localize('aedifs-tactical-grid.keybindings.toggleGrid.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.keybindings.toggleGrid.hint'),
    editable: [],
    onDown: () => {
      try {
        let val = game.settings.get('aedifs-tactical-grid', `${canvas.activeLayer.name}Enabled`);
        game.settings.set('aedifs-tactical-grid', `${canvas.activeLayer.name}Enabled`, !val);
      } catch (e) {
        destroyGridMask();
        GRID.visible = true;
      }
    },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });
});

/** =======================================================
 *  Insert token specific viewDistance and viewShape flags
 *  =======================================================
 */
Hooks.on('renderTokenConfig', (tokenConfig) => {
  const viewDistance = tokenConfig.object.getFlag('aedifs-tactical-grid', 'viewDistance') ?? '';
  const viewShape = tokenConfig.object.getFlag('aedifs-tactical-grid', 'viewShape') ?? '';

  let shapeOptions = getShapeOptions();
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
  </fieldset>
    `);
  tokenConfig.activateListeners(control);

  $(tokenConfig.form).find('[name="sight.visionMode"]').closest('.form-group').after(control);
  tokenConfig.setPosition({ height: 'auto' });
});

function getShapeOptions() {
  let options = {
    circle: 'Circle',
    'circle-soft': 'Circle (Soft)',
    square: 'Square',
    'square-soft': 'Square (Soft)',
    hexagonRow: 'Hexagon (Row)',
    hexagonCol: 'Hexagon (Column)',
  };
  return options;
}

/** =============================================
 *  Initialize mask containers and find the grid
 *  =============================================
 */
Hooks.on('canvasReady', (canvas) => {
  if (GRID_MASK) {
    destroyGridMask();
  }
  GRID_MASK = new PIXI.Sprite();
  GRID_MASK_CONTAINER = new CachedContainer(GRID_MASK);
  GRID_MASK_CONTAINER.renderable = true;

  GRID = canvas.grid.children.find((c) => c instanceof SquareGrid || c instanceof HexagonalGrid);

  if (MODULE_CONFIG[`${canvas.activeLayer.name}Enabled`]) GRID.visible = false;
});

// Handle layer activations
for (const [embedName, layerName] of embedsAndLayers) {
  Hooks.on(`activate${layerName}`, (layer) => {
    destroyGridMask();
    if (!MODULE_CONFIG[`${layer.name}Enabled`]) {
      if (GRID) GRID.visible = true;
    }
    registerLayerHooks(
      layer,
      [`control${embedName}`, `hover${embedName}`, `destroy${embedName}`],
      [`refresh${embedName}`]
    );
    drawMask();
  });
}

function unregisterLayerHooks() {
  for (const [name, id] of layerHooks) {
    Hooks.off(name, id);
  }
  layerHooks = [];
}

function registerLayerHooks(layer, drawMaskFunctionNames = [], setPositionFunctionNames = []) {
  unregisterLayerHooks();
  for (const fnName of drawMaskFunctionNames) {
    let id = Hooks.on(fnName, () => {
      if (!MODULE_CONFIG[`${layer.name}Enabled`]) return;
      drawMask(layer);
    });
    layerHooks.push([fnName, id]);
  }
  for (const fnName of setPositionFunctionNames) {
    let id = Hooks.on(fnName, (placeable) => {
      if (MODULE_CONFIG[`${placeable.layer.name}Enabled`] && GRID?.mask) {
        setGridMaskPosition(placeable);
      }
    });
    layerHooks.push([fnName, id]);
  }
}

/** ===============================
 *  Draw masks in response to hooks
 *  ===============================
 */

Hooks.on('deleteCombat', () => {
  if (!MODULE_CONFIG[`${canvas.activeLayer.name}Enabled`]) return;
  drawMask();
});

Hooks.on('combatStart', () => {
  if (!MODULE_CONFIG[`${canvas.activeLayer.name}Enabled`]) return;
  drawMask();
});

Hooks.on('highlightObjects', () => {
  if (!MODULE_CONFIG[`${canvas.activeLayer.name}Enabled`]) return;
  drawMask();
});

// Hooks.on('controlMeasuredTemplate', () => {
//   drawMask(canvas.templates);
// });

/**
 * Util to destroy the currently assigned mask
 */
function destroyGridMask() {
  if (GRID?.mask) {
    GRID_MASK_CONTAINER.removeChildren().forEach((c) => c.destroy());
    canvas.primary.removeChild(GRID_MASK_CONTAINER);
    GRID.mask = null;
  }
}

function updateGridMask(placeables) {
  // Destroy sprites that are not in the placeable list
  let originalChildren = GRID_MASK_CONTAINER.children;
  originalChildren.forEach((c) => {
    if (!placeables.find((p) => p.id === c.placeableId))
      GRID_MASK_CONTAINER.removeChild(c)?.destroy();
  });

  for (const p of placeables) {
    if (originalChildren.find((c) => c.placeableId === p.id)) {
      // Do nothing
    } else {
      let viewDistance = p.document.getFlag('aedifs-tactical-grid', 'viewDistance');
      if (viewDistance == null) viewDistance = MODULE_CONFIG.defaultViewLength;
      if (!viewDistance) continue;

      let viewShape =
        p.document.getFlag('aedifs-tactical-grid', 'viewShape') || MODULE_CONFIG.defaultViewShape;

      // const width = p.document.width ?? p.width;
      // const height = p.document.height ?? p.height;

      const width = p.width;
      const height = p.height;

      let sprite;
      switch (viewShape) {
        case 'square':
          let length = viewDistance * canvas.grid.w * 2 + width + 1;
          sprite = new PIXI.Graphics().beginFill(0xff0000).drawRect(0, 0, length, length).endFill();
          break;
        case 'square-soft':
          sprite = PIXI.Sprite.from('modules\\aedifs-tactical-grid\\images\\square_mask.webp');
          break;
        case 'hexagonRow':
          scale = canvas.grid.w * viewDistance * 2;
          let pointsRow = HexagonalGrid.pointyHexPoints
            .flat()
            .map((v) => v * canvas.grid.w * viewDistance * 2);
          sprite = new PIXI.Graphics().beginFill(0xff0000).drawPolygon(pointsRow).endFill();
          break;
        case 'hexagonCol':
          let pointsCol = HexagonalGrid.flatHexPoints
            .flat()
            .map((v) => v * canvas.grid.w * viewDistance * 2);
          sprite = new PIXI.Graphics().beginFill(0xff0000).drawPolygon(pointsCol).endFill();
          break;
        case 'circle-soft':
          sprite = PIXI.Sprite.from('modules\\aedifs-tactical-grid\\images\\circle_mask.webp');
          break;
        case 'circle':
        default:
          const radius = viewDistance * canvas.grid.w + width / 2;
          sprite = new PIXI.Graphics()
            .beginFill(0xff0000)
            .drawCircle(radius, radius, radius)
            .endFill();
      }

      if (sprite instanceof PIXI.Sprite) {
        sprite.width = (viewDistance + 1) * canvas.grid.w * 2 + width;
        sprite.height = (viewDistance + 1) * canvas.grid.h * 2 + height;
      }

      sprite = GRID_MASK_CONTAINER.addChild(sprite);
      sprite.placeableId = p.id;
    }
  }

  if (GRID_MASK_CONTAINER.children.length === 0) {
    destroyGridMask();
    return false;
  }
  return true;
}

/**
 * Utility to check if a placeable has a preview drawn which occurs when it is being dragged
 */
function hasPreview(placeable) {
  return Boolean(
    placeable.layer.preview?.children?.find((c) => c.id === placeable.id && placeable !== c)
  );
}

/**
 * Identifies the Tokens that masks need to be drawn for and
 * assigns them one
 */
async function drawMask(layer = canvas.activeLayer) {
  if (!GRID) return;
  if (!MODULE_CONFIG[`${layer.name}Enabled`]) return;

  GRID.visible = false;

  if (MODULE_CONFIG.enableInCombatOnly && !game.combat?.started) {
    destroyGridMask();
    return;
  }

  const applicableTokens = layer.placeables.filter(
    (p) =>
      (MODULE_CONFIG.controlled && p.controlled) ||
      (MODULE_CONFIG.hover && (p.hover || hasPreview(p)))
  );

  if (applicableTokens.length === 0) {
    destroyGridMask();
    return;
  }

  if (updateGridMask(applicableTokens)) {
    for (const p of applicableTokens) {
      setGridMaskPosition(p);
    }

    if (!GRID.mask) {
      canvas.primary.addChild(GRID_MASK_CONTAINER);
      GRID.mask = GRID_MASK;
    }
    GRID.visible = true;
  }
}

/**
 * Update mask positions
 */

function setGridMaskPosition(placeable) {
  if (hasPreview(placeable)) return;
  const shapeMask = GRID_MASK_CONTAINER?.children.find((c) => c.placeableId === placeable.id);

  if (shapeMask) {
    const { x, y } = placeable.center;
    // console.log(x, y, hasPreview(placeable));
    shapeMask.position.set(x - shapeMask.width / 2, y - shapeMask.height / 2);
  }
}